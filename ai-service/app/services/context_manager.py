from typing import List, Optional, Any, Dict
from pydantic import BaseModel

from app.services.token_counter import TokenCounter

class ContextTooLargeException(Exception):
    pass

class ContextBuildResult(BaseModel):
    system_prompt: Optional[str] = None
    user_request: Optional[str] = None
    selected_messages: List[Dict[str, Any]] = []
    selected_evidence: List[Any] = []
    
    system_token_estimate: int = 0
    request_token_estimate: int = 0
    history_token_estimate: int = 0
    evidence_token_estimate: int = 0
    total_input_token_estimate: int = 0
    reserved_output_tokens: int = 0
    final_available_budget: int = 0
    
    excluded_messages_count: int = 0
    excluded_evidence_count: int = 0
    
    exact_estimation: bool = False

class ContextManagerService:
    def __init__(self, token_counter: TokenCounter, model_context_limit: int = 3500, reserved_output_tokens: int = 1000):
        self.token_counter = token_counter
        self.model_context_limit = model_context_limit
        self.reserved_output_tokens = reserved_output_tokens

    def _truncate_to_tokens(self, text: str, target_tokens: int) -> Optional[str]:
        if not text or target_tokens <= 3:
            return None
            
        marker_tokens = 4
        if target_tokens <= marker_tokens:
            return None
            
        keep_tokens = target_tokens - marker_tokens
        keep_chars = keep_tokens * 4
        
        if keep_chars > len(text):
            return text
            
        return text[:keep_chars] + "...\n[truncated]"

    def build_context(self,
                      system_prompt: Optional[str],
                      user_request: Optional[str],
                      messages: Optional[List[Dict[str, Any]]] = None,
                      workflow_evidence: Optional[List[Any]] = None) -> ContextBuildResult:
        
        from app.core.config import settings
        
        # Stage 1: Safety Limits
        safe_evidence = []
        if workflow_evidence:
            total_ev_chars = 0
            doc_count = 0
            web_count = 0
            for item in workflow_evidence:
                content = getattr(item, 'content', None)
                if content is None and isinstance(item, dict):
                    content = item.get('content', '')
                elif content is None:
                    content = str(item)
                
                source_type = getattr(item, 'source_type', 'unknown') if not isinstance(item, dict) else item.get('source_type', 'unknown')
                
                if source_type == "document":
                    if doc_count >= settings.safety_max_rag_chunks:
                        continue
                    doc_count += 1
                    max_chars = settings.safety_max_chars_per_rag_chunk
                elif source_type == "web":
                    if web_count >= settings.safety_max_web_results:
                        continue
                    web_count += 1
                    max_chars = settings.safety_max_chars_per_web_result
                else:
                    max_chars = settings.safety_max_chars_per_rag_chunk
                    
                if len(content) > max_chars:
                    truncated = content[:max_chars] + "...\n[truncated]"
                    if hasattr(item, 'model_copy'):
                        item = item.model_copy(update={'content': truncated})
                    elif isinstance(item, dict):
                        item = dict(item)
                        item['content'] = truncated
                    else:
                        import copy
                        item = copy.copy(item)
                        if hasattr(item, 'content'):
                            item.content = truncated
                    content = truncated
                
                if total_ev_chars + len(content) > settings.safety_max_total_evidence_chars:
                    break
                    
                safe_evidence.append(item)
                total_ev_chars += len(content)
                
        workflow_evidence = safe_evidence
        
        budget = self.model_context_limit - self.reserved_output_tokens
        
        if budget <= 0:
            raise ContextTooLargeException("Model context limit is smaller than reserved output tokens.")
            
        sys_tokens = self.token_counter.count(system_prompt) if system_prompt else 0
        req_tokens = self.token_counter.count(user_request) if user_request else 0
        
        if sys_tokens + req_tokens > budget:
            raise ContextTooLargeException("System instructions and current request exceed context budget.")
            
        remaining_budget = budget - sys_tokens - req_tokens
        
        selected_messages = []
        history_tokens = 0
        excluded_messages = 0
        
        if messages:
            i = len(messages) - 1
            while i >= 0:
                turn_msgs = []
                msg1 = messages[i]
                
                # Check if this forms a complete turn: Assistant + User
                if msg1.get('role') == 'assistant' and i > 0 and messages[i-1].get('role') == 'user':
                    turn_msgs = [messages[i-1], msg1]
                    i -= 2
                else:
                    turn_msgs = [msg1]
                    i -= 1
                    
                turn_tokens = 0
                for m in turn_msgs:
                    turn_tokens += self.token_counter.count(m.get('content', ''))
                
                if history_tokens + turn_tokens <= remaining_budget:
                    history_tokens += turn_tokens
                    for m in reversed(turn_msgs):
                        selected_messages.append(m)
                else:
                    if len(turn_msgs) == 1 and remaining_budget - history_tokens > 4:
                        tokens_to_keep = remaining_budget - history_tokens
                        trunc_content = self._truncate_to_tokens(turn_msgs[0].get('content', ''), tokens_to_keep)
                        if trunc_content:
                            trunc_tokens = self.token_counter.count(trunc_content)
                            if history_tokens + trunc_tokens <= remaining_budget:
                                history_tokens += trunc_tokens
                                new_m = dict(turn_msgs[0])
                                new_m['content'] = trunc_content
                                selected_messages.append(new_m)
                    excluded_messages += (i + 1)
                    break
                    
        selected_messages.reverse()
        remaining_budget -= history_tokens
        
        selected_evidence = []
        evidence_tokens = 0
        excluded_evidence = 0
        
        if workflow_evidence:
            for item in workflow_evidence:
                content = getattr(item, 'content', None)
                if content is None and isinstance(item, dict):
                    content = item.get('content', '')
                elif content is None:
                    content = str(item)
                    
                item_token = self.token_counter.count(content)
                if evidence_tokens + item_token <= remaining_budget:
                    evidence_tokens += item_token
                    selected_evidence.append(item)
                else:
                    if remaining_budget - evidence_tokens > 10:
                        tokens_to_keep = remaining_budget - evidence_tokens
                        truncated = self._truncate_to_tokens(content, tokens_to_keep)
                        if truncated:
                            trunc_tokens = self.token_counter.count(truncated)
                            if evidence_tokens + trunc_tokens <= remaining_budget:
                                evidence_tokens += trunc_tokens
                                if hasattr(item, 'model_copy'):
                                    new_item = item.model_copy(update={'content': truncated})
                                elif isinstance(item, dict):
                                    new_item = dict(item)
                                    new_item['content'] = truncated
                                else:
                                    import copy
                                    new_item = copy.copy(item)
                                    if hasattr(new_item, 'content'):
                                        new_item.content = truncated
                                selected_evidence.append(new_item)
                                break
                    excluded_evidence += len(workflow_evidence) - len(selected_evidence)
                    break
                    
        remaining_budget -= evidence_tokens
        
        total_input = sys_tokens + req_tokens + history_tokens + evidence_tokens
        
        return ContextBuildResult(
            system_prompt=system_prompt,
            user_request=user_request,
            selected_messages=selected_messages,
            selected_evidence=selected_evidence,
            system_token_estimate=sys_tokens,
            request_token_estimate=req_tokens,
            history_token_estimate=history_tokens,
            evidence_token_estimate=evidence_tokens,
            total_input_token_estimate=total_input,
            reserved_output_tokens=self.reserved_output_tokens,
            final_available_budget=budget,
            excluded_messages_count=excluded_messages,
            excluded_evidence_count=excluded_evidence,
            exact_estimation=self.token_counter.is_exact()
        )

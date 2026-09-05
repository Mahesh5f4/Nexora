from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import json
import time
import asyncio
import re
import logging
from app.api.auth_middleware import verify_internal_token
from app.services.rag_service import RAGService
from app.dependencies import get_rag_service, get_compiled_graph
from app.models.agent import AgentAskRequest, AgentAskResponse
from app.models.ai_execute import AiExecuteRequest
from app.agent.validator import AnalysisOutputValidator
from app.models.rag_answer import RagSourceModel
from app.core.config import settings

router = APIRouter(
    prefix="/internal/agent",
    tags=["Internal Agent APIs"],
    dependencies=[Depends(verify_internal_token)]
)

logger = logging.getLogger(__name__)

@router.post("/ask", response_model=AgentAskResponse)
def ask_agent(
    request: AgentAskRequest,
    rag_service: RAGService = Depends(get_rag_service),
    graph = Depends(get_compiled_graph)
):
    try:
        safe_messages = []
        if request.messages:
            for msg in request.messages:
                safe_messages.append(msg)
                
        start_time = time.perf_counter()
        
        # Opt 1: reuse pre-compiled graph singleton — no re-compile cost per request
        initial_state = {
            "query": request.query,
            "user_id": request.userId,
            "messages": safe_messages,
            "evidence": [],
            "search_queries": [],
            "iteration": 1,
            "max_iterations": 3,
            "evaluation_status": "UNKNOWN",
            "evaluation_reason": None,
            "missing_information": [],
            "needs_retrieval": False,
            "needs_web_search": request.forceWebSearch,
            "force_rag": getattr(request, "forceRag", False),
            "answer": None,
            "mode": (request.mode or "CHAT").upper(),
            "images": getattr(request, "images", None)
        }
        
        # Execute graph
        final_state = graph.invoke(initial_state)
        
        # Observability metrics
        total_ms = int((time.perf_counter() - start_time) * 1000)
        mode = final_state.get("mode", "unknown")
        logger.info(
            f"Agent Request completed user_id={request.userId} mode={mode} "
            f"total_ms={total_ms}"
        )
        
        # Format sources
        sources = []
        seen_keys = set()
        for ev in final_state.get("evidence", []):
            key = ev.title if ev.source_type == "document" else getattr(ev, 'url', ev.document_id)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            if ev.source_type == "document":
                sources.append(
                    RagSourceModel(
                        documentId=ev.document_id,
                        filename=ev.title,
                        chunkId=ev.chunk_id,
                        score=ev.score,
                        publishedDate=ev.published_date
                    )
                )
            elif ev.source_type == "web":
                sources.append(
                    RagSourceModel(
                        documentId=ev.url,
                        filename=ev.title,
                        chunkId=ev.source_domain,
                        score=ev.score,
                        publishedDate=ev.published_date
                    )
                )
            elif ev.source_type == "user_memory":
                sources.append(
                    RagSourceModel(
                        documentId=ev.document_id,
                        filename=ev.title,
                        chunkId=ev.chunk_id,
                        score=ev.score,
                        publishedDate=ev.published_date
                    )
                )
        
        # Execute the deferred prompt for non-streaming endpoint
        if "final_request" in final_state and final_state["final_request"]:
            ai_req = AiExecuteRequest(**final_state["final_request"])
            response = rag_service.llm_gateway.execute_prompt(ai_req)
            
            if mode == "analysis":
                validator = AnalysisOutputValidator()
                val_result = validator.validate(response.content, final_state.get("evidence", []))
                final_state["answer"] = val_result["validated_text"]
                final_state["analyze_validation_status"] = val_result["status"]
                final_state["analyze_validation_warnings"] = val_result["warnings"]
                final_state["analyze_structure_score"] = val_result["structure_score"]
                final_state["analyze_source_validation"] = val_result["source_validation"]
                final_state["analyze_contradiction_warning"] = val_result["contradiction_warning"]
            else:
                final_state["answer"] = response.content

        
        return AgentAskResponse(
            answer=final_state.get("answer", ""),
            sources=sources,
            mode=mode
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/execute")
def execute_prompt(
    request: AiExecuteRequest,
    rag_service: RAGService = Depends(get_rag_service)
):
    try:
        response = rag_service.llm_gateway.execute_prompt(request)
        return {"content": response.content}
    except Exception as e:
        logger.error(f"Execute prompt error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/stream")
def ask_agent_stream(
    request: AgentAskRequest,
    rag_service: RAGService = Depends(get_rag_service),
    graph = Depends(get_compiled_graph)
):
    try:
        # if request.query and len(request.query) > settings.safety_max_input_chars:
        #     raise HTTPException(status_code=400, detail="User request exceeds safety limits")
            
        safe_messages = []
        if request.messages:
            for msg in request.messages:
                safe_messages.append(msg)
                
        def event_generator():
            try:
                initial_state = {
                    "query": request.query,
                    "user_id": request.userId,
                    "messages": safe_messages,
                    "evidence": [],
                    "search_queries": [],
                    "iteration": 1,
                    "max_iterations": 3,
                    "evaluation_status": "UNKNOWN",
                    "evaluation_reason": None,
                    "missing_information": [],
                    "needs_retrieval": False,
                    "needs_web_search": request.forceWebSearch,
                    "force_rag": getattr(request, "forceRag", False),
                    "document_id": getattr(request, "documentId", None),
                    "answer": None,
                    "mode": (request.mode or "CHAT").upper(),
                    "images": getattr(request, "images", None)
                }
                
                yield f"event: start\ndata: {{}}\n\n"
                initial_act = {
                    "id": "act_init_0",
                    "stage": "understanding",
                    "title": "Understanding request",
                    "status": "running",
                    "description": "Analyzing query & context"
                }
                yield f"event: activity\ndata: {json.dumps(initial_act)}\n\n"
                
                final_state = None
                emitted_activity_states = {"act_init_0_running_Analyzing query & context": True}
                
                # Run graph step by step to emit status and activity events
                for output in graph.stream(initial_state):
                    for node_name, state in output.items():
                        final_state = state
                        yield f"event: status\ndata: {json.dumps({'stage': node_name})}\n\n"
                        
                        if node_name == "classify_question":
                            flags = {
                                "needsWeb": state.get("needs_web", False),
                                "needsRag": state.get("needs_rag", False),
                                "needsMemory": state.get("needs_memory", False),
                                "needsCode": state.get("needs_code_retrieval", False),
                                "needsLlm": state.get("needs_llm", True)
                            }
                            yield f"event: metadata\ndata: {json.dumps(flags)}\n\n"
                            
                        # Emit structured activity updates
                        for act in state.get("activity_events", []):
                            act_id = act.get("id")
                            status = act.get("status")
                            desc = act.get("description")
                            key = f"{act_id}_{status}_{desc}"
                            if act_id and key not in emitted_activity_states:
                                emitted_activity_states[key] = True
                                yield f"event: activity\ndata: {json.dumps(act)}\n\n"
                
                if final_state is None:
                    final_state = initial_state
                    
                # Emit collected sources (only web, document, code — NEVER user_memory)
                seen_keys = set()
                for ev in final_state.get("evidence", []):
                    if ev.source_type == "user_memory" or ev.source_type not in ["web", "document", "code"]:
                        continue
                    key = ev.title if ev.source_type == "document" else getattr(ev, 'url', getattr(ev, 'document_id', ''))
                    if not key or key in seen_keys:
                        continue
                    seen_keys.add(key)
                    
                    src_data = {
                        'title': ev.title,
                        'source_name': ev.title,
                        'content': ev.content,
                        'url': ev.url if ev.source_type == "web" else 'doc',
                        'domain': getattr(ev, 'source_domain', ev.title) or ev.title,
                        'source_type': ev.source_type,
                        'relevance_score': ev.score
                    }
                    yield f"event: source\ndata: {json.dumps(src_data)}\n\n"

                # Check if we have a final_request to stream
                if "final_request" in final_state and final_state["final_request"]:
                    yield f"event: status\ndata: {json.dumps({'stage': 'generating'})}\n\n"
                    yield f"event: answer_started\ndata: {{}}\n\n"
                    
                    ai_req = AiExecuteRequest(**final_state["final_request"])
                    
                    if final_state.get("mode") == "analysis":
                        full_response = ""
                        validator = AnalysisOutputValidator()
                        evidence = final_state.get("evidence", [])
                        evidence_urls = {e.url for e in evidence if e.url}
                        url_pattern = validator.url_pattern
                        
                        aborted = False
                        for event_type, chunk in rag_service.llm_gateway.execute_prompt_stream(ai_req):
                            if event_type == "thinking":
                                yield f"event: thinking\ndata: {json.dumps({'text': chunk})}\n\n"
                                continue

                            full_response += chunk
                            
                            found_urls = set(url_pattern.findall(full_response))
                            fabricated = False
                            for url in found_urls:
                                url = url.rstrip('.,;')
                                if url not in evidence_urls:
                                    fabricated = True
                                    break
                                    
                            if fabricated:
                                aborted = True
                                yield f"event: error\ndata: {json.dumps({'error': 'Fabricated source URL detected during stream.', 'status': 400})}\n\n"
                                break
                                
                            if chunk:
                                yield f"event: token\ndata: {json.dumps({'text': chunk})}\n\n"
                            
                        if not aborted:
                            val_result = validator.validate(full_response, evidence)
                            final_state["answer"] = val_result["validated_text"]
                            final_state["analyze_validation_status"] = val_result["status"]
                            final_state["analyze_validation_warnings"] = val_result["warnings"]
                            final_state["analyze_structure_score"] = val_result["structure_score"]
                            final_state["analyze_source_validation"] = val_result["source_validation"]
                            final_state["analyze_contradiction_warning"] = val_result["contradiction_warning"]
                            
                            metadata = {
                                "validationStatus": val_result["status"],
                                "warnings": val_result["warnings"],
                                "structureScore": val_result["structure_score"],
                                "sourceValidation": val_result["source_validation"],
                                "contradictionWarning": val_result["contradiction_warning"]
                            }
                            yield f"event: metadata\ndata: {json.dumps(metadata)}\n\n"
                    else:
                        try:
                            for event_type, chunk in rag_service.llm_gateway.execute_prompt_stream(ai_req):
                                if chunk:
                                    if event_type == "thinking":
                                        yield f"event: thinking\ndata: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"
                                    else:
                                        yield f"event: token\ndata: {json.dumps({'text': chunk}, ensure_ascii=False)}\n\n"
                        except Exception as gen_err:
                            logger.error(f"LLM generation stream failed: {gen_err}")
                            web_sources = [ev for ev in final_state.get("evidence", []) if ev.source_type == "web"]
                            if web_sources:
                                fallback = "⚠️ The AI model is temporarily unavailable, but here are the relevant sources found:\n\n"
                                for i, ev in enumerate(web_sources, 1):
                                    fallback += f"**[{i}] [{ev.title}]({ev.url})**  \n"
                                    if ev.content:
                                        fallback += f"{ev.content[:300]}...\n\n"
                            else:
                                fallback = "⚠️ The AI model is temporarily unavailable. Please try again in a moment."
                            yield f"event: token\ndata: {json.dumps({'text': fallback}, ensure_ascii=False)}\n\n"
                else:
                    if final_state.get("answer"):
                        yield f"event: answer_started\ndata: {{}}\n\n"
                        yield f"event: token\ndata: {json.dumps({'text': final_state['answer']}, ensure_ascii=False)}\n\n"

                # Complete any running generation activity
                for act in final_state.get("activity_events", []):
                    if act.get("stage") == "generation" and act.get("status") == "running":
                        act["status"] = "completed"
                        yield f"event: activity\ndata: {json.dumps(act, ensure_ascii=False)}\n\n"

                yield f"event: answer_completed\ndata: {{}}\n\n"
                yield f"event: request_completed\ndata: {{}}\n\n"
                yield f"event: done\ndata: {{}}\n\n"

            except HTTPException as e:
                logger.error(f"Stream generation HTTP error: {e.detail}")
                yield f"event: error\ndata: {json.dumps({'error': str(e.detail), 'status': e.status_code}, ensure_ascii=False)}\n\n"
                yield f"event: done\ndata: {{}}\n\n"
            except Exception as e:
                logger.error(f"Stream generation error: {e}")
                yield f"event: error\ndata: {json.dumps({'error': str(e), 'status': 500}, ensure_ascii=False)}\n\n"
                yield f"event: done\ndata: {{}}\n\n"

        return StreamingResponse(
            event_generator(), 
            media_type="text/event-stream; charset=utf-8",
            headers={
                "Content-Type": "text/event-stream; charset=utf-8",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Agent error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


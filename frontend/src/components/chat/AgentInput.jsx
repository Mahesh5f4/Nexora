import { useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { AGENT_CONFIG } from '../../config/agentConfig';

const AgentInput = ({ agentType, input, setInput, submit, isLoading, handleStop }) => {
  const textareaRef = useRef(null);

  const config = AGENT_CONFIG[agentType] || AGENT_CONFIG.GENERAL;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSendAction();
      }
    }
  };

  const handleSendAction = () => {
    const finalInput = input.trim();
    if (!finalInput) return;
    submit(finalInput, {});
  };

  const getPlaceholder = () => {
    switch (agentType) {
      case 'GENERAL': return "Ask anything or describe what you need…";
      case 'CODE_RESEARCHER': return "Paste code, describe a bug, or ask for architecture…";
      case 'RESEARCH': return "Ask the researcher to investigate any topic or trend…";
      case 'PLAN': return "Describe your project or goal for a phased plan…";
      case 'ANALYZE': return "Paste data, query, or text to analyze deeply…";
      default: return "Reply to ThinkAction AI…";
    }
  };

  return (
    <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/90 to-transparent pt-10 pb-3 sm:pb-5 px-3 sm:px-6 z-20 pointer-events-none">
      <div className="max-w-3xl mx-auto flex flex-col bg-[#141418]/95 border border-white/10 focus-within:border-white/20 rounded-2xl transition-all duration-200 pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
        
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          rows={1}
          className="w-full bg-transparent px-4 pt-3.5 pb-2 text-white text-[14px] leading-[1.6] placeholder:text-zinc-500 focus:outline-none resize-none max-h-[200px]"
        />

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          {/* Desktop keyboard hint */}
          <div className="hidden sm:flex items-center gap-2.5 text-[11px] text-zinc-500 px-1 select-none">
            <span><kbd className="font-mono border border-white/10 rounded px-1 text-[10px] bg-white/[0.04]">↵</kbd> send</span>
            <span><kbd className="font-mono border border-white/10 rounded px-1 text-[10px] bg-white/[0.04]">⇧↵</kbd> new line</span>
          </div>

          <div className="sm:hidden" />
          
          {/* Send / Stop button */}
          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 transition-all cursor-pointer select-none"
              aria-label="Stop generating"
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSendAction}
              disabled={!input.trim()}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/15 cursor-pointer select-none"
              aria-label="Send message"
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentInput;

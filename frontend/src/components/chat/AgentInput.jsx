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
    const finalInput = input.trim() || 'Please analyze.';
    submit(finalInput, {});
  };

  const getPlaceholder = () => {
    switch (agentType) {
      case 'GENERAL': return "Ask anything…";
      case 'CODE_RESEARCHER': return "Paste code or describe the problem…";
      case 'RESEARCH': return "Ask the researcher anything…";
      case 'PLAN': return "Describe your goal…";
      case 'ANALYZE': return "Describe what you want analyzed…";
      default: return "Ask anything…";
    }
  };

  return (
    <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B] to-transparent pt-12 pb-4 sm:pb-6 px-3 sm:px-6 z-20 pointer-events-none">
      <div className="max-w-3xl mx-auto flex flex-col bg-[#1A1A1C] border border-white/10 rounded-2xl focus-within:border-white/20 transition-colors duration-150 pointer-events-auto shadow-2xl">
        
        {/* §10 Textarea: text-[14px] leading-[1.6] placeholder:text-white/30 */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          rows={1}
          className="w-full bg-transparent px-4 pt-4 pb-2 text-white text-[14px] leading-[1.6] placeholder:text-white/30 focus:outline-none resize-none max-h-[200px]"
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="text-[11px] text-gray-400 px-2 flex items-center gap-3">
            <span><kbd className="font-sans border border-white/10 rounded px-1 text-[10px]">↵</kbd> send</span>
            <span><kbd className="font-sans border border-white/10 rounded px-1 text-[10px]">⇧</kbd>+<kbd className="font-sans border border-white/10 rounded px-1 text-[10px]">↵</kbd> new line</span>
          </div>
          
          {/* §10 Send button: w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 — always aria-label */}
          {isLoading ? (
            <button
              onClick={handleStop}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/5 text-white/70 hover:text-white transition-all duration-150"
              aria-label="Stop generating"
            >
              <Square size={15} />
            </button>
          ) : (
            <button
              onClick={handleSendAction}
              disabled={!input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/5 text-white/70 hover:text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              <ArrowUp size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentInput;

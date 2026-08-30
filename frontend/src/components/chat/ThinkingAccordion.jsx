import React, { useState, useEffect } from 'react';
import { Brain, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

const ThinkingAccordion = ({ thinking, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-open while thinking is actively streaming without regular content yet, then collapse
  useEffect(() => {
    if (isStreaming && thinking && thinking.length < 200) {
      setIsOpen(true);
    }
  }, [isStreaming, thinking]);

  if (!thinking || !thinking.trim()) return null;

  return (
    <div className="my-2 border border-white/10 rounded-xl bg-white/[0.02] overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-white/[0.04] transition-colors group"
        aria-expanded={isOpen}
        aria-label="Toggle thinking process"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-purple-400/90 group-hover:text-purple-300 transition-colors">
          {isStreaming ? (
            <Sparkles size={14} className="animate-spin text-purple-400" />
          ) : (
            <Brain size={14} className="text-purple-400" />
          )}
          <span>{isStreaming ? 'Thinking...' : 'Thinking Process'}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-white/40 group-hover:text-white/70 transition-colors">
          <span>{isOpen ? 'Hide' : 'Show'}</span>
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 pb-3 pt-1 border-t border-white/5 bg-[#0e0e10]/60">
          <div className="text-xs font-mono text-gray-400 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto custom-scrollbar select-text">
            {thinking}
            {isStreaming && (
              <span className="inline-block w-[2px] h-[1em] bg-purple-400 animate-pulse ml-1 align-middle" />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThinkingAccordion;

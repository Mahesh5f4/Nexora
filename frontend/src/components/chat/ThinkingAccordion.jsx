import React, { useState, useEffect, useRef } from 'react';
import { Brain, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

const ThinkingAccordion = ({ thinking, isStreaming }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [seconds, setSeconds] = useState(1);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setSeconds(Math.max(1, Math.round((Date.now() - start) / 1000)));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      // Auto-collapse when stream completes so the user sees the clean answer first
      setIsOpen(false);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStreaming]);

  if (!thinking || !thinking.trim()) return null;

  return (
    <div className="my-2.5 border border-purple-500/20 bg-purple-950/10 hover:bg-purple-950/20 rounded-xl overflow-hidden transition-all duration-200 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors group cursor-pointer"
        aria-expanded={isOpen}
        aria-label="Toggle reasoning process"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
          {isStreaming ? (
            <Sparkles size={13} className="animate-spin text-purple-400" />
          ) : (
            <Brain size={13} className="text-purple-400" />
          )}
          <span>
            {isStreaming
              ? `Thinking (${seconds}s)...`
              : `Thought for ${seconds}s`}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-purple-300/50 group-hover:text-purple-300 transition-colors">
          <span>{isOpen ? 'Hide reasoning' : 'View reasoning'}</span>
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </div>
      </button>

      {isOpen && (
        <div className="px-4 pb-3.5 pt-1.5 border-t border-purple-500/10 bg-[#0d0d10]/80">
          <div className="border-l-2 border-purple-500/30 pl-3 my-1 text-xs font-mono text-gray-400 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto custom-scrollbar select-text">
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

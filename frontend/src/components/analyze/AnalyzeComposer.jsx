import React, { useState, useRef, useEffect } from 'react';
import { Send, Square, X } from 'lucide-react';
import AnalyzeDocumentUpload from './AnalyzeDocumentUpload';

const AnalyzeComposer = ({ onSend, isLoading, onStop }) => {
  const [input, setInput] = useState('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading) {
        onSend(input);
        setInput('');
      }
    }
  };

  return (
    <div className="relative">
      {/* §10: bg-[#1A1A1C] border border-white/10 rounded-2xl, focus: border-white/20 only — no glow */}
      <div className="bg-[#1A1A1C] border border-white/10 rounded-2xl overflow-hidden focus-within:border-white/20 transition-colors duration-150">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What do you want me to investigate?"
          className="w-full max-h-[200px] bg-transparent text-white px-4 py-4 focus:outline-none resize-none placeholder:text-white/30 text-[14px] leading-relaxed"
          rows={1}
        />
        
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          <div className="flex-1"></div>
          
          <div className="flex items-center">
            {isLoading ? (
              <button
                onClick={onStop}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/5 text-white/70 hover:text-white transition-all duration-150"
                aria-label="Stop analyzing"
                title="Stop analyzing"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={() => {
                  if (input.trim()) {
                    onSend(input);
                    setInput('');
                  }
                }}
                disabled={!input.trim()}
                className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/5 text-white/70 hover:text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send analysis request"
                title="Send"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isUploadOpen && (
        <AnalyzeDocumentUpload onClose={() => setIsUploadOpen(false)} />
      )}
    </div>
  );
};

export default AnalyzeComposer;

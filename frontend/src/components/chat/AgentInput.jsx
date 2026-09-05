import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Square, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react';
import { AGENT_CONFIG } from '../../config/agentConfig';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AgentInput = ({ agentType, input, setInput, submit, isLoading, handleStop }) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);

  const config = AGENT_CONFIG[agentType] || AGENT_CONFIG.GENERAL;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input, attachments]);

  const processFile = (file) => {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments(prev => [
          ...prev,
          {
            id,
            name: file.name || 'Pasted Image',
            size: file.size,
            type: 'image',
            dataUrl: e.target.result
          }
        ]);
      };
      reader.readAsDataURL(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachments(prev => [
          ...prev,
          {
            id,
            name: file.name,
            size: file.size,
            type: 'file',
            content: e.target.result
          }
        ]);
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processFile);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          processFile(blob);
          e.preventDefault();
        }
      }
    }
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || attachments.length > 0) {
        handleSendAction();
      }
    }
  };

  const handleSendAction = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput && attachments.length === 0) return;

    let combinedText = trimmedInput;
    const textFiles = attachments.filter(a => a.type === 'file');
    if (textFiles.length > 0) {
      for (const tf of textFiles) {
        const ext = tf.name.split('.').pop() || '';
        combinedText += `\n\n--- Attached File: ${tf.name} ---\n\`\`\`${ext}\n${tf.content}\n\`\`\``;
      }
    }

    const imageAttachments = attachments.filter(a => a.type === 'image').map(a => a.dataUrl);
    const filesMeta = attachments.map(a => ({
      name: a.name,
      size: a.size,
      type: a.type,
      content: a.content || null,
      dataUrl: a.dataUrl || null,
    }));

    submit(combinedText || "Analyze the attached file(s)", {
      images: imageAttachments.length > 0 ? imageAttachments : undefined,
      displayPrompt: trimmedInput,
      attachments: filesMeta,
    });

    setInput('');
    setAttachments([]);
  };

  const getPlaceholder = () => {
    switch (agentType) {
      case 'GENERAL': return "Ask anything or paste screenshots / attach files…";
      case 'CODE_RESEARCHER': return "Paste code, crash logs, or ask for architecture…";
      case 'RESEARCH': return "Attach research paper, claim screenshot, or topic to investigate…";
      case 'PLAN': return "Attach architecture diagram, PRD document, or describe goals…";
      case 'ANALYZE': return "Attach dataset (.csv/.json), error logs, or paste charts to analyze…";
      default: return "Reply to ThinkAction AI…";
    }
  };

  return (
    <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/90 to-transparent pt-10 pb-3 sm:pb-5 px-3 sm:px-6 z-20 pointer-events-none">
      <div className="max-w-3xl mx-auto flex flex-col bg-[#141418]/95 border border-white/10 focus-within:border-white/20 rounded-2xl transition-all duration-200 pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden">
        
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/png,image/jpeg,image/webp,image/jpg,.txt,.log,.csv,.json,.md,.sql,.py,.js,.ts,.yaml,.xml"
          className="hidden"
        />

        {/* Claude-style Attachment preview drawer */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2.5 px-3.5 pt-3 pb-2 border-b border-white/10 bg-white/[0.03]">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs text-zinc-300 transition-all shadow-sm"
              >
                {att.type === 'image' ? (
                  <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-white/20 bg-black/40 shrink-0">
                    <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-blue-400" />
                  </div>
                )}
                <div className="flex flex-col max-w-[140px]">
                  <span className="truncate text-white/95 font-medium text-[11px]">{att.name}</span>
                  <span className="text-[10px] text-zinc-400">{formatFileSize(att.size)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10 hover:bg-red-500/30 text-zinc-400 hover:text-red-300 transition-all cursor-pointer ml-0.5"
                  title="Remove attachment"
                  aria-label="Remove attachment"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={getPlaceholder()}
          rows={1}
          className="w-full bg-transparent px-4 pt-3.5 pb-2 text-white text-[14px] leading-[1.6] placeholder:text-zinc-500 focus:outline-none resize-none max-h-[200px]"
        />

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
          {/* Left Actions: Attach File/Image & keyboard hint */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center w-8 h-8 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title="Attach image or file (.png, .jpg, .log, .csv, .json, .txt)"
              aria-label="Attach file or image"
            >
              <Paperclip size={16} />
            </button>

            {/* Desktop keyboard hint */}
            <div className="hidden sm:flex items-center gap-2.5 text-[11px] text-zinc-500 px-1 select-none">
              <span><kbd className="font-mono border border-white/10 rounded px-1 text-[10px] bg-white/[0.04]">↵</kbd> send</span>
              <span><kbd className="font-mono border border-white/10 rounded px-1 text-[10px] bg-white/[0.04]">⇧↵</kbd> newline</span>
              <span><kbd className="font-mono border border-white/10 rounded px-1 text-[10px] bg-white/[0.04]">Ctrl+V</kbd> paste img</span>
            </div>
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
              disabled={!input.trim() && attachments.length === 0}
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

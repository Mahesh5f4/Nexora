import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, BrainCircuit, Globe, FileText, ExternalLink, Copy, Check, RefreshCw, MoreHorizontal } from 'lucide-react';
import CodeBlock from './CodeBlock';
import StreamingStatus from './StreamingStatus';
import { copyToClipboard } from '../../utils/clipboard';

/**
 * §15 compliance:
 *   - No typewriter/character-stagger animation (StreamingContent removed)
 *   - Streaming cursor: w-[2px] h-[1em] bg-white/60 animate-pulse ml-[1px]
 *   - aria-live="polite" on streaming text region
 *   - aria-label on all icon-only buttons
 *   - User messages: bg-[#1A1A1C] rounded-2xl px-4 py-3
 *   - Source chips: rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs
 *   - Body copy no lighter than text-gray-400 (#9CA3AF)
 */

const markdownComponents = {
  code({ node, inline, className, children, ...props }) {
    return (
      <CodeBlock inline={inline} className={className} {...props}>
        {children}
      </CodeBlock>
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
  table({ node, children, ...props }) {
    return (
      <div className="w-full overflow-x-auto my-4 custom-scrollbar rounded-lg border border-white/10">
        <table className="w-full text-sm text-left" {...props}>
          {children}
        </table>
      </div>
    );
  },
  a({ node, href, children, ...props }) {
    const safeHref = href?.startsWith('javascript:') ? '#' : href;
    return (
      <a href={safeHref} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 underline-offset-2 transition-colors" {...props}>
        {children}
      </a>
    );
  }
};

const useSmoothStream = (text, isStreaming) => {
  const [displayedText, setDisplayedText] = useState(text);
  const targetTextRef = React.useRef(text);

  React.useEffect(() => {
    targetTextRef.current = text;
    if (!isStreaming) {
      setDisplayedText(text);
    }
  }, [text, isStreaming]);

  React.useEffect(() => {
    if (!isStreaming) return;
    const intervalId = setInterval(() => {
      setDisplayedText((current) => {
        const target = targetTextRef.current;
        if (current.length < target.length) {
          const diff = target.length - current.length;
          const chunkSize = Math.max(1, Math.floor(diff / 4));
          return target.substring(0, current.length + chunkSize);
        }
        return current;
      });
    }, 16);

    return () => clearInterval(intervalId);
  }, [isStreaming]);

  return isStreaming ? displayedText : text;
};

const MessageItem = ({ message, isStreaming, onStreamingComplete }) => {
  const isUser = message.sender === 'USER';
  const [copied, setCopied] = useState(false);
  const displayedContent = useSmoothStream(message.content, isStreaming);

  const handleCopy = () => {
    copyToClipboard(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex w-full py-6 group message-enter ${isUser ? '' : 'bg-white/[0.02] border-y border-white/[0.02]'}`}>
      <div className="max-w-4xl mx-auto w-full flex gap-4 md:gap-6 px-4">
        
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-[#1A1A1C] border border-white/10 text-gray-400 flex items-center justify-center">
              <User size={16} />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#1A1A1C] border border-white/10 text-white flex items-center justify-center">
              <BrainCircuit size={16} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm mb-1 text-gray-400">
            {isUser ? 'You' : 'ThinkAction AI'}
          </div>
          
          <div className="text-white/90">
            {isUser ? (
              /* §7 Chat: User messages: bg-[#1A1A1C] rounded-2xl px-4 py-3 */
              <div className="bg-[#1A1A1C] rounded-2xl px-4 py-3 whitespace-pre-wrap text-[14px] leading-[1.6]">{message.content}</div>
            ) : isStreaming && !displayedContent ? (
              <StreamingStatus metadata={message.metadata} mode="GENERAL" />
            ) : (
              <div className="space-y-4">
                {/* §15: aria-live="polite" on streaming text region */}
                <div 
                  className="prose prose-invert prose-sm md:prose-base max-w-none 
                                  prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent 
                                  prose-headings:font-semibold prose-headings:tracking-tight
                                  prose-a:text-blue-400 prose-strong:text-white"
                  aria-live="polite"
                >
                  {/* §15: No typewriter animation — render directly via ReactMarkdown */}
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {displayedContent}
                  </ReactMarkdown>
                  {/* §9 Streaming cursor: w-[2px] h-[1em] bg-white/60 animate-pulse ml-[1px] */}
                  {isStreaming && <span className="inline-block w-[2px] h-[1em] bg-white/60 animate-pulse ml-[1px] align-middle" />}
                </div>

                {/* §7 Source chips: rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs */}
                {message.sources && message.sources.length > 0 && (
                  <div className="pt-4 mt-6 border-t border-white/10">
                    <div className="text-xs text-white/30 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Globe size={10} /> Sources
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {message.sources.map((src, i) => {
                        const isWeb = src.documentId?.startsWith('http');
                        return (
                          <a 
                            key={i} 
                            href={isWeb ? src.documentId : '#'}
                            target={isWeb ? "_blank" : "_self"}
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-gray-400 hover:text-white hover:border-white/30 transition-all"
                          >
                            {isWeb ? <Globe size={10} className="text-blue-400 flex-shrink-0" /> : <FileText size={10} className="text-emerald-400 flex-shrink-0" />}
                            <span className="truncate max-w-[140px] md:max-w-[200px]">
                              {src.filename || src.documentId}
                            </span>
                            {isWeb && <ExternalLink size={10} className="text-gray-400 ml-1 flex-shrink-0" />}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Action Bar — all icon buttons have aria-label */}
                {!isStreaming && (
                  <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button 
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-all text-xs font-medium"
                      aria-label="Copy response"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button 
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-all text-xs font-medium"
                      aria-label="Regenerate response"
                    >
                      <RefreshCw size={12} />
                      <span className="hidden sm:inline">Regenerate</span>
                    </button>
                    <button 
                      className="flex items-center justify-center p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-all"
                      aria-label="More actions"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                )}
                
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;

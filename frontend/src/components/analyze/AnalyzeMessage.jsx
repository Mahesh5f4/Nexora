import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import CodeBlock from '../chat/CodeBlock';
import SourceRoutingTags from '../chat/SourceRoutingTags';
import { User, BrainCircuit, CheckCircle2, AlertTriangle, Loader2, Copy, Check } from 'lucide-react';
import { AGENT_CONFIG } from '../../config/agentConfig';

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
      <a href={safeHref} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline" {...props}>
        {children}
      </a>
    );
  }
};

const AnalyzeMessage = React.memo(({ message }) => {
  const isUser = message.sender === 'USER';
  const config = AGENT_CONFIG.ANALYZE;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Parse validation tags from metadata if they exist
  const validationTag = useMemo(() => {
    if (isUser || !message.metadata || !message.metadata.tags) return null;
    const tags = message.metadata.tags;
    
    if (tags.includes('GROUNDED_SUCCESS')) {
      return { icon: CheckCircle2, text: 'Grounded Analysis', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' };
    }
    if (tags.includes('CONTRADICTION_CANDIDATE')) {
      return { icon: AlertTriangle, text: 'Contradiction Found', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' };
    }
    return null;
  }, [isUser, message.metadata]);



  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} group`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
        isUser
          ? 'bg-white/10 border-white/10 text-white'
          : 'border-pink-500/20 text-pink-400'
      }`} style={!isUser ? { backgroundColor: config.bg, color: config.color } : {}}>
        {isUser ? <div className="text-xs font-medium">U</div> : <config.icon size={16} />}
      </div>

      {/* Bubble Container */}
      <div className={`flex-1 overflow-hidden flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        {!isUser && message.metadata && <SourceRoutingTags flags={message.metadata} />}

        <div className={`px-5 py-4 ${
          isUser 
            ? 'inline-block bg-[#1A1A1C] border border-white/10 text-white/90 rounded-2xl rounded-tr-sm' 
            : 'w-full text-white/85'
        }`}>
          {message.streaming && !message.content ? (
            <div className="flex items-center space-x-2 text-white/40">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Synthesizing evidence...</span>
            </div>
          ) : (() => {
            let processedContent = message.content + (message.streaming ? ' ▍' : '');
            
            // Replace epistemic markers with styled raw HTML badges
            processedContent = processedContent
              .replace(/\[FACT\]/g, '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider align-middle" title="Fact backed by evidence"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>FACT</span>')
              .replace(/\[INFERENCE\]/g, '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider align-middle" title="Inferred from evidence">INFERENCE</span>')
              .replace(/\[UNCERTAINTY\]/g, '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider align-middle" title="Uncertain or insufficient evidence"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>UNCERTAIN</span>')
              .replace(/\[CONTRADICTION_CANDIDATE\]/g, '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider align-middle" title="Possible conflict found"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>CONFLICT</span>');

            return (
              <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent prose-headings:font-semibold prose-headings:tracking-tight prose-a:text-amber-400 prose-strong:text-white">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={markdownComponents}>
                  {processedContent}
                </ReactMarkdown>
                {message.streaming && <span className="stream-cursor" style={{ color: config.color }} />}
              </div>
            );
          })()}
        </div>

        {/* Validation Metadata Badge (only for AI) */}
        {!isUser && validationTag && !message.streaming && (
          <div className={`mt-2 flex items-center space-x-1.5 px-2.5 py-1 rounded border text-xs font-medium ${validationTag.bg} ${validationTag.color}`}>
            <validationTag.icon className="w-3.5 h-3.5" />
            <span>{validationTag.text}</span>
          </div>
        )}

        {/* Action Bar (Copy Button) */}
        {!isUser && !message.streaming && (
          <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.streaming === nextProps.message.streaming
  );
});

export default AnalyzeMessage;

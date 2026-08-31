import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, User, Plus, Check, Copy, Globe, Mail, Code, Lightbulb, FileText, ArrowRight, Menu } from 'lucide-react';
import { useAgentStream } from '../../hooks/useAgentStream';
import CodeBlock from '../chat/CodeBlock';
import AgentInput from '../chat/AgentInput';
import SourceRoutingTags from '../chat/SourceRoutingTags';
import { copyToClipboard } from '../../utils/clipboard';

/**
 * §7 Chat output schema:
 *   Plain conversational layout. No section headings inside the assistant response.
 *   User messages right-aligned in bg-[#1A1A1C] rounded-2xl px-4 py-3.
 *
 * §15 compliance:
 *   - Background #0A0A0B, surface #1A1A1C
 *   - Body copy no lighter than text-gray-400
 *   - No spinner over streaming text — use §9 pulsing dot status bar
 *   - No inline style={{ color/backgroundColor }} for token values
 *   - Streaming cursor: w-[2px] h-[1em] bg-white/60 animate-pulse
 *   - aria-live="polite" on streaming text region
 */

const markdownComponents = {
  p({ node, children, ...props }) {
    return <div className="mb-2 last:mb-0 leading-relaxed">{children}</div>;
  },
  code({ node, inline, className, children, ...props }) {
    return <CodeBlock inline={inline} className={className} {...props}>{children}</CodeBlock>;
  },
  pre({ children }) {
    return <>{children}</>;
  },
  table({ node, children, ...props }) {
    return (
      <div className="w-full overflow-x-auto my-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <table className="w-full text-sm text-left border-collapse" {...props}>{children}</table>
      </div>
    );
  },
  thead({ node, children, ...props }) {
    return <thead className="bg-white/5 border-b border-white/10 text-white/80 font-medium" {...props}>{children}</thead>;
  },
  th({ node, children, ...props }) {
    return <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/70" {...props}>{children}</th>;
  },
  td({ node, children, ...props }) {
    return <td className="px-4 py-2.5 border-t border-white/5 text-gray-300 align-top" {...props}>{children}</td>;
  },
  a({ node, href, children, ...props }) {
    const safe = href?.startsWith('javascript:') ? '#' : href;
    return <a href={safe} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2" {...props}>{children}</a>;
  }
};

/* §7 Research-style source chips: rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs */
const SourcePill = ({ src }) => {
  const isWeb = src.url && src.url !== 'doc';
  return (
    <a
      href={isWeb ? src.url : '#'}
      target={isWeb ? '_blank' : '_self'}
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs text-gray-400 hover:text-white hover:border-white/30 transition-all"
    >
      <Globe size={9} className={isWeb ? 'text-blue-400' : 'text-emerald-400'} />
      <span className="truncate max-w-[160px]">{src.title || src.domain}</span>
    </a>
  );
};

const MessageBubble = React.memo(({ msg }) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.sender === 'USER';

  const handleCopy = () => {
    copyToClipboard(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} group message-enter`}>
      {/* Avatar — no inline style for token values */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/10 bg-[#1A1A1C] ${
        isUser ? 'text-gray-400' : 'text-white'
      }`}>
        {isUser ? <User size={14} /> : <BrainCircuit size={16} />}
      </div>
      
      <div className={`flex-1 overflow-hidden ${isUser ? 'flex flex-col items-end' : ''}`}>
        {!isUser && msg.metadata && <SourceRoutingTags flags={msg.metadata} />}
        
        <div className={`px-4 py-3 ${
          isUser 
            /* §7 Chat: User messages bg-[#1A1A1C] rounded-2xl px-4 py-3 */
            ? 'inline-block bg-[#1A1A1C] border border-white/10 text-white/90 rounded-2xl rounded-tr-sm' 
            : 'w-full text-white/90'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap text-[14px] leading-[1.6]">{msg.content}</p>
          ) : msg.streaming && !msg.content ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
              Thinking…
            </div>
          ) : (
            /* §15: aria-live="polite" on streaming text */
            <div className="prose prose-invert prose-sm max-w-none
              prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent
              prose-headings:font-semibold prose-headings:tracking-tight
              prose-a:text-blue-400 prose-strong:text-white"
              aria-live="polite"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {msg.content}
              </ReactMarkdown>
              {/* §9 Streaming cursor */}
              {msg.streaming && <span className="inline-block w-[2px] h-[1em] bg-white/60 animate-pulse ml-[1px] align-middle" />}
            </div>
          )}
        </div>

        {/* Sources */}
        {msg.sources && msg.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {msg.sources.map((src, i) => <SourcePill key={i} src={src} />)}
          </div>
        )}

        {/* Actions — aria-label on icon-only button */}
        {!isUser && !msg.streaming && msg.content && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:border-white/15 text-gray-400 hover:text-white text-xs mt-2"
            aria-label="Copy response"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy response'}
          </button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.msg.id === nextProps.msg.id &&
    prevProps.msg.content === nextProps.msg.content &&
    prevProps.msg.streaming === nextProps.msg.streaming &&
    prevProps.msg.thinking === nextProps.msg.thinking &&
    prevProps.msg.activities?.length === nextProps.msg.activities?.length &&
    prevProps.msg.sources?.length === nextProps.msg.sources?.length
  );
});

const GeneralMode = ({ activeConversation, setActiveConversation, fetchConversations, onConversationCreated, onOpenSidebar }) => {
  const {
    messages, isLoading, error,
    handleSend, handleStop, handleNewChat, syncConversation
  } = useAgentStream('GENERAL', activeConversation, setActiveConversation, fetchConversations, onConversationCreated);

  const [input, setInput] = useState('');
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { syncConversation(activeConversation); }, [activeConversation?.id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const submit = (content, options) => {
    const text = content || input;
    if (!text.trim() || isLoading) return;
    handleSend(text.trim(), options);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0B] text-white font-sans relative">
      {/* Top bar */}
      <header className="h-14 shrink-0 border-b border-white/5 flex items-center justify-between px-3 sm:px-6 bg-[#0A0A0B]/80 backdrop-blur-xl z-30 sticky top-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <BrainCircuit size={16} className="text-blue-400" />
            <span className="text-xs sm:text-sm font-semibold text-zinc-300 tracking-wide">General</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="hidden sm:inline">Generating…</span>
            </span>
          )}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
            aria-label="Start new chat"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-6 pb-36 sm:pb-40 relative">
        {messages.length === 0 ? (
          <div className="min-h-full flex flex-col items-center max-w-4xl mx-auto px-4 w-full pt-10 pb-32 sm:pb-36">
            <div className="flex-1" />
            <div className="w-full">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-8 sm:mb-10 relative"
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/10 blur-[60px] rounded-full pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1A1A1C] to-black border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10">
                  <BrainCircuit size={28} className="text-blue-400" />
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-3">How can I help you today?</h1>
                <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto font-light">
                  Ask a question, write code, or brainstorm ideas. The General Agent dynamically routes your request.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl mx-auto"
              >
                {[
                  { icon: BrainCircuit, title: 'Explain a concept', desc: 'Break down complex topics simply', color: 'text-purple-400' },
                  { icon: Code, title: 'Write a React component', desc: 'Build a UI element with Tailwind', color: 'text-blue-400' },
                  { icon: Lightbulb, title: 'Brainstorm ideas', desc: 'Generate concepts for a new project', color: 'text-amber-400' },
                  { icon: Mail, title: 'Draft an email', desc: 'Write a professional response', color: 'text-emerald-400' }
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(action.title)}
                    className="group flex flex-col items-start p-4 md:p-5 rounded-2xl bg-[#1A1A1C]/40 hover:bg-[#1A1A1C] border border-white/5 hover:border-white/15 transition-all duration-300 text-left hover:-translate-y-0.5 hover:shadow-lg w-full"
                  >
                    <action.icon size={18} className={`${action.color} mb-3 group-hover:scale-110 transition-transform`} />
                    <span className="text-white/90 font-medium text-sm md:text-base mb-1">{action.title}</span>
                    <span className="text-gray-500 text-xs md:text-sm">{action.desc}</span>
                  </button>
                ))}
              </motion.div>
            </div>
            <div className="flex-1" />
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto space-y-6 pb-36">
            {messages.map((msg, i) => <MessageBubble key={msg.id || i} msg={msg} />)}
            {error && (
              <div className="text-center text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <AgentInput 
        agentType="GENERAL"
        input={input}
        setInput={setInput}
        submit={submit}
        isLoading={isLoading}
        handleStop={handleStop}
      />
    </div>
  );
};

export default GeneralMode;

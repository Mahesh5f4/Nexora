import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import { Compass, User, RefreshCw, Globe, ExternalLink, AlertTriangle, Copy, Check, Plus, BookOpen, Microscope, Zap, Database, Menu } from 'lucide-react';
import { useAgentStream } from '../../hooks/useAgentStream';
import CodeBlock from '../chat/CodeBlock';
import AgentInput from '../chat/AgentInput';
import SourceRoutingTags from '../chat/SourceRoutingTags';
import { AGENT_CONFIG } from '../../config/agentConfig';
import { copyToClipboard } from '../../utils/clipboard';

const markdownComponents = {
  // Render p as div — prevents invalid <div> inside <p> when markdown contains code blocks
  p({ node, children, ...props }) {
    return <div className="mb-2 last:mb-0 leading-relaxed">{children}</div>;
  },
  code({ node, inline, className, children, ...props }) {
    return <CodeBlock inline={inline} className={className} {...props}>{children}</CodeBlock>;
  },
  pre({ children }) {
    return <>{children}</>;
  },
  a({ node, href, children, ...props }) {
    const safe = href?.startsWith('javascript:') ? '#' : href;
    return (
      <a href={safe} target="_blank" rel="noopener noreferrer"
        className="text-purple-400 hover:text-purple-300 underline underline-offset-2 inline-flex items-center gap-1">
        {children}<ExternalLink size={10} className="shrink-0 opacity-60" />
      </a>
    );
  },
  table({ node, children, ...props }) {
    return (
      <div className="w-full overflow-x-auto my-4 rounded-lg border border-white/10">
        <table className="w-full text-sm text-left" {...props}>{children}</table>
      </div>
    );
  },
  blockquote({ node, children, ...props }) {
    return (
      <blockquote className="border-l-2 border-purple-500/40 pl-4 my-3 text-white/60 italic" {...props}>
        {children}
      </blockquote>
    );
  }
};

/* Transform epistemic claim labels into styled badges */
function processResearchContent(content) {
  return content
    .replace(/\bVERIFIED FACT\b/g,
      '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider align-middle">✓ VERIFIED FACT</span>')
    .replace(/\bINFERENCE\b/g,
      '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider align-middle">~ INFERENCE</span>')
    .replace(/\bUNCERTAIN\b/g,
      '<span class="inline-flex items-center gap-1 px-1.5 py-0.5 mx-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider align-middle">? UNCERTAIN</span>')
    .replace(/\[(\d+)\]/g,
      '<sup class="text-purple-400/80 font-bold mx-0.5 tracking-tighter">[$1]</sup>');
}

const SourceCard = ({ src, index }) => (
  <a
    href={src.url && src.url !== 'doc' ? src.url : '#'}
    target={src.url && src.url !== 'doc' ? '_blank' : '_self'}
    rel="noreferrer"
    className="group flex flex-col p-3 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10 hover:border-purple-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(168,85,247,0.1)]"
  >
    <div className="flex items-start gap-2.5">
      <div className="w-5 h-5 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
        <span className="text-[9px] font-bold text-purple-400">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center h-5">
        <p className="text-[13px] font-medium text-white/80 group-hover:text-white truncate transition-colors leading-none mt-0.5">
          {src.title || src.domain || 'Source'}
        </p>
      </div>
      <ExternalLink size={12} className="text-purple-400/30 group-hover:text-purple-400 shrink-0 mt-0.5 transition-colors" />
    </div>
    {src.domain && (
      <div className="mt-2.5 ml-7 flex items-center gap-1.5">
        <Globe size={9} className="text-purple-400/40" />
        <p className="text-[10px] text-purple-400/40 truncate uppercase tracking-widest">{src.domain}</p>
      </div>
    )}
  </a>
);

const ResearchMessage = React.memo(({ msg, allSources }) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.sender === 'USER';
  const hasConflict = msg.content?.toLowerCase().includes('conflict') || msg.metadata?.contradictionWarning;
  const config = AGENT_CONFIG.RESEARCH;

  const handleCopy = () => {
    copyToClipboard(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const rawContent = msg.content;

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} group`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${isUser
          ? 'bg-white/10 border-white/10 text-white'
          : 'border-purple-500/20 text-purple-400'
        }`} style={!isUser ? { backgroundColor: config.bg, color: config.color } : {}}>
        {isUser ? <div className="text-xs font-medium">U</div> : <config.icon size={16} />}
      </div>

      <div className={`flex-1 overflow-hidden ${isUser ? 'flex flex-col items-end' : ''}`}>
        {!isUser && msg.metadata && <SourceRoutingTags flags={msg.metadata} />}

        {/* Conflict warning banner */}
        {!isUser && hasConflict && !msg.streaming && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs w-full">
            <AlertTriangle size={12} className="shrink-0" />
            <span>Evidence conflict detected — review the CONFLICTS section below.</span>
          </div>
        )}

        <div className={`px-5 py-4 ${
          isUser
            ? 'inline-block bg-[#1A1A1C] border border-white/10 text-white/90 rounded-2xl rounded-tr-sm'
            : 'w-full text-white/85'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{rawContent}</p>
          ) : msg.streaming && !msg.content ? (
            <div className="flex items-center gap-2 text-white/40">
              <RefreshCw size={13} className="animate-spin text-purple-400" />
              <span className="text-xs">Researching…</span>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none
              prose-p:leading-relaxed
              prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-purple-300/80
              prose-a:text-purple-400 prose-strong:text-white
              prose-pre:p-0 prose-pre:bg-transparent">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  ...markdownComponents,
                  p({ children }) {
                    // inject processed badges via dangerouslySetInnerHTML on text nodes
                    if (typeof children === 'string') {
                      const processed = processResearchContent(children);
                      if (processed !== children) {
                        return <div className="mb-2 last:mb-0 leading-relaxed" dangerouslySetInnerHTML={{ __html: processed }} />;
                      }
                    }
                    return <div className="mb-2 last:mb-0 leading-relaxed">{children}</div>;
                  }
                }}
              >
                {rawContent}
              </ReactMarkdown>
              {msg.streaming && <span className="stream-cursor" style={{ color: config.color }} />}
            </div>
          )}
        </div>

        {/* Source cards */}
        {!isUser && !msg.streaming && msg.sources && msg.sources.length > 0 && (
          <div className="w-full">
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Globe size={9} /> Sources
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {msg.sources.map((src, i) => <SourceCard key={i} src={src} index={i} />)}
            </div>
          </div>
        )}

        {!isUser && !msg.streaming && msg.content && (
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:border-white/15 text-white/40 hover:text-white text-xs"
          >
            {copied ? <><Check size={10} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><Copy size={10} /><span>Copy</span></>}
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

const STARTERS = [
  'What are the latest breakthroughs in quantum computing?',
  'Summarize the current state of AI regulation in the EU',
  'Compare REST vs GraphQL vs gRPC for microservices',
  'What is the consensus on climate tipping points in 2024?',
];

const ResearcherMode = ({ activeConversation, setActiveConversation, fetchConversations, onConversationCreated, onOpenSidebar }) => {
  const {
    messages, isLoading, error, activeSources,
    handleSend, handleStop, handleNewChat, syncConversation
  } = useAgentStream('RESEARCH', activeConversation, setActiveConversation, fetchConversations, onConversationCreated);

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
    <div className="flex flex-col h-full bg-[#090710] text-white font-sans relative">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-purple-500/10 flex items-center justify-between px-3 sm:px-6 bg-[#090710]/80 backdrop-blur-xl z-30 sticky top-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Compass size={16} className="text-purple-400" />
            <span className="text-xs sm:text-sm font-semibold text-purple-200 tracking-wide">Researcher</span>
          </div>
          {isLoading && (
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-purple-400/70 ml-1">
              <RefreshCw size={11} className="animate-spin" /> Researching…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {activeSources.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-purple-400/60 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              <Globe size={10} /> {activeSources.length} sources
            </span>
          )}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
            aria-label="Start new research"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New Research</span>
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
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/10 blur-[60px] rounded-full pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#090710] to-[#120a1f] border border-purple-500/20 flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10">
                  <Compass size={28} className="text-purple-400" />
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-3">Deep Research</h1>
                <p className="text-purple-400/60 text-sm md:text-base max-w-md mx-auto font-light">
                  Evidence-first answers with precise source attribution and conflict detection.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl mx-auto"
              >
                {[
                  { icon: Microscope, title: 'Quantum breakthroughs', desc: 'Latest advancements in computing', color: 'text-purple-400' },
                  { icon: BookOpen, title: 'AI Regulation', desc: 'Current state of AI laws in the EU', color: 'text-blue-400' },
                  { icon: Database, title: 'Microservices', desc: 'REST vs GraphQL vs gRPC', color: 'text-emerald-400' },
                  { icon: Zap, title: 'Climate Data', desc: 'Consensus on tipping points', color: 'text-amber-400' }
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(`Tell me about: ${action.title}`)}
                    className="group flex flex-col items-start p-4 md:p-5 rounded-2xl bg-purple-900/5 hover:bg-purple-900/20 border border-purple-500/10 hover:border-purple-500/30 transition-all duration-300 text-left hover:-translate-y-0.5 hover:shadow-lg w-full"
                  >
                    <action.icon size={18} className={`${action.color} mb-3 group-hover:scale-110 transition-transform`} />
                    <span className="text-white/90 font-medium text-sm md:text-base mb-1">{action.title}</span>
                    <span className="text-white/40 text-xs md:text-sm">{action.desc}</span>
                  </button>
                ))}
              </motion.div>
            </div>
            <div className="flex-1" />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 pb-36">
            {messages.map((msg, i) => (
              <ResearchMessage key={msg.id || i} msg={msg} allSources={activeSources} />
            ))}
            {error && (
              <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <AgentInput
        agentType="RESEARCH"
        input={input}
        setInput={setInput}
        submit={submit}
        isLoading={isLoading}
        handleStop={handleStop}
      />
    </div>
  );
};

export default ResearcherMode;

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion } from 'framer-motion';
import {
  Calendar, User, RefreshCw, GitMerge, Rocket, Layers, Smartphone,
  ChevronDown, ChevronRight as ChevronRightIcon, Flag, AlertTriangle, CheckCircle2, Copy, Check, Plus
} from 'lucide-react';
import { useAgentStream } from '../../hooks/useAgentStream';
import CodeBlock from '../chat/CodeBlock';
import AgentInput from '../chat/AgentInput';
import SourceRoutingTags from '../chat/SourceRoutingTags';
import { AGENT_CONFIG } from '../../config/agentConfig';

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
    return <a href={safe} target="_blank" rel="noopener noreferrer" className="text-rose-400 hover:text-rose-300 underline underline-offset-2" {...props}>{children}</a>;
  },
  table({ node, children, ...props }) {
    return (
      <div className="w-full overflow-x-auto my-4 rounded-lg border border-white/10">
        <table className="w-full text-sm text-left" {...props}>{children}</table>
      </div>
    );
  },
  // Style H2 headings as stage headers
  h2({ children }) {
    const text = String(children);
    const isStage = /^stage\s+\d+/i.test(text);
    return (
      <h2 className={`text-sm font-bold tracking-wide mt-6 mb-2 flex items-center gap-2 ${isStage ? 'text-rose-400' : 'text-white/70'
        }`}>
        {isStage && <Flag size={12} className="text-rose-400/70" />}
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return <h3 className="text-xs font-bold tracking-widest uppercase text-white/40 mt-4 mb-1">{children}</h3>;
  },
  li({ children, ...props }) {
    const text = String(children);
    const isDone = /^done when/i.test(text) || /^✓/.test(text);
    const isRisk = /^risk/i.test(text);
    return (
      <li className={`flex items-start gap-2 text-sm mb-1 ${isDone ? 'text-emerald-400/80' : isRisk ? 'text-amber-400/80' : 'text-white/75'
        }`} {...props}>
        {isDone && <CheckCircle2 size={12} className="mt-1 shrink-0 text-emerald-400" />}
        {isRisk && <AlertTriangle size={12} className="mt-1 shrink-0 text-amber-400" />}
        {!isDone && !isRisk && <ChevronRightIcon size={12} className="mt-1 shrink-0 text-white/25" />}
        <span>{children}</span>
      </li>
    );
  }
};

const PlanMessage = React.memo(({ msg }) => {
  const [copied, setCopied] = useState(false);
  const isUser = msg.sender === 'USER';
  const hasRisk = msg.content?.toLowerCase().includes('risk');
  const config = AGENT_CONFIG.PLAN;

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const content = msg.content;

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} group`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${isUser
          ? 'bg-white/10 border-white/10 text-white'
          : 'border-rose-500/20 text-rose-400'
        }`} style={!isUser ? { backgroundColor: config.bg, color: config.color } : {}}>
        {isUser ? <div className="text-xs font-medium">U</div> : <config.icon size={16} />}
      </div>

      <div className={`flex-1 overflow-hidden ${isUser ? 'flex flex-col items-end' : ''}`}>
        {!isUser && msg.metadata && <SourceRoutingTags flags={msg.metadata} />}

        {/* Risk flag banner */}
        {!isUser && hasRisk && !msg.streaming && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs w-full">
            <Flag size={11} className="shrink-0" />
            <span>Plan contains risks — review flagged items carefully.</span>
          </div>
        )}

        <div className={`px-5 py-4 ${
          isUser 
            ? 'inline-block bg-[#1A1A1C] border border-white/10 text-white/90 rounded-2xl rounded-tr-sm' 
            : 'w-full text-white/85'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : msg.streaming && !msg.content ? (
            <div className="flex items-center gap-2 text-white/30">
              <RefreshCw size={13} className="animate-spin" />
              <span className="text-xs">Building plan…</span>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none
              prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent
              prose-ul:space-y-1 prose-li:marker:hidden
              prose-headings:tracking-tight prose-strong:text-white">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {content}
              </ReactMarkdown>
              {msg.streaming && <span className="stream-cursor" style={{ color: config.color }} />}
            </div>
          )}
        </div>

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
    prevProps.msg.streaming === nextProps.msg.streaming
  );
});

const STARTERS = [
  'Plan the MVP launch for a SaaS product',
  'Create a 6-week learning plan for machine learning',
  'Plan a full migration from REST to GraphQL',
  'Break down building a mobile app from idea to App Store',
];

const PlannerMode = ({ activeConversation, setActiveConversation, fetchConversations, onConversationCreated }) => {
  const {
    messages, isLoading, error,
    handleSend, handleStop, handleNewChat, syncConversation
  } = useAgentStream('PLAN', activeConversation, setActiveConversation, fetchConversations, onConversationCreated);

  const [input, setInput] = useState('');
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { syncConversation(activeConversation); }, [activeConversation?.id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
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
    <div className="flex flex-col h-full bg-[#0c0709] text-white font-sans relative">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-rose-500/10 flex items-center justify-between px-4 sm:px-6 bg-[#0c0709]/70 backdrop-blur-xl z-30 sticky top-0">
        <div className="flex items-center gap-2.5">
          <Calendar size={15} className="text-rose-400" />
          <span className="text-xs font-bold tracking-widest text-rose-400/80 uppercase">Planner</span>
          <span className="w-1 h-1 rounded-full bg-rose-500/30 mx-1 hidden sm:block" />
          <span className="text-[10px] text-white/20 tracking-widest hidden sm:block">STAGE · STEPS · RISK · DONE WHEN</span>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-[11px] text-rose-400/50">
              <RefreshCw size={11} className="animate-spin" /> Planning…
            </span>
          )}
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-rose-500/20 text-white/40 hover:text-white/80 transition-all"
          >
            <Plus size={11} /> New Plan
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-6 relative">
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
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/10 blur-[60px] rounded-full pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0c0709] to-[#1a0a0f] border border-rose-500/20 flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10">
                  <Calendar size={28} className="text-rose-400" />
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-3">Strategic Planner</h1>
                <p className="text-rose-400/60 text-sm md:text-base max-w-md mx-auto font-light">
                  Actionable stages, step-by-step breakdown, and risk detection.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl mx-auto"
              >
                {[
                  { icon: Rocket, title: 'Product Launch', desc: 'Plan an MVP launch strategy', color: 'text-rose-400' },
                  { icon: Layers, title: 'Learning Path', desc: '6-week roadmap for ML', color: 'text-blue-400' },
                  { icon: GitMerge, title: 'System Migration', desc: 'Migrate REST to GraphQL', color: 'text-emerald-400' },
                  { icon: Smartphone, title: 'Mobile App', desc: 'Idea to App Store breakdown', color: 'text-amber-400' }
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(`Create a plan for: ${action.title}`)}
                    className="group flex flex-col items-start p-4 md:p-5 rounded-2xl bg-rose-900/5 hover:bg-rose-900/20 border border-rose-500/10 hover:border-rose-500/30 transition-all duration-300 text-left hover:-translate-y-0.5 hover:shadow-lg w-full"
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
            {messages.map((msg, i) => <PlanMessage key={msg.id || i} msg={msg} />)}
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
        agentType="PLAN"
        input={input}
        setInput={setInput}
        submit={submit}
        isLoading={isLoading}
        handleStop={handleStop}
      />
    </div>
  );
};

export default PlannerMode;

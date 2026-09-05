import React, { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, User, RefreshCw, GitMerge, Rocket, Layers, Smartphone,
  ChevronDown, ChevronRight, Flag, AlertTriangle, CheckCircle2, Copy, Check, Plus,
  Clock, Target, Box, ShieldAlert, Sparkles, CheckSquare, Square, Menu
} from 'lucide-react';
import { useAgentStream } from '../../hooks/useAgentStream';
import CodeBlock from '../chat/CodeBlock';
import AgentInput from '../chat/AgentInput';
import SourceRoutingTags from '../chat/SourceRoutingTags';
import StreamingStatus from '../chat/StreamingStatus';
import UserMessageAttachments from '../chat/UserMessageAttachments';
import { AGENT_CONFIG } from '../../config/agentConfig';
import { copyToClipboard } from '../../utils/clipboard';

// Custom Markdown Component Factory for Planner UI
const createPlanMarkdownComponents = (checkedItems, toggleItem) => ({
  p({ node, children, ...props }) {
    return <div className="mb-3 last:mb-0 leading-relaxed text-zinc-200 text-[14px]">{children}</div>;
  },
  code({ node, inline, className, children, ...props }) {
    return <CodeBlock inline={inline} className={className} {...props}>{children}</CodeBlock>;
  },
  pre({ children }) {
    return <>{children}</>;
  },
  hr() {
    return <div className="h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent my-6" />;
  },
  h1({ children }) {
    return (
      <div className="my-5 p-4 rounded-xl bg-gradient-to-r from-rose-500/15 via-rose-900/10 to-transparent border border-rose-500/30 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
          <Target size={18} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight">{children}</h1>
          <span className="text-[11px] text-rose-300/60 font-medium">Strategic Execution Plan</span>
        </div>
      </div>
    );
  },
  h2({ children }) {
    const rawText = String(children);
    // Detect Phase or Stage headers e.g. "Phase 1: Discovery (Duration: 1-3 Weeks)"
    const phaseMatch = rawText.match(/^(?:Phase|Stage)\s*(\d+)[:\s-]*(.*)/i);
    const durationMatch = rawText.match(/\((?:Duration|Timeframe|Est\.?):?\s*([^)]+)\)/i);
    
    if (phaseMatch) {
      const phaseNum = phaseMatch[1];
      let phaseTitle = phaseMatch[2] || '';
      if (durationMatch) {
        phaseTitle = phaseTitle.replace(durationMatch[0], '').trim();
      }
      const duration = durationMatch ? durationMatch[1] : null;

      return (
        <div className="mt-8 mb-4 p-3.5 rounded-xl bg-[#140b10] border border-rose-500/20 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold tracking-wider uppercase">
                Phase {phaseNum}
              </span>
              <h2 className="text-[14px] font-semibold text-white tracking-tight">
                {phaseTitle || children}
              </h2>
            </div>
            {duration && (
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-white/5 border border-white/5 px-2.5 py-0.5 rounded-full">
                <Clock size={11} className="text-rose-400" />
                {duration}
              </span>
            )}
          </div>
        </div>
      );
    }

    return (
      <h2 className="text-[14px] font-semibold tracking-tight text-white/90 mt-6 mb-3 flex items-center gap-2 pb-1.5 border-b border-white/5">
        <Sparkles size={13} className="text-rose-400/80" />
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="text-[13px] font-semibold tracking-wide text-rose-200/90 mt-4 mb-2 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {children}
      </h3>
    );
  },
  ul({ children }) {
    return <ul className="space-y-2 my-2">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="space-y-2 my-2 list-decimal list-inside text-zinc-300 text-sm">{children}</ol>;
  },
  li({ node, children, ...props }) {
    // Check if the item contains Deliverable, Risk, or Metric keywords
    const textContent = React.Children.toArray(children).map(c => typeof c === 'string' ? c : '').join('');
    
    // Check for Deliverable
    if (textContent.includes('Deliverable:')) {
      return (
        <li className="list-none my-2 p-2.5 rounded-xl bg-blue-500/[0.08] border border-blue-500/20 flex items-start gap-2.5 text-[13px] text-blue-100/90">
          <Box size={14} className="text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1">{children}</div>
        </li>
      );
    }

    // Check for Risk
    if (textContent.includes('Risk') || textContent.includes('Mitigation')) {
      return (
        <li className="list-none my-2 p-2.5 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 flex items-start gap-2.5 text-[13px] text-amber-100/90">
          <ShieldAlert size={14} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">{children}</div>
        </li>
      );
    }

    // Check for KPI / Success Metric
    if (textContent.includes('Success Criteria') || textContent.includes('KPI') || textContent.includes('Success Metric')) {
      return (
        <li className="list-none my-2 p-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 flex items-start gap-2.5 text-[13px] text-emerald-100/90">
          <Target size={14} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">{children}</div>
        </li>
      );
    }

    // Default checklist/task item
    const itemKey = textContent.slice(0, 40);
    const isChecked = Boolean(checkedItems[itemKey]);

    return (
      <li 
        onClick={() => toggleItem(itemKey)}
        className={`list-none flex items-start gap-2.5 text-[13.5px] p-1.5 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer select-none ${
          isChecked ? 'line-through text-zinc-500' : 'text-zinc-300'
        }`} 
        {...props}
      >
        <button 
          type="button"
          className="mt-0.5 shrink-0 text-zinc-500 hover:text-rose-400 transition-colors"
        >
          {isChecked ? (
            <CheckCircle2 size={14} className="text-emerald-400" />
          ) : (
            <div className="w-3.5 h-3.5 rounded border border-zinc-600 hover:border-rose-400 transition-colors" />
          )}
        </button>
        <span className="flex-1 leading-relaxed">{children}</span>
      </li>
    );
  },
  table({ node, children, ...props }) {
    return (
      <div className="w-full overflow-x-auto my-4 rounded-xl border border-white/10 bg-[#12080d]">
        <table className="w-full text-xs text-left border-collapse" {...props}>{children}</table>
      </div>
    );
  },
  thead({ node, children, ...props }) {
    return <thead className="bg-rose-500/10 border-b border-rose-500/20 text-rose-200 font-semibold" {...props}>{children}</thead>;
  },
  th({ node, children, ...props }) {
    return <th className="px-3.5 py-2.5 text-[11px] font-mono uppercase tracking-wider text-rose-300/80" {...props}>{children}</th>;
  },
  td({ node, children, ...props }) {
    return <td className="px-3.5 py-2.5 border-t border-white/5 text-zinc-300 align-top leading-relaxed" {...props}>{children}</td>;
  },
  a({ node, href, children, ...props }) {
    const safe = href?.startsWith('javascript:') ? '#' : href;
    return <a href={safe} target="_blank" rel="noopener noreferrer" className="text-rose-400 hover:text-rose-300 underline underline-offset-2" {...props}>{children}</a>;
  }
});

const PlanMessage = React.memo(({ msg }) => {
  const [copied, setCopied] = useState(false);
  const [checkedItems, setCheckedItems] = useState({});
  const isUser = msg.sender === 'USER';
  const hasRisk = msg.content?.toLowerCase().includes('risk');
  const config = AGENT_CONFIG.PLAN;

  const toggleItem = (key) => {
    if (!key) return;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCopy = () => {
    copyToClipboard(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const content = msg.content;
  const markdownComponents = useMemo(() => createPlanMarkdownComponents(checkedItems, toggleItem), [checkedItems]);

  // Calculate task counts if any
  const totalTasks = Object.keys(checkedItems).length;
  const completedTasks = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''} group`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
        isUser
          ? 'bg-white/10 border-white/10 text-white'
          : 'border-rose-500/20 text-rose-400'
      }`} style={!isUser ? { backgroundColor: config.bg, color: config.color } : {}}>
        {isUser ? <div className="text-xs font-medium">U</div> : <config.icon size={16} />}
      </div>

      <div className={`flex-1 overflow-hidden ${isUser ? 'flex flex-col items-end' : ''}`}>
        {!isUser && msg.metadata && <SourceRoutingTags flags={msg.metadata} />}

        {/* Plan Header Bar with Task Tracker */}
        {!isUser && !msg.streaming && msg.content && totalTasks > 0 && (
          <div className="flex items-center justify-between px-3.5 py-2 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
            <span className="text-rose-300 font-medium flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-rose-400" />
              Plan Checklist Progress: {completedTasks} of {totalTasks} tasks completed
            </span>
            <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div 
                className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className={`px-5 py-4 ${
          isUser 
            ? 'inline-block bg-[#1A1A1C] border border-white/10 text-white/90 rounded-2xl rounded-tr-sm' 
            : 'w-full text-white/85 bg-[#0f080c]/60 border border-rose-500/15 rounded-2xl shadow-xl'
        }`}>
          {isUser ? (
            <UserMessageAttachments message={msg} />
          ) : msg.streaming && !msg.content ? (
            <StreamingStatus metadata={msg.metadata} mode="PLAN" />
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
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 hover:border-white/15 text-white/40 hover:text-white text-xs cursor-pointer select-none"
            >
              {copied ? <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied Plan</span></> : <><Copy size={11} /><span>Copy Plan</span></>}
            </button>
          </div>
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
    prevProps.msg.metadata === nextProps.msg.metadata &&
    prevProps.msg.activities?.length === nextProps.msg.activities?.length &&
    prevProps.msg.images?.length === nextProps.msg.images?.length &&
    prevProps.msg.attachments?.length === nextProps.msg.attachments?.length
  );
});

const PlannerMode = ({ activeConversation, setActiveConversation, fetchConversations, onConversationCreated, onOpenSidebar }) => {
  const {
    messages, isLoading, error,
    handleSend, handleStop, handleNewChat, syncConversation
  } = useAgentStream('PLAN', activeConversation, setActiveConversation, fetchConversations, onConversationCreated);

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
    <div className="flex flex-col h-full bg-[#0c0709] text-white font-sans relative">
      {/* Header */}
      <header className="h-14 shrink-0 border-b border-rose-500/10 flex items-center justify-between px-3 sm:px-6 bg-[#0c0709]/80 backdrop-blur-xl z-30 sticky top-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-rose-400" />
            <span className="text-xs sm:text-sm font-semibold text-rose-200 tracking-wide">Planner</span>
          </div>
          {isLoading && (
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-rose-400/70 ml-1">
              <RefreshCw size={11} className="animate-spin" /> Planning…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
            aria-label="Start new plan"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New Plan</span>
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
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/10 blur-[60px] rounded-full pointer-events-none" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0c0709] to-[#1a0a0f] border border-rose-500/20 flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10">
                  <Calendar size={28} className="text-rose-400" />
                </div>
                <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-3">Strategic Planner</h1>
                <p className="text-rose-400/60 text-sm md:text-base max-w-md mx-auto font-light">
                  Phased roadmaps, interactive checklists, deliverables, and risk mitigation.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl mx-auto"
              >
                {[
                  { icon: Rocket, title: 'Product Launch', desc: 'Plan an MVP launch strategy with milestones', color: 'text-rose-400' },
                  { icon: Layers, title: 'Learning Roadmap', desc: '6-week structured roadmap for AI engineering', color: 'text-blue-400' },
                  { icon: GitMerge, title: 'System Migration', desc: 'Step-by-step zero-downtime migration plan', color: 'text-emerald-400' },
                  { icon: Smartphone, title: 'Mobile App Delivery', desc: 'From architecture design to App Store release', color: 'text-amber-400' }
                ].map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(`Create a phased plan for: ${action.title}`)}
                    className="group flex flex-col items-start p-4 md:p-5 rounded-2xl bg-rose-900/5 hover:bg-rose-900/20 border border-rose-500/10 hover:border-rose-500/30 transition-all duration-300 text-left hover:-translate-y-0.5 hover:shadow-lg w-full cursor-pointer"
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

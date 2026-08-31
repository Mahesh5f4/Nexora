import React, { useEffect, useRef, useState } from 'react';
import AnalyzeLanding from './AnalyzeLanding';
import AnalyzeMessage from './AnalyzeMessage';
import AnalyzeEvidencePanel from './AnalyzeEvidencePanel';
import AgentInput from '../chat/AgentInput';
import { Loader2, AlertCircle, Plus, FileSearch, Menu } from 'lucide-react';
import { useAgentStream } from '../../hooks/useAgentStream';

const AnalyzeMode = ({ activeConversation, setActiveConversation, fetchConversations, onConversationCreated, onOpenSidebar }) => {
  const {
    messages, isLoading, error, activeSources,
    handleSend: streamSend, handleStop, handleNewChat: handleNewAnalysis, syncConversation
  } = useAgentStream('ANALYZE', activeConversation, setActiveConversation, fetchConversations, onConversationCreated);

  const [input, setInput] = useState('');

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => { syncConversation(activeConversation); }, [activeConversation?.id]);

  useEffect(() => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages, shouldAutoScroll]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShouldAutoScroll(Math.abs(scrollHeight - scrollTop - clientHeight) < 50);
  };

  const submit = (content, options) => {
    const text = content || input;
    if (!text.trim() || isLoading) return;
    
    // Prepend "Analyze:" if user hasn't done so
    const hasKeyword = /\b(analyze|evaluate|diagnose|interpret|deep dive|root cause|pros and cons|strengths and weaknesses|compare|review)\b/i.test(text);
    streamSend(hasKeyword ? text : `Analyze: ${text}`, options);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#140a00] text-white font-sans relative">
      {/* Top Bar */}
      <header className="h-14 border-b border-amber-500/10 flex items-center justify-between px-3 sm:px-6 bg-[#140a00]/80 backdrop-blur-xl shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSidebar}
            className="md:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
            aria-label="Open sidebar menu"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <FileSearch size={16} className="text-amber-400" />
            <span className="text-xs sm:text-sm font-semibold text-amber-200 tracking-wide">Analyze</span>
          </div>
          {isLoading && (
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-amber-400/70 ml-1">
              <Loader2 size={11} className="animate-spin" /> Analyzing…
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleNewAnalysis}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
            aria-label="Start new analysis"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">New Analysis</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Messages Column */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8 py-6 pb-36 sm:pb-40 scroll-smooth"
          >
            {messages.length === 0 ? (
              <AnalyzeLanding onExampleClick={(content) => setInput(content)} />
            ) : (
              <div className="max-w-3xl mx-auto space-y-8">
                {messages.map((msg, idx) => (
                  <AnalyzeMessage key={msg.id || idx} message={msg} />
                ))}
                {error && (
                  <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 font-sans flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <AgentInput
            agentType="ANALYZE"
            input={input}
            setInput={setInput}
            submit={submit}
            isLoading={isLoading}
            handleStop={handleStop}
          />
        </div>
      </div>
    </div>
  );
};

export default AnalyzeMode;

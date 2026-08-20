import React, { useEffect, useRef, useState } from 'react';
import AnalyzeLanding from './AnalyzeLanding';
import AnalyzeMessage from './AnalyzeMessage';
import AnalyzeEvidencePanel from './AnalyzeEvidencePanel';
import AgentInput from '../chat/AgentInput';
import { Loader2, AlertCircle, Plus } from 'lucide-react';
import { useAgentStream } from '../../hooks/useAgentStream';

const AnalyzeMode = ({ activeConversation, setActiveConversation, fetchConversations, onConversationCreated }) => {
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

  const scrollToBottom = () => {
    setShouldAutoScroll(true);
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const submit = (content, options) => {
    const text = content || input;
    if (!text.trim() || isLoading) return;
    
    // Optionally prepend "Analyze:" if user hasn't done so
    const hasKeyword = /\b(analyze|evaluate|diagnose|interpret|deep dive|root cause|pros and cons|strengths and weaknesses|compare|review)\b/i.test(text);
    streamSend(hasKeyword ? text : `Analyze: ${text}`, options);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#140a00] text-white font-sans relative">
      {/* Top Bar */}
      <header className="h-14 border-b border-amber-500/10 flex items-center justify-between px-4 sm:px-6 bg-[#140a00]/70 backdrop-blur-xl shrink-0 z-30 sticky top-0">
        <div className="flex items-center space-x-3">
          <span className="text-amber-400 font-bold tracking-widest text-xs uppercase">Analyze Mode</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-white/60">
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin text-amber-400" /><span>Analyzing…</span></>
            ) : error ? (
              <><AlertCircle className="w-4 h-4 text-rose-400" /><span className="text-rose-400">Error</span></>
            ) : (
              <><div className="w-2 h-2 rounded-full bg-amber-400" /><span>Ready</span></>
            )}
          </div>
          <button
            onClick={handleNewAnalysis}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-amber-500/20 text-white/40 hover:text-white/80 transition-all text-[11px]"
          >
            <Plus className="w-3.5 h-3.5" /><span>New Analysis</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 relative">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-12 scroll-smooth"
          >
            {messages.length === 0 ? (
              <AnalyzeLanding onExampleClick={(content) => setInput(content)} />
            ) : (
              <div className="max-w-4xl mx-auto space-y-8 pb-32">
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

          {!shouldAutoScroll && messages.length > 0 && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-[#1A1A1A] border border-white/10 text-white/80 px-4 py-2 rounded-full text-sm shadow-xl flex items-center space-x-2 hover:bg-[#222] transition-colors z-10"
            >
              <span>↓ New content</span>
            </button>
          )}

          <AgentInput
            agentType="ANALYZE"
            input={input}
            setInput={setInput}
            submit={submit}
            isLoading={isLoading}
            handleStop={handleStop}
          />
        </div>

        {/* Right Column — Evidence Panel */}
        {activeSources && activeSources.length > 0 && (
          <div className="w-96 hidden lg:flex flex-col shrink-0 bg-[#140a00] border-l border-white/5">
            <AnalyzeEvidencePanel evidence={activeSources} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyzeMode;

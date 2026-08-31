import React, { useState, useEffect, useRef } from 'react';
import { 
  Brain, ChevronDown, ChevronUp, Sparkles, Check, 
  Loader2, XCircle, Search, Compass, RefreshCw, Layers, Database, Globe, FileText
} from 'lucide-react';

const STAGE_ICONS = {
  understanding: Compass,
  planning: Layers,
  retrieval: Search,
  web_search: Globe,
  evidence_evaluation: Brain,
  query_refinement: RefreshCw,
  generation: Sparkles,
  completion: Check,
};

const ReasoningActivityPanel = ({ activities = [], thinking = '', isStreaming = false, hasContent = false }) => {
  // Start open by default while thinking/streaming
  const [isOpen, setIsOpen] = useState(true);
  const [userToggled, setUserToggled] = useState(false);
  const [activeTab, setActiveTab] = useState('activity'); // 'activity' | 'thinking'
  const [seconds, setSeconds] = useState(1);
  const timerRef = useRef(null);

  const hasActivities = Boolean(activities && activities.length > 0);
  const hasThinking = Boolean(thinking && thinking.trim().length > 0);

  // Live timer while streaming
  useEffect(() => {
    if (isStreaming) {
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setSeconds(Math.max(1, Math.round((Date.now() - start) / 1000)));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStreaming]);

  // Auto-collapse when answer content arrives (only if user hasn't manually opened/closed it)
  useEffect(() => {
    if (hasContent && !userToggled) {
      setIsOpen(false);
    } else if (!hasContent && isStreaming && !userToggled) {
      setIsOpen(true);
    }
  }, [hasContent, isStreaming, userToggled]);

  // Switch to thinking tab automatically if thinking arrives and no activities
  useEffect(() => {
    if (hasThinking && !hasActivities) {
      setActiveTab('thinking');
    }
  }, [hasThinking, hasActivities]);

  // If not streaming, no activities, and no thinking, do NOT render anything
  if (!isStreaming && !hasActivities && !hasThinking) return null;

  const completedCount = activities.filter(a => a.status === 'completed').length;
  const runningStep = activities.find(a => a.status === 'running');
  const isStillThinking = isStreaming && !hasContent;

  const handleToggle = (e) => {
    e.stopPropagation();
    setUserToggled(true);
    setIsOpen(prev => !prev);
  };

  return (
    <div className="my-3 border border-purple-500/25 bg-[#121118]/90 hover:bg-[#15131e] rounded-xl overflow-hidden transition-all duration-200 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)] select-none">
      {/* Header Button - ALWAYS clickable at any moment */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors group cursor-pointer"
        aria-expanded={isOpen}
        aria-label="Toggle agent reasoning and activity timeline"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-purple-300 group-hover:text-purple-200 transition-colors">
          {isStillThinking ? (
            <Sparkles size={14} className="animate-spin text-purple-400 shrink-0" />
          ) : (
            <Brain size={14} className="text-purple-400 shrink-0" />
          )}
          <span className="font-semibold tracking-wide">
            {isStillThinking
              ? `Thinking (${seconds}s)...`
              : `Thought for ${seconds}s`}
          </span>
          {!isStillThinking && hasActivities && (
            <span className="text-[11px] text-purple-300/60 font-normal">
              · {completedCount} step{completedCount !== 1 ? 's' : ''} completed
            </span>
          )}
          {isStillThinking && runningStep && (
            <span className="text-[11px] text-purple-300/80 font-normal truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              — {runningStep.title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-purple-300/70 group-hover:text-purple-200 transition-colors shrink-0">
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
            {isOpen ? 'Hide' : 'View process'}
          </span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded Body */}
      {isOpen && (
        <div className="px-4 pb-3.5 pt-1 border-t border-purple-500/15 bg-[#0d0d12]/95 select-text">
          {/* Sub-tabs if both activity steps and provider thinking exist */}
          {hasActivities && hasThinking && (
            <div className="flex items-center gap-2 mb-3 pt-1 border-b border-white/5 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'activity'
                    ? 'bg-purple-500/25 text-purple-200 font-medium border border-purple-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Activity Timeline ({activities.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('thinking')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'thinking'
                    ? 'bg-purple-500/25 text-purple-200 font-medium border border-purple-500/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Model Reasoning
              </button>
            </div>
          )}

          {/* Activity Timeline View */}
          {(!hasThinking || activeTab === 'activity') && (
            <div className="space-y-2 py-1">
              {hasActivities ? (
                activities.map((act, index) => {
                  const IconComponent = STAGE_ICONS[act.stage] || Brain;
                  const isRunning = act.status === 'running';
                  const isFailed = act.status === 'failed';
                  const isCompleted = act.status === 'completed';

                  return (
                    <div key={act.id || index} className="flex items-start gap-2.5 text-xs text-gray-300">
                      <div className="mt-0.5 flex-shrink-0">
                        {isRunning ? (
                          <Loader2 size={13} className="animate-spin text-purple-400" />
                        ) : isFailed ? (
                          <XCircle size={13} className="text-rose-400" />
                        ) : isCompleted ? (
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                            <Check size={10} className="text-emerald-400 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-500 my-1 mx-1" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${isRunning ? 'text-purple-200' : isCompleted ? 'text-gray-200' : 'text-gray-400'}`}>
                            {act.title}
                          </span>
                          {act.description && (
                            <span className="text-[11px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                              {act.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : isStreaming ? (
                <div className="flex items-start gap-2.5 text-xs text-gray-300">
                  <div className="mt-0.5 flex-shrink-0">
                    <Loader2 size={13} className="animate-spin text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-purple-200">
                      Understanding request and analyzing context...
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Provider Reasoning View */}
          {(activeTab === 'thinking' || !hasActivities) && hasThinking && (
            <div className="py-1">
              <div className="border-l-2 border-purple-500/30 pl-3 my-1 text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto custom-scrollbar select-text">
                {thinking}
                {isStreaming && (
                  <span className="inline-block w-[2px] h-[1em] bg-purple-400 animate-pulse ml-1 align-middle" />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReasoningActivityPanel;

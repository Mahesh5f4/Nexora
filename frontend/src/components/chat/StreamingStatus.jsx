import React from 'react';
import { Globe, Sparkles, Database, RefreshCw } from 'lucide-react';

/**
 * StreamingStatus — Dynamic status indicator while waiting for the response.
 * - If the query is routed to Web Search: displays an animated spinning globe and "Searching the web…"
 * - If the query is routed to Knowledge / RAG: displays "Searching knowledge base…"
 * - If the query is routed to LLM direct answer: displays "Thinking…"
 */
const StreamingStatus = ({ metadata, mode = 'GENERAL' }) => {
  const isWeb = Boolean(metadata?.needsWeb || mode === 'RESEARCH' || mode === 'RESEARCHER');
  const isRag = Boolean(metadata?.needsRag || mode === 'KNOWLEDGE');
  const isPlan = mode === 'PLAN' || mode === 'PLANNER';
  const isAnalyze = mode === 'ANALYZE';

  if (isWeb) {
    return (
      <div className="flex items-center gap-2.5 text-xs text-blue-400 py-1 font-medium animate-pulse">
        <Globe size={14} className="animate-spin text-blue-400 shrink-0" style={{ animationDuration: '3s' }} />
        <span>Searching the web…</span>
      </div>
    );
  }

  if (isRag) {
    return (
      <div className="flex items-center gap-2.5 text-xs text-emerald-400 py-1 font-medium animate-pulse">
        <Database size={14} className="animate-pulse text-emerald-400 shrink-0" />
        <span>Searching knowledge base…</span>
      </div>
    );
  }

  if (isPlan) {
    return (
      <div className="flex items-center gap-2.5 text-xs text-rose-400 py-1 font-medium animate-pulse">
        <RefreshCw size={13} className="animate-spin text-rose-400 shrink-0" />
        <span>Formulating strategic plan…</span>
      </div>
    );
  }

  if (isAnalyze) {
    return (
      <div className="flex items-center gap-2.5 text-xs text-amber-400 py-1 font-medium animate-pulse">
        <Sparkles size={13} className="animate-pulse text-amber-400 shrink-0" />
        <span>Synthesizing evidence…</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 py-1 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse shrink-0" />
      <span>Thinking…</span>
    </div>
  );
};

export default StreamingStatus;

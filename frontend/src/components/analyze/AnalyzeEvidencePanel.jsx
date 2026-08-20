import React from 'react';
import { FileText, Database, ShieldAlert, Link as LinkIcon, AlertTriangle } from 'lucide-react';

const AnalyzeEvidencePanel = ({ evidence }) => {
  if (!evidence || evidence.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col h-full border-l border-white/10">
      <div className="p-4 border-b border-white/10 bg-[#0F0F0F] shrink-0">
        <h2 className="font-semibold text-white flex items-center space-x-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Active Evidence</span>
        </h2>
        <p className="text-xs text-white/50 mt-1">
          {evidence.length} sources retrieved for the current analysis.
        </p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {evidence.map((item, idx) => {
          const isContradiction = item.tags && item.tags.includes('CONTRADICTION_CANDIDATE');
          
          return (
            <div 
              key={idx} 
              className={`p-3 rounded-lg border bg-[#111111] transition-all ${isContradiction ? 'border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-white/10'}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  {item.source_type === 'web' ? (
                    <LinkIcon className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-white/90 truncate" title={item.source_name}>
                    {item.source_name || 'Unknown Source'}
                  </span>
                </div>
                {item.relevance_score && (
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-1.5 rounded">
                    {(item.relevance_score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              
              <div className="text-xs text-white/60 leading-relaxed max-h-32 overflow-y-auto bg-black/20 rounded p-2 border border-white/5 font-serif italic">
                "{item.content}"
              </div>
              
              {isContradiction && (
                <div className="mt-3 flex items-start space-x-1.5 text-xs text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Flagged as potential contradiction to other sources.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AnalyzeEvidencePanel;

import React from 'react';
import { Zap, Sparkles } from 'lucide-react';

const MarqueeBanner = () => {
  const text = "⚡ NOTICE: This application is currently running on free-tier community resources. Quotas & rate limits apply — please don't expect too many responses. Thank you for your understanding! 🚀";

  return (
    <div
      aria-label="Service announcement"
      className="w-full bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/15 border-b border-amber-500/25 text-amber-300 text-xs py-1.5 overflow-hidden select-none z-50 backdrop-blur-md shrink-0 sticky top-0"
    >
      <div className="animate-marquee whitespace-nowrap flex items-center font-medium tracking-wide">
        {/* Sequence A */}
        <div className="flex items-center shrink-0">
          <span className="inline-flex items-center gap-2 px-8">
            <Zap size={13} className="text-amber-400 animate-pulse inline shrink-0" />
            {text}
          </span>
          <span className="inline-flex items-center gap-2 px-8">
            <Sparkles size={13} className="text-amber-400 inline shrink-0" />
            {text}
          </span>
        </div>
        {/* Sequence B (identical duplicate for smooth 50% translation loop) */}
        <div className="flex items-center shrink-0">
          <span className="inline-flex items-center gap-2 px-8">
            <Zap size={13} className="text-amber-400 animate-pulse inline shrink-0" />
            {text}
          </span>
          <span className="inline-flex items-center gap-2 px-8">
            <Sparkles size={13} className="text-amber-400 inline shrink-0" />
            {text}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarqueeBanner;

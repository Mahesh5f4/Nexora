import React from 'react';
import { Zap, AlertCircle, Sparkles } from 'lucide-react';

const MarqueeBanner = () => {
  const message = "⚡ NOTICE: This application is currently running on free-tier resources. Quotas & rate limits apply — please don't expect too many responses. Thank you for your patience and understanding! 🚀";

  return (
    <aside
      aria-label="Service announcement"
      className="w-full bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs py-1.5 overflow-hidden select-none z-50 backdrop-blur-md shrink-0"
    >
      <div className="animate-marquee whitespace-nowrap flex items-center gap-12 font-medium tracking-wide">
        <span className="flex items-center gap-2">
          <Zap size={13} className="text-amber-400 animate-pulse inline shrink-0" />
          {message}
        </span>
        <span className="flex items-center gap-2">
          <Sparkles size={13} className="text-amber-400 inline shrink-0" />
          {message}
        </span>
        <span className="flex items-center gap-2">
          <AlertCircle size={13} className="text-amber-400 inline shrink-0" />
          {message}
        </span>
        <span className="flex items-center gap-2">
          <Zap size={13} className="text-amber-400 animate-pulse inline shrink-0" />
          {message}
        </span>
      </div>
    </aside>
  );
};

export default MarqueeBanner;

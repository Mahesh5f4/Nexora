import React from 'react';
import { motion } from 'framer-motion';
import { Search, GitCompare, FileSearch, ShieldAlert } from 'lucide-react';

const STARTERS = [
  { icon: ShieldAlert, title: 'Analyze Risks', desc: 'Find security and scalability issues', color: 'text-amber-400' },
  { icon: GitCompare, title: 'Find Contradictions', desc: 'Identify conflicting requirements', color: 'text-rose-400' },
  { icon: FileSearch, title: 'Review Weaknesses', desc: 'Critique arguments and logic', color: 'text-purple-400' },
  { icon: Search, title: 'Root Cause', desc: 'Investigate problems via evidence', color: 'text-blue-400' }
];

const AnalyzeLanding = ({ onExampleClick }) => {
  return (
    <div className="min-h-full flex flex-col items-center max-w-4xl mx-auto px-4 w-full pt-10 pb-32 sm:pb-36">
      <div className="flex-1" />
      <div className="w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-10 relative"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/10 blur-[60px] rounded-full pointer-events-none" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#140a00] to-[#1a1005] border border-amber-500/20 flex items-center justify-center mx-auto mb-6 shadow-xl relative z-10">
            <FileSearch size={28} className="text-amber-400" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-3">Deep Analysis</h1>
          <p className="text-amber-400/60 text-sm md:text-base max-w-md mx-auto font-light">
            Turn evidence into understanding with grounded reasoning and critique.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-2xl mx-auto"
        >
          {STARTERS.map((action, i) => (
            <button
              key={i}
              onClick={() => onExampleClick(`Analyze: ${action.title}`)}
              className="group flex flex-col items-start p-4 md:p-5 rounded-2xl bg-amber-900/5 hover:bg-amber-900/20 border border-amber-500/10 hover:border-amber-500/30 transition-all duration-300 text-left hover:-translate-y-0.5 hover:shadow-lg w-full"
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
  );
};

export default AnalyzeLanding;

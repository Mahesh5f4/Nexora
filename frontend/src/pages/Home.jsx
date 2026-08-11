import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Command, ArrowRight, Sparkles, Code2, Network, Workflow } from 'lucide-react';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-6 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center z-10 max-w-4xl w-full"
      >
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-medium text-white/80">
            <Sparkles size={14} className="text-purple-400" />
            <span>ThinkAction Ai is now live</span>
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight leading-[1.1]">
          The intelligence layer <br className="hidden md:block" />
          for <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">your workflow</span>
        </h1>
        
        <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-light">
          Experience a unified workspace combining deep research, code generation, and intelligent planning in one seamless interface.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link 
            to="/workspace"
            className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-medium hover:bg-gray-200 transition-all active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)] w-full sm:w-auto justify-center"
          >
            Launch Workspace <ArrowRight size={18} />
          </Link>
          <Link 
            to="/about"
            className="flex items-center gap-2 bg-white/5 text-white px-8 py-4 rounded-xl font-medium hover:bg-white/10 border border-white/5 transition-all active:scale-95 w-full sm:w-auto justify-center"
          >
            Learn More
          </Link>
        </div>
      </motion.div>

      {/* Feature Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 z-10 max-w-5xl w-full"
      >
        <div className="ai-card p-6 border border-white/5 bg-[#111] rounded-2xl hover:bg-[#151515] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-4">
            <Code2 size={20} />
          </div>
          <h3 className="text-white font-medium mb-2">Code Expertise</h3>
          <p className="text-white/40 text-sm leading-relaxed">
            Architect systems and debug issues with an AI optimized for software engineering and modern stacks.
          </p>
        </div>

        <div className="ai-card p-6 border border-white/5 bg-[#111] rounded-2xl hover:bg-[#151515] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
            <Network size={20} />
          </div>
          <h3 className="text-white font-medium mb-2">Deep Research</h3>
          <p className="text-white/40 text-sm leading-relaxed">
            Synthesize information rapidly across complex domains with precision and contextual awareness.
          </p>
        </div>

        <div className="ai-card p-6 border border-white/5 bg-[#111] rounded-2xl hover:bg-[#151515] transition-colors">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
            <Workflow size={20} />
          </div>
          <h3 className="text-white font-medium mb-2">Strategic Planning</h3>
          <p className="text-white/40 text-sm leading-relaxed">
            Break down ambiguous goals into actionable steps and structured project execution plans.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Home;

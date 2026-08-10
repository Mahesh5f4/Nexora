import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';
import { motion } from 'framer-motion';
import { Search, Sparkles, Code2, BrainCircuit, Lightbulb, FileText, ArrowRight } from 'lucide-react';
import Card from '../../components/ui/Card';

const Dashboard = () => {
  const { user } = useAppSelector(state => state.auth);
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');

  const quickActions = [
    { label: 'Analyze', desc: 'Code & Docs', icon: BrainCircuit, to: '/workspace/analyze', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Generate', desc: 'Content', icon: Sparkles, to: '/workspace/generate', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Research', desc: 'Topics', icon: Search, to: '/workspace/research', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Plan', desc: 'Workflows', icon: Lightbulb, to: '/workspace/plan', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  const handlePromptSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim()) {
      // Logic to route the prompt to the correct agent/page. For now, default to research or chat.
      navigate(`/workspace/generate?q=${encodeURIComponent(prompt)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 font-sans pt-24 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center justify-center min-h-[70vh]">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 w-full"
        >
          <h1 className="text-4xl md:text-6xl font-medium mb-6 tracking-tight bg-gradient-to-br from-white to-white/50 bg-clip-text text-transparent">
            What would you like to build, {user?.name?.split(' ')[0] || 'User'}?
          </h1>
          
          <form onSubmit={handlePromptSubmit} className="relative w-full max-w-3xl mx-auto group">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/30 to-purple-500/30 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative liquid-glass rounded-2xl border border-white/10 p-2 flex items-center shadow-2xl bg-[#111]/80 backdrop-blur-xl transition-all focus-within:border-white/30 focus-within:bg-[#151515]/90">
              <div className="pl-4 text-white/40">
                <Sparkles size={24} />
              </div>
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask ThinkAction AI to research, plan, or write code..."
                className="w-full bg-transparent border-none outline-none px-4 py-4 text-lg text-white placeholder:text-white/30"
              />
              <button 
                type="submit"
                className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </form>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl"
        >
          {quickActions.map((action, i) => (
            <Link key={i} to={action.to}>
              <Card className="p-4 hover:bg-white/10 transition-all border border-white/5 group h-full flex flex-col items-center text-center cursor-pointer liquid-glass">
                <div className={`w-10 h-10 rounded-lg ${action.bg} ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <action.icon size={20} />
                </div>
                <h3 className="font-medium text-sm text-white/90">{action.label}</h3>
                <p className="text-xs text-white/40 mt-1">{action.desc}</p>
              </Card>
            </Link>
          ))}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-3xl mt-20"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-white/50 uppercase tracking-widest">Recent Activity</h2>
          </div>
          <div className="liquid-glass border border-white/5 rounded-2xl p-8 text-center text-white/30 flex flex-col items-center justify-center min-h-[150px]">
            <FileText size={24} className="mb-3 opacity-20" />
            <p>Your recent conversations and generated artifacts will appear here.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;

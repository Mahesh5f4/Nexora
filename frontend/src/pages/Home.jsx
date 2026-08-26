import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Code2, Network, Workflow, MessageSquare, Database, Layers, Play } from 'lucide-react';
import SEO from '../components/SEO';

// --- Components ---

// Spotlight Card for Feature Grid
const SpotlightCard = ({ children, className = "" }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`relative group rounded-2xl border border-white/10 bg-[#0a0a0a] overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(255,255,255,0.06),
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
};

// Animated Rotating Text
const RotatingText = () => {
  const words = ["workflow", "codebase", "research", "planning"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-block relative h-[1.2em] w-[200px] sm:w-[280px] md:w-[350px] overflow-hidden align-bottom">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={words[index]}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute left-0 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

const TypewriterText = ({ text, delay = 0 }) => {
  const words = text.split(" ");
  
  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.03, delayChildren: delay } },
      }}
    >
      {words.map((word, index) => (
        <span key={index} className="inline-block whitespace-pre">
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={charIndex}
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1 }
              }}
            >
              {char}
            </motion.span>
          ))}
          {" "}
        </span>
      ))}
    </motion.span>
  );
};

const AnimatedAppPreview = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const sequence = async () => {
      while (true) {
        setStep(0); // initial empty state
        await new Promise(r => setTimeout(r, 1000));
        setStep(1); // typing prompt (takes ~1.5s)
        await new Promise(r => setTimeout(r, 2000));
        setStep(2); // prompt sent, AI thinking
        await new Promise(r => setTimeout(r, 1000));
        setStep(3); // AI response generated
        await new Promise(r => setTimeout(r, 5000));
        setStep(4); // Resetting...
        await new Promise(r => setTimeout(r, 500));
      }
    };
    sequence();
  }, []);

  return (
    <div className="relative w-full aspect-[4/3] md:aspect-video bg-[#0A0A0A] flex flex-col md:flex-row overflow-hidden font-sans text-xs sm:text-sm group">
      {/* Floating Particles in Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-[10%] left-[10%] w-2 h-2 rounded-full bg-cyan-400 blur-sm animate-[ping_3s_infinite]" />
        <div className="absolute bottom-[20%] right-[20%] w-3 h-3 rounded-full bg-purple-500 blur-[2px] animate-[pulse_4s_infinite]" />
        <div className="absolute top-[50%] right-[33%] w-1.5 h-1.5 rounded-full bg-pink-500 blur-sm animate-[ping_5s_infinite]" />
      </div>

      {/* Sidebar Mockup */}
      <div className="hidden md:flex w-1/3 max-w-[200px] bg-[#111111] border-r border-white/5 flex-col p-4 gap-4 z-10">
        <div className="w-full h-8 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-white/50 gap-2 mb-4 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all">
          <Sparkles size={12} className="animate-pulse text-purple-400" /> New Chat
        </div>
        <div className="space-y-3">
          <div className="w-full h-4 bg-white/10 rounded" />
          <div className="w-3/4 h-4 bg-white/5 rounded" />
          <div className="w-5/6 h-4 bg-white/5 rounded" />
          <div className="w-1/2 h-4 bg-white/5 rounded" />
        </div>
      </div>

      {/* Main Chat Area Mockup */}
      <div className="flex-1 flex flex-col p-2 sm:p-4 relative z-10">
        
        {/* Simulated Mouse Cursor */}
        <motion.div 
          initial={{ opacity: 0, x: 0, y: 150 }}
          animate={{ 
            opacity: step === 1 ? [0, 1, 1, 0] : 0, 
            x: step === 1 ? [0, 20, 100, 100] : 0, 
            y: step === 1 ? [150, 100, 20, 20] : 150,
            scale: step === 1 ? [1, 1, 0.8, 1] : 1 // "Click" effect
          }}
          transition={{ duration: 2, times: [0, 0.2, 0.8, 1] }}
          className="absolute z-50 pointer-events-none hidden sm:block"
          style={{ bottom: '10%', right: '10%' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg fill-black/50">
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
          </svg>
        </motion.div>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          
          <AnimatePresence>
            {step >= 2 && step < 4 && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="self-end max-w-[80%] bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl rounded-tr-sm p-3 text-white/90 shadow-[0_5px_15px_rgba(99,102,241,0.1)]"
              >
                Help me plan a new software project
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {step >= 3 && step < 4 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                className="flex gap-3 max-w-[95%]"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 p-[1px] shrink-0 shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  <div className="w-full h-full bg-[#0A0A0A] rounded-xl flex items-center justify-center text-white">
                    <Sparkles size={14} />
                  </div>
                </div>
                <div className="flex-1 bg-[#111111]/80 backdrop-blur-md border border-white/10 rounded-2xl rounded-tl-sm p-4 space-y-3 shadow-xl">
                  <p className="text-white/80 leading-relaxed font-light">
                    <TypewriterText text="I can help you plan your project. Here is a high-level architecture blueprint:" />
                  </p>
                  
                  {/* Code block mockup */}
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ delay: 2.5, duration: 0.5 }}
                    className="mt-4 border border-white/10 rounded-lg overflow-hidden bg-[#050505] shadow-inner"
                  >
                    <div className="h-6 border-b border-white/10 bg-white/5 flex items-center px-3 gap-1.5">
                       <div className="w-2 h-2 rounded-full bg-red-500/40" />
                       <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                       <div className="w-2 h-2 rounded-full bg-green-500/40" />
                    </div>
                    <div className="p-3 font-mono text-[10px] sm:text-xs leading-relaxed tracking-wider">
                       <div><span className="text-pink-400">const</span> <span className="text-blue-300">architecture</span> <span className="text-pink-400">=</span> {'{'}</div>
                       <div className="ml-4"><span className="text-white/70">frontend:</span> <span className="text-green-300">'React + TailwindCSS'</span>,</div>
                       <div className="ml-4"><span className="text-white/70">backend:</span> <span className="text-green-300">'Spring Boot API'</span>,</div>
                       <div className="ml-4"><span className="text-white/70">database:</span> <span className="text-green-300">'PostgreSQL'</span></div>
                       <div>{'}'};</div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input area mockup */}
        <div className="h-12 border border-white/10 rounded-xl bg-white/5 flex items-center px-4 shrink-0 mt-4 relative overflow-hidden group-hover:border-white/20 transition-colors">
           <AnimatePresence mode="wait">
             {step === 1 && (
               <motion.span 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="text-white/90 font-medium text-sm inline-flex items-center"
               >
                 <TypewriterText text="Help me plan a new software project" /><span className="w-1.5 h-4 bg-white/70 ml-1 animate-pulse" />
               </motion.span>
             )}
             {(step === 0 || step === 4) && (
               <motion.span 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="text-white/30 font-light"
               >
                 Message ThinkAction AI...
               </motion.span>
             )}
           </AnimatePresence>
           
           {/* Fake send button */}
           <div className={`absolute right-2 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${step === 1 ? 'bg-white text-black' : 'bg-white/5 text-white/20'}`}>
             <ArrowRight size={14} />
           </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Page ---

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen pt-24 px-4 sm:px-6 relative overflow-hidden pb-32">
      <SEO 
        title="ThinkAction AI — Agentic AI Workspace for Research, RAG & Code Intelligence"
        description="ThinkAction AI is an agentic AI workspace combining multi-agent reasoning, iterative evidence evaluation, persistent vector memory, repository intelligence, and enterprise RAG."
        keywords="ThinkAction AI, AI agent, agentic workspace, LangGraph, RAG, vector memory, Qdrant, web research, code intelligence, generative AI"
      />
      
      {/* Animated Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
            x: [0, 50, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.3, 0.15],
            x: [0, -50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px]" 
        />
      </div>

      {/* Hero Section: Split Layout */}
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center mt-8 lg:mt-16 z-10">
        
        {/* Left Side: Context */}
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-start text-left"
        >
          <div className="group flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-md text-xs sm:text-sm font-medium text-white/80 cursor-pointer mb-8">
            <Sparkles size={14} className="text-purple-400 group-hover:animate-pulse" />
            <span>ThinkAction AI is now in early access</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-[1.1]">
            The intelligence layer <br className="hidden sm:block" />
            for your <br className="hidden sm:block" /><RotatingText />
          </h1>
          
          <p className="text-white/50 text-base sm:text-lg max-w-lg mb-10 leading-relaxed font-light">
            Experience a unified workspace combining deep research, precise code generation, and intelligent multi-step planning in one seamless interface. Your workflow, supercharged.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link 
              to="/workspace"
              className="group relative flex items-center gap-2 bg-white text-black px-8 py-4 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto justify-center overflow-hidden shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <Sparkles size={18} className="text-purple-600" />
              Launch Interactive Preview <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <a 
              href="#showcase"
              className="flex items-center gap-2 px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-sm font-medium transition-all w-full sm:w-auto justify-center"
            >
              <Play size={15} className="text-cyan-400" /> Watch Feature Tour
            </a>
          </div>
        </motion.div>

        {/* Right Side: Video Showcase Mockup */}
        <motion.div 
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            x: 0, 
            scale: 1,
            y: [-5, 5, -5]
          }}
          transition={{ 
            opacity: { duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] },
            x: { duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] },
            scale: { duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] },
            y: { duration: 6, repeat: Infinity, ease: "easeInOut" }
          }}
          style={{ willChange: "transform" }}
          className="relative w-full mt-8 lg:mt-0"
        >
          {/* Glassmorphic Frame */}
          <div className="relative rounded-2xl md:rounded-[2rem] border border-white/10 bg-[#111111]/60 backdrop-blur-xl shadow-[0_20px_50px_rgba(168,85,247,0.15)] overflow-hidden transform-gpu" style={{ willChange: "transform" }}>
            
            {/* Mockup Header */}
            <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2 bg-[#0A0A0A]/80">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              <div className="mx-auto text-[10px] uppercase tracking-widest font-bold text-white/30 flex items-center gap-2">
                <Play size={10} className="text-cyan-400" /> Interactive Simulation Preview
              </div>
            </div>

            {/* Simulated App UI Animation */}
            <AnimatedAppPreview />
            
          </div>
          
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/30 to-cyan-500/30 blur-2xl -z-10 rounded-full opacity-50" style={{ willChange: "transform" }} />
        </motion.div>
      </div>

      {/* Interactive Feature Showcase Section */}
      <section id="showcase" className="w-full max-w-7xl mx-auto mt-36 z-10 px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={13} /> Architecture & Capabilities Explorer
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Watch All Features In Action
          </h2>
          <p className="text-white/50 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            Explore how ThinkAction AI orchestrates multi-agent intelligence, vector embeddings, and verification loops with zero rate limit bottlenecks.
          </p>
        </div>

        {/* 5-Persona Interactive Tabs */}
        <div className="rounded-3xl border border-white/10 bg-[#0E0E11]/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left: Persona Descriptions */}
            <div className="lg:col-span-5 space-y-3">
              {[
                { id: 'GENERAL', title: '1. General Agent & Dynamic Tool Routing', desc: 'Auto-detects intent, writes clean full-stack code, and coordinates specialized tools seamlessly.', color: 'border-blue-500/40 bg-blue-500/10 text-blue-400' },
                { id: 'RESEARCH', title: '2. Deep Web Research & Fact Verification', desc: 'Conducts multi-source web evidence retrieval with epistemic badges (Verified, Inference, Uncertain).', color: 'border-purple-500/40 bg-purple-500/10 text-purple-400' },
                { id: 'PLAN', title: '3. Strategic Multi-Stage Planner', desc: 'Breaks complex goals into actionable execution stages with concrete Done-When criteria and risk flags.', color: 'border-rose-500/40 bg-rose-500/10 text-rose-400' },
                { id: 'ANALYZE', title: '4. Deep SWOT & System Analysis', desc: 'Performs comprehensive diagnostic evaluations, architectural tradeoff matrices, and executive summaries.', color: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
                { id: 'KNOWLEDGE', title: '5. Vector Document RAG Engine', desc: 'Indexes PDF/DOCX files into high-dimensional vector embeddings with sub-millisecond similarity retrieval.', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' }
              ].map(item => (
                <div key={item.id} className={`p-4 rounded-2xl border transition-all ${item.color}`}>
                  <h3 className="text-sm font-bold tracking-tight mb-1">{item.title}</h3>
                  <p className="text-white/60 text-xs leading-relaxed">{item.desc}</p>
                </div>
              ))}

              <div className="pt-4">
                <Link
                  to="/workspace"
                  className="flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg hover:shadow-cyan-500/25"
                >
                  <Sparkles size={16} /> Test All Personas in Workspace Preview
                </Link>
              </div>
            </div>

            {/* Right: Interactive Blueprint Card */}
            <div className="lg:col-span-7 rounded-2xl bg-[#070709] border border-white/10 p-6 font-mono text-xs text-white/80 overflow-hidden shadow-inner space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider">System Pipeline Architecture</span>
                </div>
                <span className="text-[10px] text-white/40">Spring Boot 3.4 + LangGraph + Qdrant</span>
              </div>

              <div className="space-y-3 font-sans text-xs text-white/70">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                  <p className="text-white font-semibold text-xs flex items-center gap-2">
                    <span className="text-cyan-400 font-mono">01.</span> Distributed API Gateway
                  </p>
                  <p className="text-white/50 text-[11px]">
                    Spring Cloud Gateway routes requests with token bucket rate limiting and non-blocking WebFlux SSE streaming.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                  <p className="text-white font-semibold text-xs flex items-center gap-2">
                    <span className="text-purple-400 font-mono">02.</span> Self-Correcting Multi-Agent Graph
                  </p>
                  <p className="text-white/50 text-[11px]">
                    Evaluates user query intent, dynamically synthesizes web evidence, and cross-checks claim contradictions in parallel.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1.5">
                  <p className="text-white font-semibold text-xs flex items-center gap-2">
                    <span className="text-emerald-400 font-mono">03.</span> HNSW Vector Memory & RAG Retrieval
                  </p>
                  <p className="text-white/50 text-[11px]">
                    Extracts document embeddings with tenant isolation, performing dense cosine similarity matching with verified citations.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
                <span>⚡ Zero Rate Limits • Local 60fps SSE Simulation Active</span>
                <span className="font-bold text-[10px] uppercase tracking-widest bg-emerald-500/20 px-2 py-0.5 rounded">Ready</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-7xl mx-auto mt-36 z-10 px-4"
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">Supercharge your productivity</h2>
          <p className="text-white/50 text-lg">One unified workspace. Multiple specialized agents.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SpotlightCard className="p-8">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-300">
              <Code2 size={24} />
            </div>
            <h3 className="text-xl text-white font-medium mb-3">Code Expertise</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Architect systems, debug complex issues, and write clean code with an agent optimized for modern software engineering stacks.
            </p>
          </SpotlightCard>

          <SpotlightCard className="p-8">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300">
              <Network size={24} />
            </div>
            <h3 className="text-xl text-white font-medium mb-3">Deep Research</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Synthesize information rapidly across complex domains with precision. The agent actively browses the web to find verified answers.
            </p>
          </SpotlightCard>

          <SpotlightCard className="p-8">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 mb-6 group-hover:scale-110 transition-transform duration-300">
              <Workflow size={24} />
            </div>
            <h3 className="text-xl text-white font-medium mb-3">Strategic Planning</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Break down ambiguous goals into actionable, measurable steps. The Planner agent builds structured execution blueprints for you.
            </p>
          </SpotlightCard>

          <SpotlightCard className="p-8">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform duration-300">
              <Layers size={24} />
            </div>
            <h3 className="text-xl text-white font-medium mb-3">Data Analysis</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Feed in documents and let the Analyze agent extract key findings, highlight contradictions, and deliver a comprehensive report.
            </p>
          </SpotlightCard>

          <SpotlightCard className="p-8">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-300">
              <Database size={24} />
            </div>
            <h3 className="text-xl text-white font-medium mb-3">Personal Memory</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              The AI learns about your preferences, tech stack, and goals over time, maintaining a highly personalized knowledge base.
            </p>
          </SpotlightCard>

          <SpotlightCard className="p-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform duration-300">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-xl text-white font-medium mb-3">Unified Chat</h3>
            <p className="text-white/40 text-sm leading-relaxed">
              Not sure which agent to use? The General agent dynamically routes your requests and calls the right tools automatically.
            </p>
          </SpotlightCard>
        </div>
      </motion.div>
      
    </div>
  );
};

export default Home;

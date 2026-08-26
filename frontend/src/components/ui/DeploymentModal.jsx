import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Sparkles, X, Activity, CheckCircle2 } from 'lucide-react';

const DeploymentModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('thinkaction_deployment_notice_dismissed');
    if (!isDismissed) {
      // Small timeout for smooth initial load transition
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    sessionStorage.setItem('thinkaction_deployment_notice_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
            className="relative w-full max-w-lg bg-[#111113]/95 border border-white/15 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-2xl overflow-hidden z-10"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              aria-label="Close notification"
              className="absolute top-4 right-4 p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all focus:outline-none"
            >
              <X size={18} />
            </button>

            {/* Header Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                Testing & Deployment Mode
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white/5 border border-white/10 text-white/60">
                <Activity size={12} className="text-cyan-400" />
                Live Preview
              </span>
            </div>

            {/* Title & Icon */}
            <div className="flex items-start gap-3.5 mb-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/15 to-white/5 border border-white/10 text-white shadow-inner shrink-0 mt-0.5">
                <Rocket className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Model Evaluation & Feature Showcase
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  AI models under active development & benchmarking.
                </p>
              </div>
            </div>

            {/* Body Description */}
            <p className="text-sm text-white/70 leading-relaxed mb-5 font-normal">
              To prevent backend rate limit exhaustion while we build and benchmark custom model weights, live AI chat is locked into <strong className="text-white">Interactive Feature Preview Mode</strong>. You can test and watch all 5 agent personas (General, Researcher, Planner, Analyze, and Knowledge RAG) with realistic real-time simulation!
            </p>

            {/* Status Checklist / Highlight Box */}
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 mb-6 space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-white/80">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>All 5 agent workflows active for interactive demonstration</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-white/80">
                <Sparkles size={14} className="text-cyan-400 shrink-0" />
                <span>Zero rate limits, zero server errors — frictionless founder tour</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleDismiss}
                className="w-full sm:flex-1 py-2.5 px-4 bg-white text-black font-semibold text-sm rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-lg text-center"
              >
                Launch Interactive Feature Showcase
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DeploymentModal;

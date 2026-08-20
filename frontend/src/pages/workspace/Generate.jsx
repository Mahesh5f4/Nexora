import { useState } from 'react';
import { generateService } from '../../services/api';
import { Loader2, Zap, Copy, Check, ChevronDown, Wand2, FileText, Calendar, DollarSign, Megaphone } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TYPES = [
  { id: 'GENERAL', label: 'General Content', icon: FileText },
  { id: 'SCHEDULE', label: 'Event Schedule', icon: Calendar },
  { id: 'BUDGET', label: 'Budget Plan', icon: DollarSign },
  { id: 'MARKETING', label: 'Marketing Copy', icon: Megaphone }
];

const Generate = () => {
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState(TYPES[0]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const currentSequence = ++requestSequenceRef.current;
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await generateService.generateContent({ prompt, type: type.id });
      if (currentSequence === requestSequenceRef.current) {
        setResult(res.data);
      }
    } catch (err) {
      if (currentSequence === requestSequenceRef.current) {
        if (err.response?.status === 429) {
          setError("Usage limit reached. Please try again after your current session resets.");
        } else if (err.response?.status === 401) {
          setError("Your session has expired. Please log in again.");
        } else if (err.response?.data?.message) {
          setError(err.response.data.message);
        } else {
          setError("An error occurred during generation. Please try again.");
        }
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (result?.content) {
      navigator.clipboard.writeText(result.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 font-sans pt-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
            Content Studio
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            Instantly generate schedules, budgets, marketing copy, and event materials tailored to your needs.
          </p>
        </div>

        {/* Input Form */}
        <div className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl mb-8">
          <form onSubmit={handleGenerate}>
            <div className="flex flex-col md:flex-row gap-4 mb-4 relative z-10">
              
              {/* Type Selector */}
              <div className="relative w-full md:w-64">
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <div className="flex items-center gap-3">
                    <type.icon className="w-5 h-5 text-emerald-400" />
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-white/50 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isMenuOpen && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50">
                    {TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setType(t);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          type.id === t.id ? 'bg-emerald-500/10 text-emerald-400' : 'hover:bg-white/5 text-white/70'
                        }`}
                      >
                        <t.icon className="w-5 h-5" />
                        <span className="font-medium">{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Prompt Input */}
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                placeholder="What would you like me to generate? (e.g., 'Write a promotional email for a tech conference featuring AI startups')"
                rows={5}
                className="w-full bg-black/50 border border-white/10 rounded-2xl p-5 text-lg text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50 transition-all resize-none shadow-inner"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 px-8 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Content
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-16 text-emerald-400/80 animate-pulse">
            <div className="bg-emerald-500/10 p-5 rounded-full mb-4">
              <Zap className="w-8 h-8" />
            </div>
            <p className="text-xl font-medium">Crafting your content...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isGenerating && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center space-x-3">
            <p className="text-lg">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && !isGenerating && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500"></div>
              
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20">
                <div className="flex items-center gap-2 text-white/50">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm font-medium uppercase tracking-wider">Result</span>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-6 md:p-8 prose prose-invert prose-emerald max-w-none prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Generate;

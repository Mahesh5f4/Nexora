import { useState, useRef, useEffect } from 'react';
import { researchService } from '../../services/api';
import { Search, Loader2, Globe, FileText, AlertCircle, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SearchingUI = () => {
  const [loadingText, setLoadingText] = useState('Initiating deep search...');
  
  useEffect(() => {
    const texts = [
      'Searching the web for the latest information...',
      'Analyzing sources and filtering noise...',
      'Synthesizing evidence...',
      'Evaluating findings...',
      'Structuring final response...'
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 mt-16 mb-12 animate-in fade-in duration-700">
      <div className="relative flex items-center justify-center w-32 h-32">
        {/* Floating animated rings */}
        <div className="absolute inset-0 border-2 border-blue-500/30 rounded-full animate-[ping_3s_ease-in-out_infinite]" />
        <div className="absolute inset-4 border-2 border-purple-500/30 rounded-full animate-[ping_2.5s_ease-in-out_infinite_0.5s]" />
        <div className="absolute inset-8 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full animate-pulse blur-xl" />
        
        {/* Center icon */}
        <div className="relative z-10 bg-black/50 p-4 rounded-full border border-white/10 shadow-[0_0_30px_rgba(59,130,246,0.3)] backdrop-blur-sm">
          <Globe className="w-10 h-10 text-blue-400 animate-pulse" />
        </div>

        {/* Orbiting particles */}
        <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
          <div className="absolute -top-2 left-1/2 w-3 h-3 bg-blue-400 rounded-full blur-[2px]" />
        </div>
        <div className="absolute inset-0 animate-[spin_6s_linear_infinite_reverse]">
          <div className="absolute top-1/2 -right-2 w-2 h-2 bg-purple-400 rounded-full blur-[1px]" />
        </div>
      </div>
      <div className="flex flex-col items-center space-y-3">
        <h3 className="text-xl font-medium text-white/90 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
          <span className="animate-pulse">{loadingText}</span>
        </h3>
        <p className="text-sm text-white/40">This may take up to 60 seconds for complex research.</p>
      </div>
    </div>
  );
};

const Research = () => {
  const [query, setQuery] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const requestSequenceRef = useRef(0);

  const handleResearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || isResearching) return;

    const currentSequence = ++requestSequenceRef.current;
    
    setIsResearching(true);
    setError(null);
    setResult(null);

    try {
      const res = await researchService.research({ query });
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
          setError("An error occurred during research. Please try again.");
        }
      }
    } finally {
      if (currentSequence === requestSequenceRef.current) {
        setIsResearching(false);
      }
    }
  };

  const isWebUrl = (url) => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans pt-24 relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-4xl mx-auto flex flex-col items-center relative z-10">
        {/* Header */}
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
          Deep Research
        </h1>
        <p className="text-white/60 mb-10 text-center max-w-xl text-lg">
          Ask a complex question and get an intelligent response backed by real-time web search and your uploaded knowledge base.
        </p>
        
        {/* Search Input */}
        <form onSubmit={handleResearch} className="w-full relative mb-12 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isResearching}
              placeholder="What do you want to research today?"
              className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl py-5 pl-14 pr-16 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 transition-all placeholder:text-white/30 text-white shadow-2xl"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-white/40" />
            <button
              type="submit"
              disabled={!query.trim() || isResearching}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/5"
              aria-label="Submit Research Request"
            >
              {isResearching ? (
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              ) : (
                <Search className="w-5 h-5 text-blue-400" />
              )}
            </button>
          </div>
        </form>

        {/* Loading State */}
        {isResearching && <SearchingUI />}

        {/* Error State */}
        {error && !isResearching && (
          <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center space-x-3 mb-8 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="text-lg">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && !isResearching && (
          <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Sources Pill */}
            {result.sources && result.sources.length > 0 && (
              <details className="group">
                <summary className="flex items-center space-x-2 cursor-pointer list-none bg-white/5 hover:bg-white/10 border border-white/10 w-fit px-4 py-2 rounded-full transition-all duration-300 shadow-lg backdrop-blur-md">
                  <Globe className="w-4 h-4 text-green-400 animate-pulse" />
                  <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                    Searched {result.sources.length} sites
                  </span>
                  <svg className="w-4 h-4 text-white/50 group-open:rotate-180 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-300 opacity-0 group-open:opacity-100">
                  {result.sources.map((source, idx) => {
                    const isWeb = isWebUrl(source.documentId);
                    return (
                      <a 
                        key={idx}
                        href={isWeb ? source.documentId : undefined}
                        target={isWeb ? "_blank" : undefined}
                        rel={isWeb ? "noopener noreferrer" : undefined}
                        className={`group/card block bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col space-y-1.5 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 transition-all duration-200 ${isWeb ? 'cursor-pointer shadow-lg' : 'cursor-default'}`}
                      >
                        <div className="flex items-center space-x-2">
                          {isWeb ? <Globe className="w-4 h-4 text-blue-400 flex-shrink-0 group-hover/card:text-blue-300 transition-colors" /> : <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />}
                          <p className="text-sm font-semibold text-white/90 truncate group-hover/card:text-white transition-colors">
                            {source.filename || (isWeb ? 'Web Source' : 'Document')}
                          </p>
                        </div>
                        <p className="text-xs text-white/50 truncate group-hover/card:text-white/70 transition-colors">
                          {isWeb ? source.chunkId : (source.chunkId ? `Chunk: ${source.chunkId}` : 'Knowledge Base')}
                        </p>
                      </a>
                    );
                  })}
                </div>
              </details>
            )}

            {/* Answer */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 md:p-8 prose prose-invert prose-blue max-w-none overflow-x-auto shadow-2xl">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.answer}
              </ReactMarkdown>
            </div>
            
          </div>
        )}
      </div>
    </div>
  );
};

export default Research;

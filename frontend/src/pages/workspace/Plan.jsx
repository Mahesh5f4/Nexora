import { useState } from 'react';
import { planService } from '../../services/api';
import { Loader2, Calendar, Target, Users, Clock, DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';

const Plan = () => {
  const [goal, setGoal] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);

  const handlePlan = async (e) => {
    e.preventDefault();
    if (!goal.trim() || isPlanning) return;

    const currentSequence = ++requestSequenceRef.current;
    setIsPlanning(true);
    setError(null);
    setPlan(null);

    try {
      const res = await planService.createPlan({ goal });
      if (currentSequence === requestSequenceRef.current) {
        setPlan(res.data);
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
          setError("An error occurred while generating the plan. Please try again.");
        }
      }
    } finally {
      setIsPlanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-12 font-sans pt-24">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-rose-400 to-orange-500 bg-clip-text text-transparent">
            AI Event Planner
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto text-lg">
            Describe your event goal and our AI will generate a comprehensive, structured plan including objectives, audience, schedule, and budget constraints.
          </p>
        </div>
        
        {/* Input Area */}
        <div className="mb-12 max-w-3xl mx-auto">
          <form onSubmit={handlePlan} className="relative group">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={isPlanning}
              placeholder="E.g., I want to organize a 3-day tech conference for 500 developers in San Francisco focused on AI and Web3..."
              rows={4}
              className="w-full bg-[#1A1A1A] border border-white/10 rounded-2xl p-5 pr-16 text-lg text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-rose-500/50 disabled:opacity-50 transition-all resize-none shadow-xl"
            />
            <button
              type="submit"
              disabled={!goal.trim() || isPlanning}
              className="absolute right-4 bottom-4 p-3 bg-rose-500 hover:bg-rose-600 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white"
              aria-label="Generate Plan"
            >
              {isPlanning ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>

        {/* Loading State */}
        {isPlanning && (
          <div className="flex flex-col items-center justify-center py-12 text-rose-400/80 animate-pulse">
            <div className="bg-rose-500/10 p-4 rounded-full mb-4">
              <Calendar className="w-8 h-8 animate-bounce" />
            </div>
            <p className="text-xl font-medium">Architecting your event plan...</p>
            <p className="text-sm text-white/40 mt-2">This usually takes 10-20 seconds.</p>
          </div>
        )}

        {/* Error State */}
        {error && !isPlanning && (
          <div className="max-w-3xl mx-auto bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center space-x-3 mb-8">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <p className="text-lg">{error}</p>
          </div>
        )}

        {/* Results */}
        {plan && !isPlanning && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-6">
            
            {/* Title Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-10 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-orange-500"></div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">{plan.title}</h2>
              <div className="flex items-center justify-center text-white/50 space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium uppercase tracking-widest">Plan Generated Successfully</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Objective */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-white/90">Objective</h3>
                </div>
                <p className="text-white/70 leading-relaxed">{plan.objective}</p>
              </div>

              {/* Target Audience */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-white/90">Target Audience</h3>
                </div>
                <p className="text-white/70 leading-relaxed">{plan.targetAudience}</p>
              </div>

              {/* Duration & Budget */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-white/90">Estimated Duration</h3>
                    </div>
                    <p className="text-white/70 ml-11">{plan.estimatedDuration}</p>
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                        <DollarSign className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-white/90">Estimated Budget</h3>
                    </div>
                    <p className="text-white/70 ml-11">{plan.budget}</p>
                  </div>
                </div>
              </div>

              {/* Constraints */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.07] transition-colors">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-semibold text-white/90">Constraints & Risks</h3>
                </div>
                {plan.constraints && plan.constraints.length > 0 ? (
                  <ul className="space-y-3">
                    {plan.constraints.map((constraint, idx) => (
                      <li key={idx} className="flex items-start text-white/70">
                        <span className="text-rose-400 mr-2 mt-1">•</span>
                        <span>{constraint}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-white/50 italic">No specific constraints identified.</p>
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 mt-6">
              <div className="flex items-center space-x-3 mb-6 border-b border-white/10 pb-4">
                <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-semibold text-white/90">Proposed Schedule</h3>
              </div>
              
              {plan.schedule && plan.schedule.length > 0 ? (
                <div className="space-y-4">
                  {plan.schedule.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-xl bg-[#111] border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <div className="pt-1 text-white/80 leading-relaxed">
                        {item}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 italic">No schedule was generated.</p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Plan;

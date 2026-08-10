import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, ArrowRight, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password, 3: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword({ email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword({ email, otp, newPassword });
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP or reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="liquid-glass w-full max-w-md bg-white/5 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
      >
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                  <ShieldCheck size={32} className="text-white" />
                </div>
                <h2 className="text-3xl font-medium text-white mb-2">Reset Password</h2>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Enter your email to receive an OTP</p>
              </div>

              <form onSubmit={handleRequestOtp} className="space-y-6">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="name@example.com"
                  icon={Mail}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm text-center font-medium">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full py-4 text-base" loading={loading}>
                  Send OTP <Send size={18} className="ml-2" />
                </Button>
              </form>

              <div className="pt-6 text-center">
                <Link to="/login" className="text-white/40 hover:text-white text-sm font-medium inline-flex items-center gap-2 transition-colors">
                  <ArrowLeft size={16} /> Back to Login
                </Link>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10">
                  <Lock size={32} className="text-white" />
                </div>
                <h2 className="text-3xl font-medium text-white mb-2">Verify & Reset</h2>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Enter the 6-digit code sent to your email</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-6">
                <Input
                  label="OTP Code"
                  type="text"
                  placeholder="000000"
                  icon={ShieldCheck}
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                  icon={Lock}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm text-center font-medium">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full py-4 text-base" loading={loading}>
                  Reset Password <ArrowRight size={18} className="ml-2" />
                </Button>
              </form>

              <div className="pt-6 text-center">
                <button 
                  onClick={() => setStep(1)} 
                  className="text-white/40 hover:text-white text-sm font-medium inline-flex items-center gap-2 transition-colors"
                >
                  <ArrowLeft size={16} /> Change Email
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/20">
                <CheckCircle2 size={48} className="text-emerald-500" />
              </div>
              <h2 className="text-3xl font-medium text-white mb-4">Password Reset!</h2>
              <p className="text-white/40 text-lg font-light mb-10">Your security is our priority. Your password has been successfully updated.</p>
              
              <Button onClick={() => navigate('/login')} className="w-full py-4 text-base">
                Go to Login
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;

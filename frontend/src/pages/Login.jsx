import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login, googleLogin, clearError, verifyOtp } from '../store/slices/authSlice';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin as GoogleLoginButton } from '@react-oauth/google';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [otp, setOtp] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, error, tempEmail } = useAppSelector(state => state.auth);
  const redirectMessage = location.state?.message;

  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/workspace');
      }
    }
    return () => dispatch(clearError());
  }, [user, navigate, dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(login(formData));
  };

  const handleGoogleSuccess = (credentialResponse) => {
    dispatch(googleLogin(credentialResponse.credential));
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ai-card w-full max-w-md p-8 sm:p-10"
      >
        {(loading || user) ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
            <p className="text-white/60 text-sm animate-pulse">
              {user ? 'Redirecting to workspace...' : 'Signing you in...'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-white/10">
            <LogIn size={32} className="text-black" />
          </div>
          <h2 className="text-3xl font-medium text-white mb-2">Welcome Back</h2>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Sign in to continue</p>
        </div>

        {redirectMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-3 rounded-xl text-sm text-center font-medium mb-6">
            {redirectMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm text-center font-medium mb-6">
            {error}
          </div>
        )}

        {!tempEmail ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                icon={Mail}
                required
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                required
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />

              <div className="flex justify-end">
                <Link to="/forgot-password" size="sm" className="text-white/40 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
                  Forgot Password?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full py-4 text-base" 
                loading={loading}
              >
                Sign In <ArrowRight size={18} className="ml-2" />
              </Button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/5" />
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">or</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            <div className="flex justify-center">
               <div className="p-1 rounded-xl w-full flex justify-center bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <GoogleLoginButton
                    onSuccess={handleGoogleSuccess}
                    onError={() => console.log('Login Failed')}
                    theme="filled_black"
                    shape="pill"
                    text="continue_with"
                  />
               </div>
            </div>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-white/40 text-sm">
                Don't have an account?{' '}
                <Link to="/register" className="text-white font-medium hover:underline">
                  Create an account
                </Link>
              </p>
            </div>
          </>
        ) : (
          <form onSubmit={(e) => {
             e.preventDefault();
             dispatch(verifyOtp({ email: tempEmail, otp }));
          }} className="space-y-6">
            <div className="text-center mb-6">
              <p className="text-white/60 text-sm mb-2">We sent a 6-digit code to</p>
              <p className="text-white font-medium">{tempEmail}</p>
            </div>
            
            <Input
              label="OTP Code"
              type="text"
              placeholder="123456"
              icon={Lock}
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
            />

            <Button 
              type="submit" 
              className="w-full py-4 text-base" 
              loading={loading}
            >
              Verify OTP <ArrowRight size={18} className="ml-2" />
            </Button>
            
            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => window.location.reload()}
                className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest"
              >
                Cancel and Login Again
              </button>
            </div>
          </form>
        )}
        </>
        )}
      </motion.div>
    </div>
  );
};

export default Login;

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { register, googleLogin, clearError } from '../store/slices/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { GoogleLogin as GoogleLoginButton } from '@react-oauth/google';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, loading, error } = useAppSelector(state => state.auth);

  useEffect(() => {
    if (user) navigate('/workspace');
    return () => dispatch(clearError());
  }, [user, navigate, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(register(formData)).unwrap();
      navigate('/login', { state: { message: 'Registration successful! Please log in.' } });
    } catch (err) {
      // Error is handled by redux state and displayed below
    }
  };

  const handleGoogleSuccess = (credentialResponse) => {
    dispatch(googleLogin(credentialResponse.credential));
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="liquid-glass w-full max-w-md bg-white/5 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-white/10">
            <UserPlus size={32} className="text-black" />
          </div>
          <h2 className="text-3xl font-medium text-white mb-2">Join Us</h2>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            icon={User}
            required
            autoComplete="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
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
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-xl text-sm text-center font-medium">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full py-4 text-base mt-4" 
            loading={loading}
          >
            Create Account <ArrowRight size={18} className="ml-2" />
          </Button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">or</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <div className="flex justify-center">
           <div className="liquid-glass p-1 rounded-xl w-full flex justify-center">
              <GoogleLoginButton
                onSuccess={handleGoogleSuccess}
                onError={() => console.log('Login Failed')}
                theme="filled_black"
                shape="pill"
                text="signup_with"
              />
           </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/5 text-center">
          <p className="text-white/40 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-white font-medium hover:underline">
              Log in instead
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;

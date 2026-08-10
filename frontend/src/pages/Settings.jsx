import React, { useState } from 'react';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, Shield, Trash2, ChevronRight, 
  AlertTriangle, Check, X, Key, User, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { updateProfile } from '../store/slices/authSlice';
import { authService } from '../services/api';

const Settings = () => {
  const { user } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Profile Edit State
  const [editedName, setEditedName] = useState(user?.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [nameUpdateSuccess, setNameUpdateSuccess] = useState(false);

  // Password Change State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState('initial'); // initial, otp, success
  const [passwordData, setPasswordData] = useState({ otp: '', newPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Regional settings state
  const [settings, setSettings] = useState({
    language: 'English (US)',
    currency: 'USD ($)',
  });

  if (!user) return null;

  const tabs = [
    { id: 'profile', label: 'Profile Details', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Globe },
    { id: 'security', label: 'Security & Data', icon: Shield },
  ];

  const handleUpdateName = async () => {
    if (!editedName.trim() || editedName === user.name) return;
    setIsUpdatingName(true);
    setNameUpdateSuccess(false);
    try {
      await dispatch(updateProfile({ name: editedName })).unwrap();
      setNameUpdateSuccess(true);
      setTimeout(() => setNameUpdateSuccess(false), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleSendOtp = async () => {
    setIsChangingPassword(true);
    setPasswordError('');
    try {
      await authService.forgotPassword({ email: user.email });
      setPasswordStep('otp');
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleVerifyPasswordChange = async (e) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError('');
    try {
      await authService.resetPassword({ 
        email: user.email, 
        otp: passwordData.otp, 
        newPassword: passwordData.newPassword 
      });
      setPasswordStep('success');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordStep('initial');
        setPasswordData({ otp: '', newPassword: '' });
      }, 2000);
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="mb-8">
        <button 
          onClick={() => navigate('/profile')}
          className="text-white/40 hover:text-white transition-colors text-sm flex items-center gap-2 mb-4"
        >
          <ChevronRight size={14} className="rotate-180" /> Back to Profile
        </button>
        <h1 className="text-3xl font-medium text-white">Account Settings</h1>
        <p className="text-white/40 mt-2">Manage your preferences and account configurations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Navigation Sidebar */}
        <div className="md:col-span-4">
          <Card className="p-4 space-y-2 sticky top-24">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id 
                    ? 'bg-white/10 text-white' 
                    : 'text-white/40 hover:bg-white/5 hover:text-white'
                }`}
              >
                <tab.icon size={18} />
                <span className="font-medium text-sm">{tab.label}</span>
              </button>
            ))}
          </Card>
        </div>

        {/* Content Area */}
        <div className="md:col-span-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'profile' && (
                <Card className="p-8">
                  <h2 className="text-xl font-medium text-white mb-6">Profile Details</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">
                        Display Name
                      </label>
                      <div className="flex gap-4">
                        <Input
                          type="text"
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          placeholder="Your Name"
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleUpdateName}
                          loading={isUpdatingName}
                          disabled={editedName === user.name || !editedName.trim()}
                        >
                          Update
                        </Button>
                      </div>
                      <AnimatePresence>
                        {nameUpdateSuccess && (
                          <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-emerald-500 text-sm mt-2 flex items-center gap-2"
                          >
                            <Check size={14} /> Name updated successfully
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'preferences' && (
                <Card className="p-8">
                  <h2 className="text-xl font-medium text-white mb-6">Regional Settings</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">
                        Display Language
                      </label>
                      <select 
                        value={settings.language}
                        onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 appearance-none"
                      >
                        <option value="English (US)">English (US)</option>
                        <option value="English (UK)">English (UK)</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">
                        Preferred Currency
                      </label>
                      <select 
                        value={settings.currency}
                        onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-white/30 appearance-none"
                      >
                        <option value="USD ($)">USD ($)</option>
                        <option value="EUR (€)">EUR (€)</option>
                        <option value="GBP (£)">GBP (£)</option>
                        <option value="INR (₹)">INR (₹)</option>
                      </select>
                    </div>
                  </div>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card className="p-8">
                  <h2 className="text-xl font-medium text-white mb-6">Security & Password</h2>
                  
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-white font-medium mb-2">Change Password</h3>
                      <p className="text-white/40 text-sm mb-4">
                        Securely update your password using a one-time code sent to your email.
                      </p>
                      <Button variant="secondary" onClick={() => setShowPasswordModal(true)}>
                        <Key size={16} className="mr-2 text-white/40" /> Change Password
                      </Button>
                    </div>

                    <div className="pt-8 border-t border-red-500/20 mt-8">
                      <h2 className="text-xl font-medium text-red-500 mb-6 flex items-center gap-2">
                        <AlertTriangle size={20} /> Danger Zone
                      </h2>
                      <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10">
                        <h3 className="text-white font-medium mb-2">Delete Account</h3>
                        <p className="text-white/40 text-sm mb-6">
                          Once you delete your account, there is no going back. Please be certain. All your bookings and personal data will be permanently erased.
                        </p>
                        <Button 
                          variant="secondary" 
                          className="text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white hover:border-red-500"
                          onClick={() => setShowDeleteModal(true)}
                        >
                          <Trash2 size={16} className="mr-2" /> Delete My Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => !isChangingPassword && setShowPasswordModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="liquid-glass w-full max-w-md bg-white/5 p-8 rounded-3xl relative z-10 border border-white/10"
            >
              <button 
                onClick={() => setShowPasswordModal(false)}
                disabled={isChangingPassword}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-8">
                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 border border-white/10">
                  <Key size={24} />
                </div>
                <h3 className="text-2xl font-medium text-white mb-2">Secure Update</h3>
                <p className="text-white/40 text-xs uppercase tracking-widest font-bold">
                  {passwordStep === 'initial' ? 'Change Password' : passwordStep === 'otp' ? 'Verify OTP' : 'Success'}
                </p>
              </div>

              {passwordError && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                  {passwordError}
                </div>
              )}

              {passwordStep === 'initial' && (
                <div className="space-y-6 text-center">
                  <p className="text-white/60 text-sm leading-relaxed">
                    To change your password securely, we need to send a one-time verification code to <strong>{user.email}</strong>.
                  </p>
                  <Button 
                    className="w-full py-4" 
                    onClick={handleSendOtp}
                    loading={isChangingPassword}
                  >
                    Send Verification Code
                  </Button>
                </div>
              )}

              {passwordStep === 'otp' && (
                <form onSubmit={handleVerifyPasswordChange} className="space-y-6">
                  <p className="text-white/60 text-sm text-center leading-relaxed mb-6">
                    Enter the 6-digit code sent to your email and your new password.
                  </p>
                  <Input
                    label="OTP Code"
                    type="text"
                    placeholder="123456"
                    required
                    value={passwordData.otp}
                    onChange={(e) => setPasswordData({ ...passwordData, otp: e.target.value })}
                    maxLength={6}
                  />
                  <Input
                    label="New Password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  />
                  <Button 
                    type="submit"
                    className="w-full py-4" 
                    loading={isChangingPassword}
                  >
                    Confirm Change
                  </Button>
                </form>
              )}

              {passwordStep === 'success' && (
                <div className="text-center space-y-4 py-4">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                    <Check size={32} />
                  </div>
                  <h4 className="text-xl text-white font-medium">Password Updated</h4>
                  <p className="text-emerald-500/80 text-sm">Your account is secure.</p>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="liquid-glass w-full max-w-md bg-white/5 p-8 rounded-3xl relative z-10 border border-red-500/30"
            >
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-2xl font-medium text-white mb-2">Are you sure?</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-8">
                This action cannot be undone. All of your data, including event bookings and preferences, will be permanently deleted from our servers.
              </p>
              
              <div className="flex gap-4">
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white border-none"
                  onClick={() => {
                    // Placeholder for actual delete logic
                    setShowDeleteModal(false);
                    alert('Account deletion endpoint not yet implemented.');
                  }}
                >
                  Confirm Delete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;

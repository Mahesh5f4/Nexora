import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  User, Mail, Shield, Calendar, Camera, LogOut, Settings, Bell, BrainCircuit, FileText
} from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

const Profile = () => {
  const { user } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const stats = [
    { label: 'Workflows', value: '12', icon: BrainCircuit },
    { label: 'Artifacts', value: '28', icon: FileText },
    { 
      label: 'Member Since', 
      value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'May 2026', 
      icon: Calendar 
    },
  ];

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4">
          <Card className="p-8 text-center sticky top-24">
            <div className="relative w-32 h-32 mx-auto mb-6 group">
              <div className="w-full h-full rounded-full bg-white/10 flex items-center justify-center text-white overflow-hidden border border-white/10">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} width="128" height="128" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <User size={64} className="opacity-20" />
                )}
              </div>
              <button aria-label="Change profile picture" className="absolute bottom-0 right-0 p-2 bg-white text-black rounded-full shadow-xl hover:scale-110 transition-transform">
                <Camera size={16} />
              </button>
            </div>
            
            <div className="mb-1 flex items-center justify-center gap-2">
              <h1 className="text-2xl font-medium text-white flex items-center gap-2 group">
                {user.name || user.email?.split('@')[0] || 'User'}
              </h1>
            </div>

            <div className="flex items-center justify-center gap-2 mb-8 mt-2">
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
                {user.role} Member
              </p>
              {user.email?.endsWith('@gmail.com') && (
                <Badge variant="secondary" className="text-[8px] py-0.5 px-1.5 opacity-60">Google</Badge>
              )}
            </div>

            <div className="space-y-3">
              <Button variant="secondary" className="w-full justify-start text-xs group" onClick={() => navigate('/settings')}>
                <Settings size={14} className="mr-3 text-white/40 group-hover:text-white transition-colors" /> Account Settings
              </Button>
              <Button variant="secondary" className="w-full justify-start text-xs group text-red-400 hover:text-red-300" onClick={handleLogout}>
                <LogOut size={14} className="mr-3" /> Sign Out
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column: Details & Activity */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {stats.map((stat, i) => (
              <Card key={i} className="p-6 text-center">
                <div className="text-white/20 mb-2 flex justify-center">
                  <stat.icon size={18} />
                </div>
                <div className="text-xl font-medium text-white mb-1">{stat.value}</div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{stat.label}</div>
              </Card>
            ))}
          </div>

          {/* Identity Section */}
          <Card className="p-8">
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
              <Shield size={16} className="text-white/20" /> Identity Information
            </h2>
            
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white/5 text-white/40">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/20 uppercase tracking-widest mb-1">Primary Email</div>
                    <div className="text-white font-medium">{user.email}</div>
                  </div>
                </div>
                <Badge variant="secondary">Verified</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-white/5 text-white/40">
                    <Shield size={18} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white/20 uppercase tracking-widest mb-1">Access Tier</div>
                    <div className="text-white font-medium">{user.role === 'ADMIN' ? 'Full System Access' : 'Standard Experience Tier'}</div>
                  </div>
                </div>
                <Badge variant="primary">{user.role}</Badge>
              </div>
            </div>
          </Card>

          {/* Recent Activity Placeholder */}
          <Card className="p-8">
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.2em] mb-8">Recent Workflows</h2>
            <div className="space-y-6">
              {[
                { event: 'RAG Knowledge Ingestion', date: 'Oct 24, 2025', status: 'Active' },
                { event: 'Data Analysis Pipeline', date: 'Sep 12, 2025', status: 'Completed' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/5 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                      <BrainCircuit size={18} />
                    </div>
                    <div>
                      <div className="text-white font-medium group-hover:text-white transition-colors">{item.event}</div>
                      <div className="text-[10px] text-white/30 uppercase font-bold mt-0.5">{item.date}</div>
                    </div>
                  </div>
                  <Badge variant={item.status === 'Active' ? 'primary' : 'secondary'}>{item.status}</Badge>
                </div>
              ))}
              <button className="w-full py-4 text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] hover:text-white transition-colors">
                View Complete History
              </button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Profile;

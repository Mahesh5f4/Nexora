import React, { useEffect, useState } from 'react';
import { Users, MessageSquare, Database, RefreshCw } from 'lucide-react';
import { adminService } from '../services/api';
import Navbar from '../components/Navbar';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalUsers: 0, totalMessages: 0, totalTokensUsed: 0 });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, usersRes] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers()
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0B] text-white font-sans">
      <Navbar />
      
      <div className="flex-1 px-6 py-12">
        <div className="max-w-5xl mx-auto w-full space-y-8 mt-12">
          
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white/90">Platform Overview</h1>
              <p className="text-sm text-gray-400 mt-1">Real-time statistics across all users</p>
            </div>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium text-white/80 transition-all disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </header>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {/* Users Card */}
            <div className="bg-[#1A1A1C] border border-white/10 rounded-2xl p-6 flex flex-col min-h-[160px]">
              <div className="flex items-center gap-3 text-emerald-400 mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Users size={20} />
                </div>
                <span className="font-semibold tracking-wide text-sm">Total Users</span>
              </div>
              <div className="text-4xl font-bold text-white tracking-tight mt-auto">
                {loading ? <span className="text-white/20 animate-pulse">---</span> : stats.totalUsers}
              </div>
            </div>

            {/* Messages Card */}
            <div className="bg-[#1A1A1C] border border-white/10 rounded-2xl p-6 flex flex-col min-h-[160px]">
              <div className="flex items-center gap-3 text-blue-400 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MessageSquare size={20} />
                </div>
                <span className="font-semibold tracking-wide text-sm">Total Messages</span>
              </div>
              <div className="text-4xl font-bold text-white tracking-tight mt-auto">
                {loading ? <span className="text-white/20 animate-pulse">---</span> : stats.totalMessages}
              </div>
            </div>

            {/* Tokens Card */}
            <div className="bg-[#1A1A1C] border border-white/10 rounded-2xl p-6 flex flex-col min-h-[160px]">
              <div className="flex items-center gap-3 text-purple-400 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Database size={20} />
                </div>
                <span className="font-semibold tracking-wide text-sm">Tokens Consumed</span>
              </div>
              <div className="text-4xl font-bold text-white tracking-tight mt-auto">
                {loading ? <span className="text-white/20 animate-pulse">---</span> : stats.totalTokensUsed?.toLocaleString()}
              </div>
            </div>
          </div>
          
          {/* Users Table */}
          <div className="mt-12 bg-[#1A1A1C] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <h2 className="text-lg font-medium text-white">Registered Users</h2>
              <p className="text-sm text-gray-400 mt-1">Real-time view of all registered accounts.</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-white/80">
                <thead className="bg-white/5 text-white/50 font-medium uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading && users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-white/40">Loading users...</td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-white/40">No users found.</td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/50 shrink-0 overflow-hidden">
                              {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" /> : <Users size={14} />}
                            </div>
                            <div>
                              <div className="font-medium text-white">{u.name || 'Unnamed User'}</div>
                              <div className="text-xs text-white/50">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${u.role === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-white/5 text-white/60 border border-white/10'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-white/50">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-white/50">
                          {u.lastActive ? new Date(u.lastActive).toLocaleString() : 'Never'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

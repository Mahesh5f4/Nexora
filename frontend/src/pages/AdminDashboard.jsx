import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchEvents, deleteEvent, setSearchTerm } from '../store/slices/eventsSlice';
import { eventService, authService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, Plus, Calendar, MapPin, Users, DollarSign, Search, X, Check, AlertTriangle, ChevronLeft, ChevronRight, BarChart3, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';

const AdminDashboard = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items: events, loading, searchTerm, pagination } = useAppSelector(state => state.events);
  const { currentPage, totalPages } = pagination;
  const [pageSize] = useState(10);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [status, setStatus] = useState({ type: '', message: '' });

  const [activeTab, setActiveTab] = useState('events'); // 'events' or 'users'
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userPage, setUserPage] = useState(0);
  const userPageSize = 10;

  useEffect(() => {
    setUserPage(0);
  }, [userSearchTerm]);

  useEffect(() => {
    dispatch(fetchEvents({ page: 0, size: pageSize }));
  }, [dispatch, pageSize]);

  useEffect(() => {
    if (activeTab === 'users') {
      const loadUsers = async () => {
        setLoadingUsers(true);
        try {
          const response = await authService.getUsers();
          setUsers(response.data);
        } catch (error) {
          console.error("Failed to load users", error);
        } finally {
          setLoadingUsers(false);
        }
      };
      loadUsers();
    }
  }, [activeTab]);

  const handlePageChange = (newPage) => {
    dispatch(fetchEvents({ page: newPage, size: pageSize }));
  };

  const handleDelete = async () => {
    if (!eventToDelete) return;
    try {
      const resultAction = await dispatch(deleteEvent(eventToDelete.id));
      if (deleteEvent.fulfilled.match(resultAction)) {
        setIsDeleteConfirmOpen(false);
        dispatch(fetchEvents({ page: currentPage, size: pageSize }));
        setStatus({ type: 'success', message: 'Event deleted successfully' });
        setTimeout(() => setStatus({ type: '', message: '' }), 3000);
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to delete event' });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await eventService.update(selectedEvent.id, {
        ...selectedEvent,
        price: parseFloat(selectedEvent.price),
        totalSeats: parseInt(selectedEvent.totalSeats)
      });
      setIsEditModalOpen(false);
      dispatch(fetchEvents({ page: currentPage, size: pageSize }));
      setStatus({ type: 'success', message: 'Event updated successfully' });
      setTimeout(() => setStatus({ type: '', message: '' }), 3000);
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to update event' });
    }
  };

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && events.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      <p className="text-white/40 text-sm font-medium">Loading command center...</p>
    </div>
  );

  return (
    <div className="container mx-auto px-6 py-12 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div>
          <h1 className="text-5xl font-medium text-white tracking-tight mb-2">Command Center</h1>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Global Management Active</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/admin/analytics')}>
            <BarChart3 size={18} className="mr-2" /> Analytics
          </Button>
          <Button onClick={() => navigate('/admin/create')}>
            <Plus size={18} className="mr-2" /> New Event
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-6 border-b border-white/5 mb-8">
        <button
          onClick={() => setActiveTab('events')}
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all ${
            activeTab === 'events' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Events
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-all ${
            activeTab === 'users' ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/60'
          }`}
        >
          Users
        </button>
      </div>

      {/* Quick Stats */}
      {activeTab === 'events' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Events', value: events.length, icon: Calendar },
            { label: 'Avg Attendance', value: '84%', icon: Users },
            { label: 'Monthly Revenue', value: '₹14.2k', icon: DollarSign },
            { label: 'Platform Health', value: '100%', icon: Check },
          ].map((stat, i) => (
            <Card key={i} className="p-6">
              <div className="p-2 rounded-xl bg-white/5 w-fit text-white mb-4">
                <stat.icon size={18} />
              </div>
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-2xl font-medium text-white">{stat.value}</div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Registered Users', value: users.length, icon: Users },
            { label: 'Verified Accounts', value: users.length, icon: Check },
          ].map((stat, i) => (
            <Card key={i} className="p-6">
              <div className="p-2 rounded-xl bg-white/5 w-fit text-white mb-4">
                <stat.icon size={18} />
              </div>
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">{stat.label}</div>
              <div className="text-2xl font-medium text-white">{stat.value}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'events' ? (
        <>
          {/* Toolbar */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="flex-1 w-full">
              <Input 
                icon={Search}
                placeholder="Search catalog..."
                value={searchTerm}
                onChange={(e) => dispatch(setSearchTerm(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">{filteredEvents.length} Entries</Badge>
              <button className="p-3 rounded-xl liquid-glass text-white/40 hover:text-white transition-all">
                <Filter size={18} />
              </button>
            </div>
          </div>

          {/* Table */}
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5">
                    <th className="px-8 py-5 font-bold text-white/30 uppercase tracking-widest text-[10px]">Event</th>
                    <th className="px-8 py-5 font-bold text-white/30 uppercase tracking-widest text-[10px]">Schedule</th>
                    <th className="px-8 py-5 font-bold text-white/30 uppercase tracking-widest text-[10px]">Inventory</th>
                    <th className="px-8 py-5 font-bold text-white/30 uppercase tracking-widest text-[10px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <img 
                            src={event.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=200'} 
                            className="w-10 h-10 rounded-lg object-cover"
                            alt="Event Thumbnail"
                          />
                          <div>
                            <div className="font-medium text-white">{event.title}</div>
                            <div className="text-[10px] text-white/40 uppercase tracking-wider">{event.location}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="text-white font-medium">
                          {new Date(event.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </div>
                        <div className="text-[10px] text-white/40 uppercase">{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-2">
                           <div className="flex justify-between text-[10px] font-bold uppercase">
                              <span className="text-white/40">{event.totalSeats - event.availableSeats} / {event.totalSeats} Sold</span>
                              <span className="text-white">₹{event.price}</span>
                           </div>
                           <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-white" style={{ width: `${((event.totalSeats - event.availableSeats) / event.totalSeats) * 100}%` }} />
                           </div>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setSelectedEvent(event); setIsEditModalOpen(true); }}
                            className="p-2 rounded-lg liquid-glass text-white/40 hover:text-white"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => { setEventToDelete(event); setIsDeleteConfirmOpen(true); }}
                            className="p-2 rounded-lg bg-red-500/10 text-red-500/60 hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="p-3 rounded-xl liquid-glass text-white/40 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs font-bold text-white/20 uppercase tracking-[0.2em]">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="p-3 rounded-xl liquid-glass text-white/40 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* User Directory Toolbar */}
          <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
            <div className="flex-1 w-full">
              <Input 
                icon={Search}
                placeholder="Search users by name or email..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary">
                {users.filter(u => 
                  u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
                  u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                ).length} Users
              </Badge>
            </div>
          </div>

          {/* User Directory Table */}
          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center min-h-[30vh] gap-4">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              <p className="text-white/40 text-sm font-medium">Loading user profiles...</p>
            </div>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                      <th className="px-8 py-5 font-bold text-white/30 uppercase tracking-widest text-[10px]">User</th>
                      <th className="px-8 py-5 font-bold text-white/30 uppercase tracking-widest text-[10px]">Email</th>
                      <th className="px-8 py-5 font-bold text-white/30 uppercase tracking-widest text-[10px]">Identity ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users
                      .filter(u => 
                        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                      )
                      .slice(userPage * userPageSize, (userPage + 1) * userPageSize)
                      .map((user) => (
                        <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <img 
                                src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100'} 
                                className="w-10 h-10 rounded-full object-cover"
                                alt="User Avatar"
                              />
                              <div>
                                <div className="font-medium text-white">{user.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-white font-medium">
                            {user.email}
                          </td>
                          <td className="px-8 py-5 text-white/45 font-mono text-xs">
                            {user.id}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Users Pagination */}
          {!loadingUsers && Math.ceil(
            users.filter(u => 
              u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
              u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
            ).length / userPageSize
          ) > 1 && (
            <div className="mt-12 flex items-center justify-center gap-4">
              <button 
                onClick={() => setUserPage(prev => Math.max(prev - 1, 0))}
                disabled={userPage === 0}
                className="p-3 rounded-xl liquid-glass text-white/40 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-xs font-bold text-white/20 uppercase tracking-[0.2em]">
                Page {userPage + 1} of {Math.ceil(
                  users.filter(u => 
                    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                  ).length / userPageSize
                )}
              </span>
              <button 
                onClick={() => setUserPage(prev => Math.min(prev + 1, Math.ceil(
                  users.filter(u => 
                    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                  ).length / userPageSize
                ) - 1))}
                disabled={userPage === Math.ceil(
                  users.filter(u => 
                    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                    u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                  ).length / userPageSize
                ) - 1}
                className="p-3 rounded-xl liquid-glass text-white/40 hover:text-white disabled:opacity-20 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals (Edit/Delete) would follow same liquid-glass card pattern */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl">
              <Card className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-medium text-white">Edit Event</h2>
                  <button onClick={() => setIsEditModalOpen(false)}><X size={20} className="text-white/40" /></button>
                </div>
                <form onSubmit={handleUpdate} className="space-y-6">
                  <Input label="Title" value={selectedEvent.title} onChange={e => setSelectedEvent({...selectedEvent, title: e.target.value})} required />
                  <Input label="Location" icon={MapPin} value={selectedEvent.location} onChange={e => setSelectedEvent({...selectedEvent, location: e.target.value})} required />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Price (₹)" type="number" value={selectedEvent.price} onChange={e => setSelectedEvent({...selectedEvent, price: e.target.value})} required />
                    <Input label="Capacity" type="number" value={selectedEvent.totalSeats} onChange={e => setSelectedEvent({...selectedEvent, totalSeats: e.target.value})} required />
                  </div>
                  <div className="flex gap-4 pt-6">
                    <Button variant="secondary" className="flex-1" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                    <Button type="submit" className="flex-1">Save Changes</Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

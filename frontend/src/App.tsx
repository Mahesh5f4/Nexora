import React, { useEffect, Suspense, lazy, memo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from './store/hooks';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { AnimatePresence } from 'framer-motion';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Profile = lazy(() => import('./pages/Profile'));
const About = lazy(() => import('./pages/About'));
const Help = lazy(() => import('./pages/Help'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Security = lazy(() => import('./pages/Security'));
const Legal = lazy(() => import('./pages/Legal'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Settings = lazy(() => import('./pages/Settings'));

// Workspace Pages
const Workspace = lazy(() => import('./pages/workspace/Workspace'));
const Knowledge = lazy(() => import('./pages/workspace/Knowledge'));
const Usage = lazy(() => import('./pages/workspace/Usage'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const BG_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_230229_7c9bc431-46cf-489a-948d-e8144d8eb5d4.mp4';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const PrivateRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAppSelector(state => state.auth);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/" />;

  return children;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center">
          <h2 className="text-3xl font-medium mb-4">Something went wrong</h2>
          <p className="text-white/40 mb-8 max-w-md">We encountered an unexpected error. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-8 py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-all"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-transparent">
    <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
  </div>
);

function App() {
  const location = useLocation();
  const isWorkspaceRoute = location.pathname.startsWith('/workspace');
  const user = useAppSelector(state => state.auth.user);

  return (
    <div className="relative min-h-[100dvh] bg-[#0A0A0A] text-white selection:bg-white/20 overflow-x-hidden font-sans antialiased">
      <div className={`relative z-10 flex flex-col ${isWorkspaceRoute ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'}`}>
        {!isWorkspaceRoute && <Navbar />}

        <main className={`flex-1 flex flex-col w-full h-full ${!isWorkspaceRoute ? 'pt-20' : ''}`}>
          <Suspense fallback={<LoadingFallback />}>
            <AnimatePresence mode="wait">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={
                    user 
                    ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/workspace'} /> 
                    : <Login />
                  } />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/help" element={<Help />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="/legal" element={<Legal />} />

                  {/* Workspace Routes */}
                  <Route path="/workspace" element={<PrivateRoute><Workspace /></PrivateRoute>} />
                  <Route path="/workspace/chat/:id" element={<PrivateRoute><Workspace /></PrivateRoute>} />
                  <Route path="/workspace/knowledge" element={<PrivateRoute><Knowledge /></PrivateRoute>} />
                  <Route path="/workspace/usage" element={<PrivateRoute><Usage /></PrivateRoute>} />
                  <Route path="/workspace/analyze" element={<Navigate to="/workspace" replace />} />
                  <Route path="/workspace/generate" element={<Navigate to="/workspace" replace />} />
                  <Route path="/workspace/research" element={<Navigate to="/workspace" replace />} />
                  <Route path="/workspace/plan" element={<Navigate to="/workspace" replace />} />

                  <Route
                    path="/profile"
                    element={
                      <PrivateRoute>
                        <Profile />
                      </PrivateRoute>
                    }
                  />
                  
                  <Route
                    path="/settings"
                    element={
                      <PrivateRoute>
                        <Settings />
                      </PrivateRoute>
                    }
                  />
                  
                  {/* Admin Route */}
                  <Route 
                    path="/admin" 
                    element={
                      <PrivateRoute adminOnly={true}>
                        <AdminDashboard />
                      </PrivateRoute>
                    } 
                  />
                </Routes>
              </ErrorBoundary>
            </AnimatePresence>
          </Suspense>
        </main>

        {!isWorkspaceRoute && <Footer />}
      </div>
    </div>
  );
}

const AppWrapper = () => (
  <Router>
    <ScrollToTop />
    <App />
  </Router>
);

export default AppWrapper;

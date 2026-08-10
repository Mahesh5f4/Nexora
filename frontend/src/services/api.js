import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  googleLogin: (payload) => api.post('/auth/google', payload),
  verifyOtp: (payload) => api.post('/auth/verify-otp', payload),
  forgotPassword: (payload) => api.post('/auth/forgot-password', payload),
  resetPassword: (payload) => api.post('/auth/reset-password', payload),
  updateProfile: (payload) => api.put('/auth/profile', payload),
  getUsers: () => api.get('/auth/admin/users'),
};

export default api;

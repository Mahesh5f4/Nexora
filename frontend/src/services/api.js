import axios from 'axios';

let envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
if (!envUrl || envUrl.includes('onrender') || envUrl.includes('56-228-22-98') || envUrl.startsWith('http:')) {
  envUrl = 'https://16-192-164-81.nip.io/api';
}
export const API_BASE_URL = envUrl;

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

export const adminService = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
};

export const aiService = {
  listConversations: () => api.get('/ai/conversations'),
  getConversation: (id) => api.get(`/ai/conversations/${id}`),
  createConversation: (payload) => api.post('/ai/conversations', payload),
  generateConversationTitle: (id, payload) => api.post(`/ai/conversations/${id}/generate-title`, payload),
  sendMessage: (id, payload) => api.post(`/ai/conversations/${id}/messages`, payload),
  
  listUserMemory: () => api.get('/ai/memory'),
  deleteUserMemory: (memoryId) => api.delete(`/ai/memory/${memoryId}`),
  
  streamMessage: async (id, payload, onEvent, signal) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/ai/conversations/${id}/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
      signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Stream failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || '';

      // SSE spec: currentEventName resets ONLY on a blank line (end of event block).
      // Do NOT reset after reading a data: line — multiple data: lines may follow one event: line.
      let currentEventName = 'message';
      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEventName = line.substring(6).trim();
        } else if (line.startsWith('data:')) {
          const dataStr = line.substring(5).trim();
          if (dataStr) {
            onEvent(currentEventName, dataStr);
          }
          // Do NOT reset currentEventName here — wait for blank line
        } else if (line === '' || line === '\r') {
          // Blank line = end of SSE event block → reset event name
          currentEventName = 'message';
        }
      }
    }
  },

  getMessages: (id) => api.get(`/ai/conversations/${id}/messages`),
  deleteConversation: (id) => api.delete(`/ai/conversations/${id}`),
};

export const documentService = {
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ai/documents', formData);
  },
  getDocuments: () => api.get('/ai/documents'),
  deleteDocument: (id) => api.delete(`/ai/documents/${id}`),
  askQuestion: (payload) => api.post('/ai/documents/ask', payload)
};

export const researchService = {
  research: (payload) => api.post('/ai/research', payload)
};

export const planService = {
  createPlan: (payload) => api.post('/ai/plan', payload)
};

export const generateService = {
  generateContent: (payload) => api.post('/ai/content/generate', payload)
};

export default api;

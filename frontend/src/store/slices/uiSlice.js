import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  notifications: [],
  theme: localStorage.getItem('theme') || 'dark',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.notifications.push({
        id: Date.now(),
        type: action.payload.type || 'info', // 'success' | 'error' | 'info'
        message: action.payload.message,
      });
    },
    removeNotification: (state, action) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', state.theme);
    },
  },
});

export const { addNotification, removeNotification, toggleTheme } = uiSlice.actions;
export default uiSlice.reducer;

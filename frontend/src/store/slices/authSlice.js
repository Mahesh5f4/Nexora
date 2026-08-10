import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '../../services/api';

const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,
  tempEmail: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      // Backend returns AuthResponse directly or wrapped?
      // Based on my previous view, it's ResponseEntity.ok(service.login(req))
      const data = response.data;
      
      if (data.requires2FA) {
        return { requires2FA: true, email: data.email };
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ 
        email: data.email, 
        role: data.role,
        name: data.name,
        avatarUrl: data.avatarUrl,
        createdAt: data.createdAt
      }));
      
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.register(userData);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (idToken, { rejectWithValue }) => {
    try {
      const response = await authService.googleLogin({ credential: idToken });
      const data = response.data;
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ 
        email: data.email, 
        role: data.role,
        name: data.name,
        avatarUrl: data.avatarUrl,
        createdAt: data.createdAt
      }));
      
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Google Login failed');
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await authService.verifyOtp(payload);
      const data = response.data;
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ 
        email: data.email, 
        role: data.role,
        name: data.name,
        avatarUrl: data.avatarUrl,
        createdAt: data.createdAt
      }));
      
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Invalid OTP');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await authService.updateProfile(payload);
      const data = response.data;
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ 
        email: data.email, 
        role: data.role,
        name: data.name,
        avatarUrl: data.avatarUrl,
        createdAt: data.createdAt
      }));
      
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Profile update failed');
    }
  }
);



const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.requires2FA) {
          state.user = null;
          state.token = null;
          state.tempEmail = action.payload.email;
        } else {
          state.token = action.payload.token;
          state.user = { 
            email: action.payload.email, 
            role: action.payload.role,
            name: action.payload.name,
            avatarUrl: action.payload.avatarUrl,
            createdAt: action.payload.createdAt
          };
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(googleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = { 
          email: action.payload.email, 
          role: action.payload.role,
          name: action.payload.name,
          avatarUrl: action.payload.avatarUrl,
          createdAt: action.payload.createdAt
        };
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = { 
          email: action.payload.email, 
          role: action.payload.role,
          name: action.payload.name,
          avatarUrl: action.payload.avatarUrl,
          createdAt: action.payload.createdAt
        };
        state.tempEmail = null;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.user = { 
          email: action.payload.email, 
          role: action.payload.role,
          name: action.payload.name,
          avatarUrl: action.payload.avatarUrl,
          createdAt: action.payload.createdAt
        };
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;

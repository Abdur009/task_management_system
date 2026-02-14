import axios from 'axios';
import { apiCache, requestDeduplicator } from '../utils/apiCache';

const API_BASE_URL = 'http://localhost:3000';

// Auth API instance
const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tasks API instance - will include auth token
const tasksApi = axios.create({
  baseURL: `${API_BASE_URL}/tasks`,
  headers: {
    'Content-Type': 'application/json',
  },
});

const notificationsApi = axios.create({
  baseURL: `${API_BASE_URL}/notifications`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token in requests
tasksApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized) - token expired or invalid
tasksApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      // Redirect to login will be handled by App.jsx
    }
    return Promise.reject(error);
  }
);

notificationsApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

notificationsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Login user
  login: async (credentials) => {
    try {
      const response = await authApi.post('/login', credentials);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed. Please try again.';
      throw new Error(message);
    }
  },

  // Signup user
  signup: async (userData) => {
    try {
      const response = await authApi.post('/register', userData);
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Signup failed. Please try again.';
      throw new Error(message);
    }
  },

  // Set token for API requests
  setToken: (token) => {
    if (token) {
      tasksApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete tasksApi.defaults.headers.common['Authorization'];
    }
  },
};

export const taskService = {
  // Get all tasks with caching and deduplication
  getAllTasks: async (useCache = true) => {
    const cacheKey = 'tasks:all';
    
    // Check cache first
    if (useCache) {
      const cached = apiCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Use deduplication to prevent multiple simultaneous requests
    return requestDeduplicator.dedupe(cacheKey, async () => {
      const response = await tasksApi.get('/');
      const data = response.data;
      
      // Cache the result
      if (useCache) {
        apiCache.set(cacheKey, data, 2 * 60 * 1000); // 2 minutes cache
      }
      
      return data;
    });
  },

  // Get a single task by ID with caching
  getTaskById: async (id, useCache = true) => {
    const cacheKey = `tasks:${id}`;
    
    if (useCache) {
      const cached = apiCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    return requestDeduplicator.dedupe(cacheKey, async () => {
      const response = await tasksApi.get(`/${id}`);
      const data = response.data;
      
      if (useCache) {
        apiCache.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes cache
      }
      
      return data;
    });
  },

  // Create a new task - invalidate cache after creation
  createTask: async (taskData) => {
    const response = await tasksApi.post('/', taskData);
    const data = response.data;
    
    // Invalidate tasks cache
    apiCache.invalidatePattern('tasks:');
    
    return data;
  },

  // Update a task - invalidate cache after update
  updateTask: async (id, taskData) => {
    const response = await tasksApi.put(`/${id}`, taskData);
    const data = response.data;
    
    // Invalidate specific task and all tasks cache
    apiCache.delete(`tasks:${id}`);
    apiCache.invalidatePattern('tasks:');
    
    return data;
  },

  // Delete a task - invalidate cache after deletion
  deleteTask: async (id) => {
    const response = await tasksApi.delete(`/${id}`);
    const data = response.data;
    
    // Invalidate specific task and all tasks cache
    apiCache.delete(`tasks:${id}`);
    apiCache.invalidatePattern('tasks:');
    
    return data;
  },

  // Share a task with another user
  shareTask: async (id, payload) => {
    const response = await tasksApi.post(`/${id}/share`, payload);
    const data = response.data;

    apiCache.delete(`tasks:${id}`);
    apiCache.invalidatePattern('tasks:');

    return data;
  },

  // Update the current user's progress for a task
  updateTaskProgress: async (id, status) => {
    const response = await tasksApi.put(`/${id}/progress`, { status });
    const data = response.data;

    apiCache.delete(`tasks:${id}`);
    apiCache.invalidatePattern('tasks:');

    return data;
  },

  // Clear all task caches (useful for manual refresh)
  clearCache: () => {
    apiCache.invalidatePattern('tasks:');
  },
};

// Profile API instance - will include auth token
const profileApi = axios.create({
  baseURL: `${API_BASE_URL}/profile`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token in requests
profileApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized) - token expired or invalid
profileApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const profileService = {
  // Get current user's profile
  getProfile: async () => {
    const response = await profileApi.get('/');
    return response.data;
  },

  // Update profile (username, email)
  updateProfile: async (profileData) => {
    const response = await profileApi.put('/', profileData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await profileApi.put('/password', passwordData);
    return response.data;
  },

  // Upload profile picture
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    const token = sessionStorage.getItem('token');
    const response = await axios.post(`${API_BASE_URL}/profile/picture`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete profile picture
  deleteProfilePicture: async () => {
    const response = await profileApi.delete('/picture');
    return response.data;
  },
};

export const notificationService = {
  getNotifications: async () => {
    const response = await notificationsApi.get('/');
    return response.data;
  },

  markAsRead: async (ids) => {
    const response = await notificationsApi.post('/mark-read', { ids });
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await notificationsApi.post('/mark-all-read');
    return response.data;
  },
};

// Analytics API instance
const analyticsApi = axios.create({
  baseURL: `${API_BASE_URL}/analytics`,
  headers: {
    'Content-Type': 'application/json',
  },
});

analyticsApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

analyticsApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const analyticsService = {
  getSummary: async () => {
    const response = await analyticsApi.get('/summary');
    return response.data;
  },

  getTrends: async (range = 'weekly') => {
    const response = await analyticsApi.get(`/trends?range=${range}`);
    return response.data;
  },

  getStatusBreakdown: async () => {
    const response = await analyticsApi.get('/status-breakdown');
    return response.data;
  },

  getParticipantProgress: async () => {
    const response = await analyticsApi.get('/participant-progress');
    return response.data;
  },
};

export default tasksApi;


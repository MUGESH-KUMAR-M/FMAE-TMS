import axios from 'axios';
import { useAuthStore } from '../context/store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_URL, timeout: 30000 });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Add CSRF token to mutation requests
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
    try {
      const csrfRes = await axios.get(`${API_URL}/csrf-token`);
      config.headers['X-CSRF-Token'] = csrfRes.data.csrfToken;
    } catch (err) {
      console.warn('Failed to fetch CSRF token');
    }
  }
  return config;
});

// Handle 401 → logout
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED') {
      try {
        const { refreshToken } = useAuthStore.getState();
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        useAuthStore.getState().setAuth(useAuthStore.getState().user, data.token, refreshToken);
        err.config.headers.Authorization = `Bearer ${data.token}`;
        return api(err.config);
      } catch {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  login: (d) => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
  changePassword: (d) => api.put('/auth/change-password', d),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (d) => api.post('/auth/reset-password', d),
  firebaseAuth: (d) => api.post('/auth/firebase', d),
  linkFirebase: (d) => api.post('/auth/firebase/link', d),
};

// ─── Registrations ─────────────────────────────────────────────
export const registrationAPI = {
  submit: (d) => api.post('/registrations', d),
  getStatus: (id) => api.get(`/registrations/status/${id}`),
  getAll: (params) => api.get('/registrations', { params }),
  getMy: () => api.get('/registrations/my'),
  getOne: (id) => api.get(`/registrations/${id}`),
  approve: (id) => api.put(`/registrations/${id}/approve`),
  reject: (id, reason) => api.put(`/registrations/${id}/reject`, { reason }),
  delete: (id) => api.delete(`/registrations/${id}`),
};

// ─── Competitions ──────────────────────────────────────────────
export const competitionAPI = {
  getAll: (status) => api.get('/competitions', { params: { status } }),
  getAllAdmin: () => api.get('/competitions/admin/all'),
  getOne: (id) => api.get(`/competitions/${id}`),
  create: (d) => api.post('/competitions', d),
  update: (id, d) => api.put(`/competitions/${id}`, d),
  delete: (id) => api.delete(`/competitions/${id}`),
};

// ─── Tasks ─────────────────────────────────────────────────────
export const taskAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getOne: (id) => api.get(`/tasks/${id}`),
  create: (d) => api.post('/tasks', d),
  update: (id, d) => api.put(`/tasks/${id}`, d),
  getSubmissions: (id) => api.get(`/tasks/${id}/submissions`),
  getWeight: (competitionId) => api.get(`/tasks/weight/${competitionId}`),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// ─── Submissions ───────────────────────────────────────────────
export const submissionAPI = {
  upload: (taskId, formData) => api.post(`/submissions/tasks/${taskId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getMy: () => api.get('/submissions/my'),
  download: (id) => api.get(`/submissions/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/submissions/${id}`),
};

// ─── Track Events ──────────────────────────────────────────────
export const trackEventAPI = {
  enter: (taskId, d) => api.post(`/track-events/tasks/${taskId}/enter`, d),
  getTeams: (taskId) => api.get(`/track-events/tasks/${taskId}/teams`),
  getMy: () => api.get('/track-events/my'),
  getApprovedValues: (params) => api.get('/track-events/approved-values', { params }),
  approve: (id, d) => api.post(`/track-events/${id}/approve`, d),
  delete: (id) => api.delete(`/track-events/${id}`),
};

// ─── Payments ──────────────────────────────────────────────────
export const paymentAPI = {
  getAll: (params) => api.get('/payments', { params }),
  getSummary: (params) => api.get('/payments/summary', { params }),
  getMy: () => api.get('/payments/my'),
  update: (id, d) => api.put(`/payments/${id}`, d),
  exportCSV: (params) => api.get('/payments/export', { params, responseType: 'blob' }),
};

// ─── Scrutineering ──────────────────────────────────────────────
export const scrutineeringAPI = {
  getAll: (params) => api.get('/scrutineering', { params }),
  getMy: () => api.get('/scrutineering/my'),
  update: (id, d) => api.put(`/scrutineering/${id}`, d),
};

// ─── Certificates ───────────────────────────────────────────────
export const certificateAPI = {
  download: () => api.get('/certificates/download', { responseType: 'blob' }),
};

// ─── Notifications ──────────────────────────────────────────────
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ─── Leaderboard ───────────────────────────────────────────────
export const leaderboardAPI = {
  get: (competitionId, params) => api.get(`/leaderboard/${competitionId}`, { params }),
  getMyPosition: (competitionId) => api.get(`/leaderboard/${competitionId}/my`),
};

// ─── Audit Logs ────────────────────────────────────────────────
export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
};

// ─── Users (Super Admin) ───────────────────────────────────────
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getStats: () => api.get('/users/stats'),
  create: (d) => api.post('/users', d),
  update: (id, d) => api.put(`/users/${id}`, d),
  toggleActive: (id) => api.post(`/users/${id}/toggle-active`),
  resetPassword: (id) => api.post(`/users/${id}/reset-password`),
  delete: (id) => api.delete(`/users/${id}`),
};

export default api;

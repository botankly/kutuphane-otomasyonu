import axios from 'axios';

const rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://kutuphane-backend-alpha.vercel.app/api'
    : 'http://localhost:5000/api');

// Ensure baseURL never ends with a trailing slash to prevent double slash routes (e.g., //api//auth/login)
const API_URL = rawApiUrl.trim().replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: JWT Token'ı otomatik ekle
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;

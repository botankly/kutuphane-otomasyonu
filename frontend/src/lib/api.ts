import axios from 'axios';

const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kutuphane-backend-alpha.vercel.app/api';
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

import axios from 'axios';

let envUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kutuphane-backend-botan3.vercel.app/api';
envUrl = envUrl.trim().replace(/\/+$/, '');

// Prevent double /api/api pathing or missing /api suffix
if (!envUrl.endsWith('/api')) {
  envUrl = `${envUrl}/api`;
}

const API_URL = envUrl;

const api = axios.create({
  baseURL: API_URL,
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

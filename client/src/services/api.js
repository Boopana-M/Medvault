import axios from 'axios';

// Dynamically use the hostname so it works on mobile devices testing on the same network
const currentHost = window.location.hostname;
const API_URL = import.meta.env.VITE_API_URL || `http://${currentHost}:5000/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
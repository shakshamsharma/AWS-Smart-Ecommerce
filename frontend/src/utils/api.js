import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000,
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = (params) => api.get('/products', { params });
export const getProduct  = (id)     => api.get(`/products/${id}`);
export const searchProducts = (q)   => api.get('/products/search', { params: { q } });

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login    = (data) => api.post('/auth/login',    data);
export const register = (data) => api.post('/auth/register', data);
export const getMe    = ()     => api.get('/auth/me');

// ── Cart ──────────────────────────────────────────────────────────────────────
export const getCart     = ()     => api.get('/cart');
export const addToCart   = (data) => api.post('/cart/add',    data);
export const updateCart  = (data) => api.put('/cart/update',  data);
export const clearCart   = ()     => api.delete('/cart/clear');

// ── Orders ────────────────────────────────────────────────────────────────────
export const checkout   = (data) => api.post('/orders/checkout', data);
export const getOrders  = ()     => api.get('/orders');
export const getOrder   = (id)   => api.get(`/orders/${id}`);

// ── Metrics (admin) ───────────────────────────────────────────────────────────
export const getDashboard = () => api.get('/metrics/dashboard');

export default api;

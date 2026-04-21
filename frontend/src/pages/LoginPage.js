// pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../utils/api';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiLogin(form);
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name.split(' ')[0]}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="text-center mb-8">
          <span className="text-4xl">⚡</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Sign in to SmartShop</h1>
          <p className="text-sm text-gray-400 mt-1">Welcome back</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" required value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-200 transition-colors mt-2">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account? <Link to="/register" className="text-blue-600 hover:underline font-medium">Sign up</Link>
        </p>
        <div className="mt-4 p-3 bg-blue-50 rounded-xl text-xs text-blue-600 text-center">
          Demo: admin@ecommerce.com / Admin@1234
        </div>
      </div>
    </div>
  );
}

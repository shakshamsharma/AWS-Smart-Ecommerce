// pages/RegisterPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as apiRegister } from '../utils/api';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await apiRegister(form);
      login(res.data.token, res.data.user);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="text-center mb-8">
          <span className="text-4xl">⚡</span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Create account</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[['name','Full name','text','Rahul Sharma'],['email','Email','email','you@example.com'],['password','Password','password','••••••••']].map(([k, label, type, ph]) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
              <input type={type} required value={form[k]} placeholder={ph}
                onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-200 transition-colors">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account? <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

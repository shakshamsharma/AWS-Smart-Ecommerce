import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { useCart } from '../App';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { cartCount }    = useCart();
  const navigate         = useNavigate();
  const [open, setOpen]  = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">⚡</span>
            <span className="font-bold text-gray-900 text-lg">SmartShop</span>
            <span className="hidden sm:block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">AWS Powered</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/products" className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors">Products</Link>
            {user?.is_admin && (
              <Link to="/admin" className="text-gray-600 hover:text-purple-600 font-medium text-sm transition-colors">Admin Dashboard</Link>
            )}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-gray-600 hover:text-blue-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block">{user.name?.split(' ')[0]}</span>
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <Link to="/orders" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Orders</Link>
                    {user.is_admin && (
                      <Link to="/admin" onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-purple-700 hover:bg-purple-50">Admin Dashboard</Link>
                    )}
                    <hr className="my-1 border-gray-100" />
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">Sign in</Link>
                <Link to="/register" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

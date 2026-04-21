import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Navbar       from './components/Navbar';
import HomePage     from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductPage  from './pages/ProductPage';
import CartPage     from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage   from './pages/OrdersPage';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPage    from './pages/AdminPage';
import { getMe }    from './utils/api';

// ── Auth context ──────────────────────────────────────────────────────────────
export const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ── Cart context ──────────────────────────────────────────────────────────────
export const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);

function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      getMe()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setCartCount(cart.reduce((sum, i) => sum + i.quantity, 0));
  }, [cart]);

  return (
    <CartContext.Provider value={{ cart, setCart, cartCount }}>
      {children}
    </CartContext.Provider>
  );
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.is_admin ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <Routes>
                <Route path="/"           element={<HomePage />} />
                <Route path="/products"   element={<ProductsPage />} />
                <Route path="/products/:id" element={<ProductPage />} />
                <Route path="/login"      element={<LoginPage />} />
                <Route path="/register"   element={<RegisterPage />} />
                <Route path="/cart"       element={<PrivateRoute><CartPage /></PrivateRoute>} />
                <Route path="/checkout"   element={<PrivateRoute><CheckoutPage /></PrivateRoute>} />
                <Route path="/orders"     element={<PrivateRoute><OrdersPage /></PrivateRoute>} />
                <Route path="/admin"      element={<AdminRoute><AdminPage /></AdminRoute>} />
              </Routes>
            </main>
            <Toaster position="top-right" />
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

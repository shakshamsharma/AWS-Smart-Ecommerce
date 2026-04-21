// pages/CartPage.js
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCart, updateCart, clearCart } from '../utils/api';
import { useCart } from '../App';
import toast from 'react-hot-toast';

export default function CartPage() {
  const { setCart } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCart().then(r => setItems(r.data || [])).finally(() => setLoading(false));
  }, []);

  const update = async (product_id, quantity) => {
    const res = await updateCart({ product_id, quantity });
    setItems(res.data);
    setCart(res.data);
  };

  const handleClear = async () => {
    await clearCart();
    setItems([]);
    setCart([]);
    toast.success('Cart cleared');
  };

  const total = items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0);

  if (loading) return <div className="animate-pulse bg-gray-100 rounded-2xl h-64" />;

  if (items.length === 0) return (
    <div className="text-center py-24">
      <div className="text-6xl mb-4">🛒</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
      <Link to="/products" className="text-blue-600 hover:underline text-sm">Continue shopping →</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your cart ({items.length} items)</h1>
        <button onClick={handleClear} className="text-sm text-red-500 hover:text-red-700">Clear all</button>
      </div>

      <div className="space-y-3 mb-6">
        {items.map(item => (
          <div key={item.product_id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-50 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl">📦</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{item.name || `Product #${item.product_id}`}</p>
              <p className="text-sm text-gray-400">₹{Number(item.price || 0).toLocaleString('en-IN')} each</p>
            </div>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => update(item.product_id, item.quantity - 1)} className="px-2 py-1 hover:bg-gray-100 text-gray-600 text-lg">−</button>
              <span className="px-3 py-1 font-medium">{item.quantity}</span>
              <button onClick={() => update(item.product_id, item.quantity + 1)} className="px-2 py-1 hover:bg-gray-100 text-gray-600 text-lg">+</button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex justify-between mb-4">
          <span className="text-gray-600">Total</span>
          <span className="text-xl font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</span>
        </div>
        <button onClick={() => navigate('/checkout')} className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors">
          Proceed to checkout →
        </button>
      </div>
    </div>
  );
}

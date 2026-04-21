// pages/CheckoutPage.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCart, checkout } from '../utils/api';
import { useCart } from '../App';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const { setCart } = useCart();
  const navigate    = useNavigate();
  const [items, setItems]     = useState([]);
  const [placing, setPlacing] = useState(false);
  const [form, setForm] = useState({
    name: '', address: '', city: '', pincode: '', phone: '',
    payment_method: 'cod',
  });

  useEffect(() => {
    getCart().then(r => setItems(r.data || []));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const total = items.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);

  const handleOrder = async () => {
    if (!form.name || !form.address || !form.city || !form.pincode) {
      toast.error('Please fill all address fields');
      return;
    }
    setPlacing(true);
    try {
      const res = await checkout({
        items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        shipping_address: { name: form.name, address: form.address, city: form.city, pincode: form.pincode, phone: form.phone },
        payment_method: form.payment_method,
      });
      setCart([]);
      toast.success('Order placed successfully!');
      navigate(`/orders`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed');
    } finally {
      setPlacing(false);
    }
  };

  const Field = ({ label, k, type = 'text', placeholder }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-4">Shipping address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" k="name" placeholder="Rahul Sharma" />
          <Field label="Phone" k="phone" type="tel" placeholder="+91 98765 43210" />
          <div className="sm:col-span-2"><Field label="Address" k="address" placeholder="Street, area, landmark" /></div>
          <Field label="City" k="city" placeholder="Mumbai" />
          <Field label="PIN code" k="pincode" placeholder="400001" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Payment method</h2>
        {[['cod', 'Cash on delivery'], ['upi', 'UPI'], ['card', 'Credit / Debit card']].map(([val, label]) => (
          <label key={val} className={`flex items-center gap-3 p-3 rounded-xl border mb-2 cursor-pointer transition-colors ${form.payment_method === val ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <input type="radio" name="payment" value={val} checked={form.payment_method === val} onChange={() => set('payment_method', val)} className="accent-blue-600" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </label>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex justify-between mb-4">
          <span className="text-gray-600">{items.length} items</span>
          <span className="font-bold text-gray-900">₹{total.toLocaleString('en-IN')}</span>
        </div>
        <button onClick={handleOrder} disabled={placing || items.length === 0}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-200 transition-colors">
          {placing ? 'Placing order...' : 'Place order'}
        </button>
      </div>
    </div>
  );
}

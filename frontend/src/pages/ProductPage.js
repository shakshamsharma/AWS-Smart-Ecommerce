// pages/ProductPage.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProduct, addToCart } from '../utils/api';
import { useCart } from '../App';
import toast from 'react-hot-toast';

export default function ProductPage() {
  const { id } = useParams();
  const { setCart } = useCart();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    getProduct(id).then(r => setProduct(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const res = await addToCart({ product_id: product.id, quantity: qty });
      setCart(res.data);
      toast.success('Added to cart!');
    } catch { toast.error('Could not add to cart'); }
    finally { setAdding(false); }
  };

  if (loading) return <div className="animate-pulse bg-gray-100 rounded-2xl h-96" />;
  if (!product) return <div className="text-center py-24 text-gray-400">Product not found</div>;

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10">
      <div className="bg-gray-50 rounded-3xl aspect-square flex items-center justify-center overflow-hidden">
        {product.image_url
          ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          : <div className="text-gray-300 text-7xl">📦</div>}
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-sm text-gray-400 mb-1">{product.category_name}</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{product.name}</h1>
        <p className="text-3xl font-bold text-blue-600 mb-4">₹{Number(product.price).toLocaleString('en-IN')}</p>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm font-medium text-gray-700">Qty</label>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 hover:bg-gray-100 text-gray-600">−</button>
            <span className="px-4 py-2 font-medium text-gray-900 min-w-[3rem] text-center">{qty}</span>
            <button onClick={() => setQty(q => Math.min(product.stock_qty, q + 1))} className="px-3 py-2 hover:bg-gray-100 text-gray-600">+</button>
          </div>
          <span className="text-xs text-gray-400">{product.stock_qty} in stock</span>
        </div>
        <button onClick={handleAdd} disabled={adding || product.stock_qty === 0}
          className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors">
          {adding ? 'Adding...' : product.stock_qty === 0 ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </div>
  );
}

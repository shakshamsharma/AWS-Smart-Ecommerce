import React from 'react';
import { Link } from 'react-router-dom';
import { addToCart } from '../utils/api';
import { useCart } from '../App';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const { setCart } = useCart();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    try {
      const res = await addToCart({ product_id: product.id, quantity: 1 });
      setCart(res.data);
      toast.success(`${product.name.substring(0, 30)}... added to cart`);
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Please sign in to add items to cart');
      } else {
        toast.error('Could not add to cart');
      }
    }
  };

  const isLowStock = product.stock_qty > 0 && product.stock_qty <= 10;
  const isOOS      = product.stock_qty === 0;

  return (
    <Link to={`/products/${product.id}`} className="group block">
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
        {/* Image */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          {isLowStock && !isOOS && (
            <span className="absolute top-2 left-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              Only {product.stock_qty} left
            </span>
          )}
          {isOOS && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-500 bg-white px-3 py-1 rounded-full border">Out of stock</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-xs text-gray-400 mb-1">{product.category_name}</p>
          <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-gray-900">
              ₹{Number(product.price).toLocaleString('en-IN')}
            </span>
            <button
              onClick={handleAddToCart}
              disabled={isOOS}
              className="text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Add to cart
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

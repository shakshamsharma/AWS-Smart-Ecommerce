import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../utils/api';

const CATEGORIES = [
  { label: 'All',          value: '' },
  { label: 'Electronics',  value: 'electronics' },
  { label: 'Clothing',     value: 'clothing' },
  { label: 'Home & Kitchen', value: 'home-kitchen' },
  { label: 'Sports',       value: 'sports' },
];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);

  const category = searchParams.get('category') || '';
  const sort     = searchParams.get('sort')     || 'created_at';
  const page     = parseInt(searchParams.get('page') || '1', 10);
  const LIMIT    = 12;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProducts({ page, limit: LIMIT, category, sort });
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, category, sort]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const set = (key, val) => {
    const p = new URLSearchParams(searchParams);
    p.set(key, val);
    p.set('page', '1');
    setSearchParams(p);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {category ? CATEGORIES.find(c => c.value === category)?.label : 'All Products'}
          <span className="ml-2 text-base font-normal text-gray-400">({total} items)</span>
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={e => set('sort', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="created_at">Newest</option>
            <option value="price">Price: Low to High</option>
          </select>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => set('category', cat.value)}
            className={`whitespace-nowrap text-sm px-4 py-2 rounded-full border transition-colors ${
              category === cat.value
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(LIMIT)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-lg font-medium">No products found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => {
                const p = new URLSearchParams(searchParams);
                p.set('page', i + 1);
                setSearchParams(p);
              }}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                page === i + 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

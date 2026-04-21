// pages/HomePage.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../utils/api';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getProducts({ limit: 8, sort: 'created_at', order: 'DESC' })
      .then(res => setFeatured(res.data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-10 mb-12 relative overflow-hidden">
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-xs font-medium mb-4">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            AWS Auto-Scaling Active — 0 downtime
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Shop without limits.<br />We scale with you.
          </h1>
          <p className="text-blue-100 mb-6 text-sm">
            Powered by AWS Auto Scaling + AI traffic prediction. No crashes during flash sales — ever.
          </p>
          <Link to="/products" className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors">
            Shop now →
          </Link>
        </div>
        <div className="absolute right-8 top-8 text-8xl opacity-20 select-none">⚡</div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
        {[
          { name: 'Electronics', icon: '📱', slug: 'electronics', color: 'bg-blue-50 text-blue-700' },
          { name: 'Clothing',    icon: '👕', slug: 'clothing',    color: 'bg-pink-50 text-pink-700' },
          { name: 'Home',        icon: '🏠', slug: 'home-kitchen',color: 'bg-amber-50 text-amber-700' },
          { name: 'Sports',      icon: '🏋️', slug: 'sports',      color: 'bg-green-50 text-green-700' },
        ].map(cat => (
          <Link key={cat.slug} to={`/products?category=${cat.slug}`}
            className={`${cat.color} rounded-2xl p-5 text-center hover:scale-105 transition-transform font-medium text-sm`}>
            <div className="text-3xl mb-2">{cat.icon}</div>
            {cat.name}
          </Link>
        ))}
      </div>

      {/* Featured products */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Featured products</h2>
        <Link to="/products" className="text-sm text-blue-600 hover:underline">View all →</Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl aspect-square animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {featured.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {/* AWS badge */}
      <div className="mt-16 rounded-2xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Powered by</p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
          {['Route 53', 'CloudFront', 'ALB', 'EC2 Auto Scaling', 'RDS Multi-AZ', 'ElastiCache', 'S3', 'WAF', 'CloudWatch'].map(s => (
            <span key={s} className="bg-gray-50 px-3 py-1 rounded-full border text-xs">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

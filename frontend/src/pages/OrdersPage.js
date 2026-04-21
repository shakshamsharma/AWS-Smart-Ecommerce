import React, { useEffect, useState } from 'react';
import { getOrders } from '../utils/api';

const STATUS_STYLES = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrders().then(r => setOrders(r.data || [])).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse bg-gray-100 rounded-2xl h-64" />;

  if (orders.length === 0) return (
    <div className="text-center py-24">
      <div className="text-6xl mb-4">📋</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">No orders yet</h2>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My orders</h1>
      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-mono text-xs text-gray-400 mb-0.5">#{order.id.substring(0, 8).toUpperCase()}</p>
                <p className="font-semibold text-gray-900">₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[order.status] || 'bg-gray-100 text-gray-600'}`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
                <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

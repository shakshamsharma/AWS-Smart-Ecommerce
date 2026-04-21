import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getDashboard } from '../utils/api';

function MetricCard({ label, value, sub, color = 'blue' }) {
  const colors = { blue: 'text-blue-600', green: 'text-green-600', amber: 'text-amber-600', purple: 'text-purple-600' };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  const fetch = () => {
    setLoading(true);
    getDashboard()
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.error || 'Failed to load metrics'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="animate-pulse bg-gray-100 rounded-2xl h-24" />
      <div className="animate-pulse bg-gray-100 rounded-2xl h-64" />
    </div>
  );

  // Mock data for local dev (no AWS)
  const mock = {
    instances: { desired: 4, min: 2, max: 20, healthy: 4 },
    cpu: Array.from({ length: 12 }, (_, i) => ({
      time: new Date(Date.now() - (12 - i) * 300000).toISOString(),
      value: 35 + Math.random() * 40,
    })),
    requests: Array.from({ length: 12 }, (_, i) => ({
      time: new Date(Date.now() - (12 - i) * 300000).toISOString(),
      value: Math.floor(800 + Math.random() * 2000),
    })),
  };

  const d = data?.instances ? data : mock;
  const cpuData = (d.cpu || []).map(p => ({
    time: new Date(p.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    cpu: Math.round(p.value * 10) / 10,
  }));
  const reqData = (d.requests || []).map(p => ({
    time: new Date(p.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    requests: Math.round(p.value),
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Live AWS infrastructure metrics</p>
        </div>
        <button onClick={fetch} className="text-sm text-blue-600 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-700">
          ⚠ {error} — showing mock data for demonstration.
        </div>
      )}

      {/* Instance metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Desired instances"  value={d.instances?.desired}  sub="ASG desired capacity" color="blue" />
        <MetricCard label="Healthy instances"  value={d.instances?.healthy}  sub="passing health checks" color="green" />
        <MetricCard label="Min / Max"  value={`${d.instances?.min} / ${d.instances?.max}`} sub="ASG bounds" color="amber" />
        <MetricCard label="Avg CPU" value={`${(cpuData.at(-1)?.cpu || 0).toFixed(1)}%`} sub="last 5 min" color="purple" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">CPU utilization (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cpuData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v}%`, 'CPU']} />
              <Line type="monotone" dataKey="cpu" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4 text-sm">Request count (per 5 min)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={reqData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [v.toLocaleString(), 'Requests']} />
              <Line type="monotone" dataKey="requests" stroke="#16a34a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Architecture info */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4 text-sm">Infrastructure stack</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {[
            ['Route 53',           'DNS routing + health checks'],
            ['CloudFront CDN',     'Edge caching (400+ PoPs)'],
            ['WAF',                'DDoS + bot protection'],
            ['Application LB',     'Multi-AZ traffic distribution'],
            ['EC2 Auto Scaling',   `${d.instances?.min}–${d.instances?.max} instances`],
            ['RDS MySQL Multi-AZ', 'Automatic failover <60s'],
            ['ElastiCache Redis',  'Session + product cache'],
            ['S3 + CloudFront',    'Asset storage + CDN'],
            ['AI Predictor',       'Pre-scale 15 min early'],
          ].map(([svc, desc]) => (
            <div key={svc} className="bg-gray-50 rounded-xl p-3">
              <p className="font-medium text-gray-800 text-xs">{svc}</p>
              <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

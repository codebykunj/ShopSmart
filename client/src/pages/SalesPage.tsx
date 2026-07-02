import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import api from '../lib/api';
import {
  TrendingUp, IndianRupee, ShoppingBag, Receipt, Calendar,
} from 'lucide-react';

const rangeOptions = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: '7 Days' },
  { value: 'month', label: '30 Days' },
];

export default function SalesPage() {
  const [range, setRange] = useState('week');

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['analytics', 'sales', range],
    queryFn: () => api.get('/analytics/sales', { params: { range } }).then(r => r.data),
  });

  const { data: topProducts, isLoading: topLoading } = useQuery({
    queryKey: ['analytics', 'top-products', range],
    queryFn: () => api.get('/analytics/top-products', { params: { range } }).then(r => r.data),
  });

  const summary = salesData?.summary || { totalRevenue: 0, totalTransactions: 0, totalItemsSold: 0, avgTransaction: 0 };
  const chartData = salesData?.chartData || [];

  // Format date labels
  const formattedChartData = chartData.map((d: any) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  const maxRevenue = Math.max(...chartData.map((d: any) => d.revenue), 1);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-counter-slate">Sales Visualizer</h1>
          <p className="text-sm text-faded-docket">Revenue, trends, and top-performing products.</p>
        </div>

        {/* Date range filter */}
        <div className="flex bg-white rounded-lg border border-faded-docket/30 p-0.5">
          {rangeOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                range === opt.value
                  ? 'bg-counter-slate text-white shadow-sm'
                  : 'text-faded-docket hover:text-counter-slate'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee size={14} className="text-mint-tender" />
            <span className="text-xs text-faded-docket font-medium uppercase tracking-wider">Revenue</span>
          </div>
          <p className="font-display text-2xl text-counter-slate tabular-nums">
            ₹{summary.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Receipt size={14} className="text-stamp-vermillion" />
            <span className="text-xs text-faded-docket font-medium uppercase tracking-wider">Transactions</span>
          </div>
          <p className="font-display text-2xl text-counter-slate tabular-nums">{summary.totalTransactions}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={14} className="text-counter-slate" />
            <span className="text-xs text-faded-docket font-medium uppercase tracking-wider">Items Sold</span>
          </div>
          <p className="font-display text-2xl text-counter-slate tabular-nums">{summary.totalItemsSold}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-amber-alert" />
            <span className="text-xs text-faded-docket font-medium uppercase tracking-wider">Avg. Bill</span>
          </div>
          <p className="font-display text-2xl text-counter-slate tabular-nums">
            ₹{summary.avgTransaction.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5 lg:col-span-2">
          <h2 className="font-display text-lg text-counter-slate mb-4">Revenue Overview</h2>

          {salesLoading ? (
            <div className="h-64 flex items-center justify-center text-faded-docket">Loading chart…</div>
          ) : formattedChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-faded-docket">No data for this period</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={formattedChartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2D8F6F" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2D8F6F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DB" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#B8AFA3', fontFamily: 'IBM Plex Mono' }}
                  axisLine={{ stroke: '#E8E3DB' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#B8AFA3', fontFamily: 'IBM Plex Mono' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1E2A38',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontFamily: 'IBM Plex Mono',
                    color: '#F5F0E8',
                  }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
                  labelFormatter={(label) => label}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2D8F6F"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        {/* Top Products */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card p-5">
          <h2 className="font-display text-lg text-counter-slate mb-4">Top Selling Products</h2>

          {topLoading ? (
            <div className="h-64 flex items-center justify-center text-faded-docket">Loading…</div>
          ) : !topProducts?.products?.length ? (
            <div className="h-64 flex items-center justify-center text-faded-docket text-sm">No sales data yet</div>
          ) : (
            <div className="space-y-3">
              {topProducts.products.slice(0, 8).map((product: any, idx: number) => {
                const barWidth = (product.quantity / Math.max(...topProducts.products.map((p: any) => p.quantity), 1)) * 100;
                return (
                  <div key={product.name} className="group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-counter-slate truncate pr-2 flex items-center gap-2">
                        <span className="w-5 h-5 bg-counter-slate-50 rounded text-xs flex items-center justify-center font-mono text-faded-docket font-semibold">
                          {idx + 1}
                        </span>
                        {product.name}
                      </span>
                      <span className="font-mono text-xs text-faded-docket tabular-nums shrink-0">
                        {product.quantity} sold
                      </span>
                    </div>
                    <div className="h-1.5 bg-counter-slate-50 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barWidth}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05 }}
                        className="h-full bg-stamp-vermillion rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Transactions per day bar chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-5 mt-6">
        <h2 className="font-display text-lg text-counter-slate mb-4">Daily Transactions</h2>
        {formattedChartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-faded-docket text-sm">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formattedChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DB" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#B8AFA3', fontFamily: 'IBM Plex Mono' }}
                axisLine={{ stroke: '#E8E3DB' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#B8AFA3', fontFamily: 'IBM Plex Mono' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: '#1E2A38',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontFamily: 'IBM Plex Mono',
                  color: '#F5F0E8',
                }}
              />
              <Bar dataKey="transactions" fill="#D44D2D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}

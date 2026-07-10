import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Cell } from 'recharts';
import api from '../lib/api';
import {
  TrendingUp, IndianRupee, ShoppingBag, Receipt, X,
  CreditCard, Banknote, Smartphone, Clock, ChevronRight, User,
} from 'lucide-react';

const rangeOptions = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: '7 Days' },
  { value: 'month', label: '30 Days' },
];

const paymentIcons: Record<string, any> = {
  cash: Banknote,
  card: CreditCard,
  upi: Smartphone,
};

export default function SalesPage() {
  const [range, setRange] = useState('week');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['analytics', 'sales', range],
    queryFn: () => api.get('/analytics/sales', { params: { range } }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: topProducts, isLoading: topLoading } = useQuery({
    queryKey: ['analytics', 'top-products', range],
    queryFn: () => api.get('/analytics/top-products', { params: { range } }).then(r => r.data),
    refetchInterval: 30000,
  });

  // Fetch bills for the selected date
  const { data: dayBills, isLoading: dayBillsLoading } = useQuery({
    queryKey: ['bills', 'by-date', selectedDate],
    queryFn: () => api.get('/bills', { params: { date: selectedDate, limit: 50 } }).then(r => r.data),
    enabled: !!selectedDate,
  });

  const summary = salesData?.summary || { totalRevenue: 0, totalTransactions: 0, totalItemsSold: 0, avgTransaction: 0 };
  const chartData = salesData?.chartData || [];

  // Format date labels
  const formattedChartData = chartData.map((d: any) => ({
    ...d,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  }));

  const handleBarClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.date) {
      const clickedDate = data.activePayload[0].payload.date;
      setSelectedDate(prev => prev === clickedDate ? null : clickedDate);
    }
  };

  const formatSelectedDate = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  };

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
              onClick={() => { setRange(opt.value); setSelectedDate(null); }}
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

      {/* Daily Transactions — Interactive */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-5 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg text-counter-slate">Daily Transactions</h2>
            <p className="text-xs text-faded-docket mt-0.5">Click on a bar to view transaction details for that day</p>
          </div>
          {selectedDate && (
            <button
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-counter-slate-50 text-sm text-counter-slate hover:bg-counter-slate-100 transition-colors"
            >
              <X size={14} />
              Clear selection
            </button>
          )}
        </div>

        {formattedChartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-faded-docket text-sm">No data for this period</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={formattedChartData} onClick={handleBarClick} style={{ cursor: 'pointer' }}>
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
                formatter={(value: any, name: string) => {
                  if (name === 'transactions') return [value, 'Bills'];
                  if (name === 'itemsSold') return [value, 'Items'];
                  if (name === 'revenue') return [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue'];
                  return [value, name];
                }}
              />
              <Bar dataKey="transactions" name="transactions" radius={[4, 4, 0, 0]}>
                {formattedChartData.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.date === selectedDate ? '#1E2A38' : '#D44D2D'}
                    stroke={entry.date === selectedDate ? '#1E2A38' : 'transparent'}
                    strokeWidth={entry.date === selectedDate ? 2 : 0}
                  />
                ))}
              </Bar>
              <Bar dataKey="itemsSold" name="itemsSold" radius={[4, 4, 0, 0]}>
                {formattedChartData.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-items-${index}`}
                    fill={entry.date === selectedDate ? '#2D8F6F' : '#F5C563'}
                    opacity={0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Day summary cards below the chart */}
        {!selectedDate && formattedChartData.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mt-4 pt-4 border-t border-faded-docket/20">
            {formattedChartData.slice(-7).map((day: any) => (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className="text-left p-2.5 rounded-lg border border-faded-docket/20 hover:border-counter-slate/40 hover:shadow-sm transition-all group"
              >
                <p className="text-xs text-faded-docket font-mono">{day.label}</p>
                <p className="font-display text-sm text-counter-slate mt-0.5">₹{day.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                <p className="text-[10px] text-faded-docket font-mono mt-0.5">{day.transactions} bills</p>
                <ChevronRight size={12} className="text-faded-docket/40 group-hover:text-counter-slate mt-1 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Transaction Details Panel */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg text-counter-slate">
                    Transactions on {formatSelectedDate(selectedDate)}
                  </h3>
                  <p className="text-xs text-faded-docket mt-0.5">
                    {dayBills?.pagination?.total || 0} total transaction{(dayBills?.pagination?.total || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="p-2 hover:bg-counter-slate-50 rounded-lg transition-colors"
                >
                  <X size={16} className="text-faded-docket" />
                </button>
              </div>

              {dayBillsLoading ? (
                <div className="flex items-center justify-center py-12 text-faded-docket">
                  <div className="w-5 h-5 border-2 border-counter-slate border-t-transparent rounded-full animate-spin mr-3" />
                  Loading transactions…
                </div>
              ) : !dayBills?.bills?.length ? (
                <div className="text-center py-12 text-faded-docket text-sm">
                  No transactions found for this day.
                </div>
              ) : (
                <div className="space-y-3">
                  {dayBills.bills.map((bill: any) => {
                    const PayIcon = paymentIcons[bill.paymentMethod] || Receipt;
                    return (
                      <motion.div
                        key={bill.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="border border-faded-docket/20 rounded-xl p-4 hover:border-counter-slate/30 hover:shadow-sm transition-all"
                      >
                        {/* Bill header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-counter-slate-50 flex items-center justify-center">
                              <Receipt size={16} className="text-counter-slate" />
                            </div>
                            <div>
                              <p className="font-mono text-sm text-counter-slate font-medium">{bill.invoiceNumber || bill.id.slice(0, 8)}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Clock size={10} className="text-faded-docket" />
                                <span className="text-xs text-faded-docket font-mono">
                                  {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {bill.customerName && (
                                  <>
                                    <span className="text-faded-docket/30">·</span>
                                    <User size={10} className="text-faded-docket" />
                                    <span className="text-xs text-faded-docket">{bill.customerName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-lg text-counter-slate tabular-nums">
                              ₹{Number(bill.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                            <div className="flex items-center gap-1.5 justify-end mt-0.5">
                              <PayIcon size={10} className="text-faded-docket" />
                              <span className="text-[10px] text-faded-docket font-mono uppercase">{bill.paymentMethod}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bill items */}
                        <div className="bg-counter-slate-50/50 rounded-lg p-3">
                          <div className="flex text-[10px] font-mono text-faded-docket font-semibold uppercase tracking-wider mb-2 px-1">
                            <span className="flex-1">Item</span>
                            <span className="w-12 text-right">Qty</span>
                            <span className="w-16 text-right">Price</span>
                            <span className="w-20 text-right">Total</span>
                          </div>
                          {bill.items.map((item: any, idx: number) => (
                            <div key={item.id || idx} className="flex items-center text-xs font-mono py-1 px-1 rounded hover:bg-white/60 transition-colors">
                              <span className="flex-1 text-counter-slate truncate pr-2">{item.productNameSnapshot}</span>
                              <span className="w-12 text-right text-faded-docket tabular-nums">{item.quantity}</span>
                              <span className="w-16 text-right text-faded-docket tabular-nums">₹{Number(item.unitPriceSnapshot).toFixed(2)}</span>
                              <span className="w-20 text-right text-counter-slate tabular-nums font-medium">₹{Number(item.lineTotal).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Cashier */}
                        {bill.cashier && (
                          <p className="text-[10px] text-faded-docket font-mono mt-2 px-1">
                            Cashier: {bill.cashier.name}
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Package, TrendingUp, AlertTriangle, ReceiptText,
  ArrowRight, Clock, ShoppingBag, IndianRupee,
} from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function DashboardPage() {
  const { shop, user } = useAuth();

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products?limit=100').then((r) => r.data),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: () => api.get('/products/low-stock').then((r) => r.data),
  });

  const { data: expiring } = useQuery({
    queryKey: ['products', 'expiring'],
    queryFn: () => api.get('/products/expiring').then((r) => r.data),
  });

  const { data: sales } = useQuery({
    queryKey: ['analytics', 'sales', 'week'],
    queryFn: () => api.get('/analytics/sales?range=week').then((r) => r.data),
  });

  const { data: recentBills } = useQuery({
    queryKey: ['bills', 'recent'],
    queryFn: () => api.get('/bills?limit=5').then((r) => r.data),
  });

  const totalProducts = products?.pagination?.total || 0;
  const lowStockCount = lowStock?.products?.length || 0;
  const totalStockValue = products?.products?.reduce(
    (sum: number, p: any) => sum + p.quantityInStock * Number(p.unitPrice), 0
  ) || 0;
  const weeklyRevenue = sales?.summary?.totalRevenue || 0;

  const expiringCount = (expiring?.expired?.length || 0) + (expiring?.within7Days?.length || 0);

  // Get current hour for greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={item} className="mb-8">
        <h1 className="font-display text-3xl text-counter-slate">
          {greeting}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-faded-docket mt-1">
          Here's how <span className="font-medium text-counter-slate">{shop?.name}</span> is doing today.
        </p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div variants={item} className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-faded-docket font-medium">Total Products</span>
            <div className="w-9 h-9 bg-counter-slate-50 rounded-lg flex items-center justify-center">
              <Package size={18} className="text-counter-slate" />
            </div>
          </div>
          <p className="font-display text-3xl text-counter-slate tabular-nums">{totalProducts}</p>
          <p className="text-xs text-faded-docket mt-1">items in inventory</p>
        </motion.div>

        <motion.div variants={item} className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-faded-docket font-medium">Weekly Revenue</span>
            <div className="w-9 h-9 bg-mint-tender-50 rounded-lg flex items-center justify-center">
              <IndianRupee size={18} className="text-mint-tender" />
            </div>
          </div>
          <p className="font-display text-3xl text-counter-slate tabular-nums">
            ₹{weeklyRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-faded-docket mt-1">last 7 days</p>
        </motion.div>

        <motion.div variants={item} className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-faded-docket font-medium">Low Stock</span>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-alert-50' : 'bg-counter-slate-50'}`}>
              <AlertTriangle size={18} className={lowStockCount > 0 ? 'text-amber-alert' : 'text-counter-slate-300'} />
            </div>
          </div>
          <p className={`font-display text-3xl tabular-nums ${lowStockCount > 0 ? 'text-amber-alert' : 'text-counter-slate'}`}>
            {lowStockCount}
          </p>
          <p className="text-xs text-faded-docket mt-1">items below threshold</p>
        </motion.div>

        <motion.div variants={item} className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-faded-docket font-medium">Stock Value</span>
            <div className="w-9 h-9 bg-counter-slate-50 rounded-lg flex items-center justify-center">
              <ShoppingBag size={18} className="text-counter-slate" />
            </div>
          </div>
          <p className="font-display text-3xl text-counter-slate tabular-nums">
            ₹{totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-faded-docket mt-1">total inventory value</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <motion.div variants={item} className="card p-5 lg:col-span-1">
          <h2 className="font-display text-lg text-counter-slate mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/billing"
              className="flex items-center justify-between p-3 rounded-lg bg-stamp-vermillion/5 hover:bg-stamp-vermillion/10 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ReceiptText size={18} className="text-stamp-vermillion" />
                <span className="text-sm font-medium text-counter-slate">New Bill</span>
              </div>
              <ArrowRight size={14} className="text-faded-docket group-hover:text-stamp-vermillion transition-colors" />
            </Link>
            <Link
              to="/inventory"
              className="flex items-center justify-between p-3 rounded-lg bg-counter-slate-50 hover:bg-counter-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Package size={18} className="text-counter-slate" />
                <span className="text-sm font-medium text-counter-slate">Add Product</span>
              </div>
              <ArrowRight size={14} className="text-faded-docket group-hover:text-counter-slate transition-colors" />
            </Link>
            <Link
              to="/sales"
              className="flex items-center justify-between p-3 rounded-lg bg-counter-slate-50 hover:bg-counter-slate-100 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <TrendingUp size={18} className="text-counter-slate" />
                <span className="text-sm font-medium text-counter-slate">View Sales</span>
              </div>
              <ArrowRight size={14} className="text-faded-docket group-hover:text-counter-slate transition-colors" />
            </Link>
          </div>
        </motion.div>

        {/* Recent Bills */}
        <motion.div variants={item} className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg text-counter-slate">Recent Transactions</h2>
            <Link to="/bills" className="text-xs text-stamp-vermillion font-medium hover:text-stamp-vermillion-600 flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>

          {recentBills?.bills?.length > 0 ? (
            <div className="space-y-2">
              {recentBills.bills.slice(0, 5).map((bill: any) => (
                <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg ledger-row hover:bg-counter-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-mint-tender-50 rounded-lg flex items-center justify-center font-mono text-xs text-mint-tender-600">
                      ₹
                    </div>
                    <div>
                      <p className="text-sm font-medium text-counter-slate font-mono">{bill.invoiceNumber}</p>
                      <p className="text-xs text-faded-docket flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' · '}
                        {bill.cashier?.name}
                      </p>
                    </div>
                  </div>
                  <p className="font-mono text-sm font-medium text-counter-slate tabular-nums">
                    ₹{Number(bill.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ReceiptText size={32} className="text-faded-docket/40 mx-auto mb-2" />
              <p className="text-sm text-faded-docket">No bills yet — create your first sale!</p>
              <Link to="/billing" className="btn-primary mt-3 text-xs">
                Start Billing <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </motion.div>
      </div>

      {/* Alerts row */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          {/* Low Stock Alert */}
          {lowStockCount > 0 && (
            <motion.div variants={item} className="card p-5 border-l-4 border-l-amber-alert">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-alert" />
                <h3 className="font-medium text-counter-slate text-sm">Low Stock Alert</h3>
                <span className="badge-warning">{lowStockCount} items</span>
              </div>
              <div className="space-y-1.5">
                {lowStock?.products?.slice(0, 4).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-counter-slate">{p.name}</span>
                    <span className="font-mono text-amber-alert font-medium tabular-nums">{p.quantity_in_stock} left</span>
                  </div>
                ))}
                {lowStockCount > 4 && (
                  <Link to="/inventory" className="text-xs text-stamp-vermillion font-medium mt-1 inline-block">
                    +{lowStockCount - 4} more →
                  </Link>
                )}
              </div>
            </motion.div>
          )}

          {/* Expiry Alert */}
          {expiringCount > 0 && (
            <motion.div variants={item} className="card p-5 border-l-4 border-l-stamp-vermillion">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-stamp-vermillion" />
                <h3 className="font-medium text-counter-slate text-sm">Expiring Soon</h3>
                <span className="badge-danger">{expiringCount} items</span>
              </div>
              <div className="space-y-1.5">
                {expiring?.expired?.slice(0, 2).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-counter-slate">{p.name}</span>
                    <span className="badge-danger">EXPIRED</span>
                  </div>
                ))}
                {expiring?.within7Days?.slice(0, 2).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-counter-slate">{p.name}</span>
                    <span className="badge-warning">
                      {Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}d left
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

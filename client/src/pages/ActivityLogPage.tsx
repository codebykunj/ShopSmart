import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../lib/api';
import type { ActivityLogEntry } from '../types';
import {
  Activity, Filter, ReceiptText, Package, Users,
  Shield, LogIn, Settings, ChevronLeft, ChevronRight,
  TrendingUp, User,
} from 'lucide-react';

const actionIcons: Record<string, any> = {
  BILL_CREATED: ReceiptText,
  BILL_VOIDED: ReceiptText,
  PRODUCT_CREATED: Package,
  PRODUCT_UPDATED: Package,
  PRODUCT_DELETED: Package,
  STOCK_IMPORTED: Package,
  CUSTOMER_CREATED: Users,
  CUSTOMER_UPDATED: Users,
  LOGIN: LogIn,
  LOGOUT: LogIn,
  SETTINGS_UPDATED: Settings,
};

const actionColors: Record<string, string> = {
  BILL_CREATED: 'text-mint-tender bg-mint-tender/10',
  BILL_VOIDED: 'text-stamp-vermillion bg-stamp-vermillion/10',
  PRODUCT_CREATED: 'text-blue-500 bg-blue-50',
  PRODUCT_UPDATED: 'text-amber-600 bg-amber-50',
  PRODUCT_DELETED: 'text-stamp-vermillion bg-stamp-vermillion/10',
  STOCK_IMPORTED: 'text-purple-500 bg-purple-50',
  CUSTOMER_CREATED: 'text-mint-tender bg-mint-tender/10',
  CUSTOMER_UPDATED: 'text-blue-500 bg-blue-50',
  LOGIN: 'text-counter-slate bg-counter-slate-50',
  LOGOUT: 'text-faded-docket bg-counter-slate-50',
  SETTINGS_UPDATED: 'text-amber-600 bg-amber-50',
};

const actionLabels: Record<string, string> = {
  BILL_CREATED: 'Created Bill',
  BILL_VOIDED: 'Voided Bill',
  PRODUCT_CREATED: 'Added Product',
  PRODUCT_UPDATED: 'Updated Product',
  PRODUCT_DELETED: 'Deleted Product',
  STOCK_IMPORTED: 'Imported Stock',
  CUSTOMER_CREATED: 'Added Customer',
  CUSTOMER_UPDATED: 'Updated Customer',
  LOGIN: 'Logged In',
  LOGOUT: 'Logged Out',
  SETTINGS_UPDATED: 'Updated Settings',
};

export default function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['activity', page, actionFilter],
    queryFn: () => api.get('/activity', {
      params: { page, limit: 30, action: actionFilter || undefined },
    }).then((r) => r.data),
    refetchInterval: 3000,
  });

  const { data: staffData } = useQuery({
    queryKey: ['staff-performance'],
    queryFn: () => api.get('/activity/staff-performance', { params: { days: 7 } }).then((r) => r.data),
  });

  const logs: ActivityLogEntry[] = data?.logs || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };
  const performance = staffData?.performance || [];

  const formatDetail = (log: ActivityLogEntry) => {
    if (!log.details) return '';
    if (log.action === 'BILL_CREATED') {
      return `${log.details.invoiceNumber} · ₹${Number(log.details.totalAmount).toLocaleString('en-IN')}`;
    }
    if (log.action === 'PRODUCT_CREATED' || log.action === 'PRODUCT_DELETED') {
      return log.details.name || '';
    }
    if (log.action === 'STOCK_IMPORTED') {
      return `${log.details.created} new, ${log.details.updated} restocked`;
    }
    if (log.action === 'CUSTOMER_CREATED') {
      return `${log.details.name} (${log.details.mobile})`;
    }
    return '';
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl text-counter-slate flex items-center gap-2">
          <Activity size={24} className="text-stamp-vermillion" />
          Activity Log
        </h1>
        <p className="text-sm text-faded-docket">Audit trail of all actions performed in your shop.</p>
      </div>

      {/* Staff Performance cards */}
      {performance.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display text-lg text-counter-slate mb-3 flex items-center gap-2">
            <TrendingUp size={16} /> Staff Performance (Last 7 days)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {performance.map((staff: any, idx: number) => (
              <motion.div
                key={staff.userId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="card p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-stamp-vermillion/10 rounded-full flex items-center justify-center">
                    <User size={16} className="text-stamp-vermillion" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-counter-slate">{staff.name}</p>
                    <p className="text-[10px] text-faded-docket font-mono uppercase">{staff.role}</p>
                  </div>
                  {idx === 0 && <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">🏆 Top</span>}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="font-display text-lg text-counter-slate tabular-nums">{staff.totalBills}</p>
                    <p className="text-[10px] text-faded-docket uppercase">Bills</p>
                  </div>
                  <div>
                    <p className="font-display text-lg text-counter-slate tabular-nums">₹{(staff.totalRevenue / 1000).toFixed(1)}k</p>
                    <p className="text-[10px] text-faded-docket uppercase">Revenue</p>
                  </div>
                  <div>
                    <p className="font-display text-lg text-counter-slate tabular-nums">₹{staff.avgBillValue}</p>
                    <p className="text-[10px] text-faded-docket uppercase">Avg Bill</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="card p-3 mb-4">
        <div className="flex items-center gap-3">
          <Filter size={14} className="text-faded-docket" />
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="input-field pr-8 appearance-none cursor-pointer max-w-[220px]"
          >
            <option value="">All Actions</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <span className="text-xs text-faded-docket ml-auto">{pagination.total} entries</span>
        </div>
      </div>

      {/* Activity log list */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-faded-docket">Loading activity…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Activity size={40} className="text-faded-docket/30 mx-auto mb-3" />
            <p className="text-faded-docket font-medium">No activity recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-faded-docket/10">
            {logs.map((log, idx) => {
              const Icon = actionIcons[log.action] || Activity;
              const color = actionColors[log.action] || 'text-faded-docket bg-counter-slate-50';
              const label = actionLabels[log.action] || log.action;
              const detail = formatDetail(log);

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.02 }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-counter-slate-50/30 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-counter-slate">{label}</span>
                      {detail && <span className="text-xs text-faded-docket truncate">— {detail}</span>}
                    </div>
                    <p className="text-xs text-faded-docket">
                      by <span className="font-medium">{log.user?.name || 'System'}</span>
                      {' · '}
                      {new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {' at '}
                      {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${color} shrink-0`}>
                    {log.user?.role}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-faded-docket/20">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost text-sm disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-xs text-faded-docket">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              className="btn-ghost text-sm disabled:opacity-30"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

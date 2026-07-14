import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import type { Customer } from '../types';
import {
  Users, Search, Plus, X, Phone, Mail, Award,
  TrendingUp, UserCheck, Star, Crown, ChevronDown,
} from 'lucide-react';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.get('/customers', { params: { search: search || undefined, limit: 50 } }).then((r) => r.data),
  });

  const { data: insights } = useQuery({
    queryKey: ['customers', 'insights'],
    queryFn: () => api.get('/customers/insights').then((r) => r.data),
  });

  const customers = data?.customers || [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-counter-slate">Customer Insights</h1>
          <p className="text-sm text-faded-docket">Track customer loyalty, spending habits, and engagement.</p>
        </div>
        <button onClick={() => { setSelectedCustomer(null); setShowModal(true); }} className="btn-primary shrink-0">
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Insights cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-faded-docket font-medium uppercase tracking-wider flex items-center gap-1">
            <Users size={10} /> Total
          </p>
          <p className="font-display text-2xl text-counter-slate mt-1 tabular-nums">{insights?.totalCustomers || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-faded-docket font-medium uppercase tracking-wider flex items-center gap-1">
            <UserCheck size={10} /> Repeat
          </p>
          <p className="font-display text-2xl text-counter-slate mt-1 tabular-nums">{insights?.repeatCustomers || 0}</p>
          <p className="text-[10px] text-faded-docket">{insights?.repeatRate || 0}% return rate</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-faded-docket font-medium uppercase tracking-wider flex items-center gap-1">
            <TrendingUp size={10} /> Avg Spend
          </p>
          <p className="font-display text-2xl text-counter-slate mt-1 tabular-nums">
            ₹{(insights?.avgSpend || 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-faded-docket font-medium uppercase tracking-wider flex items-center gap-1">
            Avg Visits
          </p>
          <p className="font-display text-2xl text-counter-slate mt-1 tabular-nums">{insights?.avgVisits || 0}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-amber-alert">
          <p className="text-xs text-faded-docket font-medium uppercase tracking-wider flex items-center gap-1">
            <Award size={10} /> Loyalty Pool
          </p>
          <p className="font-display text-2xl text-amber-alert mt-1 tabular-nums">
            {(insights?.totalLoyaltyPoints || 0).toLocaleString('en-IN')} pts
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="card p-3 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faded-docket" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile, or email…"
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Customer table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-faded-docket/20 bg-counter-slate-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider">Contact</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider">Total Spent</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider">Visits</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider">Points</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider">Last Visit</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-faded-docket">Loading customers…</td></tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <Users size={40} className="text-faded-docket/30 mx-auto mb-3" />
                    <p className="text-faded-docket font-medium">No customers yet</p>
                    <p className="text-sm text-faded-docket/70 mt-1">Customers are auto-created when you enter a mobile number during billing.</p>
                  </td>
                </tr>
              ) : (
                customers.map((customer: Customer, idx: number) => {
                  const spent = Number(customer.totalSpent);
                  const tier = spent >= 10000 ? 'gold' : spent >= 5000 ? 'silver' : 'bronze';
                  return (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-faded-docket/10 hover:bg-counter-slate-50/30 transition-colors cursor-pointer"
                      onClick={() => { setSelectedCustomer(customer); setShowModal(true); }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            tier === 'gold' ? 'bg-amber-100 text-amber-700' :
                            tier === 'silver' ? 'bg-gray-100 text-gray-600' :
                            'bg-orange-50 text-orange-600'
                          }`}>
                            {tier === 'gold' ? <Crown size={14} /> : customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm text-counter-slate">{customer.name}</p>
                            {tier === 'gold' && <p className="text-[10px] text-amber-600 font-medium">⭐ Gold Member</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-faded-docket">
                          <Phone size={11} /> {customer.mobile}
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1 text-xs text-faded-docket/60">
                            <Mail size={10} /> {customer.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums font-medium text-counter-slate">
                        ₹{spent.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-counter-slate">
                        {customer.visitCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm tabular-nums text-amber-600 font-medium flex items-center gap-0.5 justify-end">
                          <Star size={11} /> {customer.loyaltyPoints}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-faded-docket">
                        {customer.lastVisitAt
                          ? new Date(customer.lastVisitAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          : '—'}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Modal */}
      <AnimatePresence>
        {showModal && <CustomerModal customer={selectedCustomer} onClose={() => { setShowModal(false); setSelectedCustomer(null); }} />}
      </AnimatePresence>
    </div>
  );
}

function CustomerModal({ customer, onClose }: { customer: Customer | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEditing = !!customer;

  const [form, setForm] = useState({
    name: customer?.name || '',
    mobile: customer?.mobile || '',
    email: customer?.email || '',
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        await api.put(`/customers/${customer!.id}`, form);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', form);
        toast.success('Customer added');
      }
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-counter-slate/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="card p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-counter-slate">
            {isEditing ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-counter-slate-50 rounded-lg transition-colors">
            <X size={18} className="text-faded-docket" />
          </button>
        </div>

        {/* Show stats if editing */}
        {isEditing && customer && (
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-counter-slate-50/50 rounded-lg p-3 text-center">
              <p className="font-display text-xl text-counter-slate tabular-nums">₹{Number(customer.totalSpent).toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-faded-docket uppercase">Total Spent</p>
            </div>
            <div className="bg-counter-slate-50/50 rounded-lg p-3 text-center">
              <p className="font-display text-xl text-counter-slate tabular-nums">{customer.visitCount}</p>
              <p className="text-[10px] text-faded-docket uppercase">Visits</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <p className="font-display text-xl text-amber-600 tabular-nums">{customer.loyaltyPoints}</p>
              <p className="text-[10px] text-faded-docket uppercase">Points</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-counter-slate mb-1">Name *</label>
            <input type="text" value={form.name} onChange={updateField('name')} className="input-field" placeholder="Customer name" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-counter-slate mb-1">Mobile *</label>
            <input
              type="tel"
              value={form.mobile}
              onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value.replace(/\D/g, '') }))}
              className="input-field font-mono"
              placeholder="9876543210"
              maxLength={10}
              required
              disabled={isEditing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-counter-slate mb-1">
              Email <span className="text-faded-docket font-normal">(optional)</span>
            </label>
            <input type="email" value={form.email} onChange={updateField('email')} className="input-field" placeholder="customer@email.com" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isEditing ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import toast from 'react-hot-toast';
import type { Product } from '../types';
import {
  Package, Search, Plus, Edit2, Trash2, X,
  AlertTriangle, Clock, Filter, ChevronDown, ChevronUp,
  Camera, TrendingUp,
} from 'lucide-react';
import ScanStockModal from '../components/ScanStockModal';

export default function InventoryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.role === 'OWNER';

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showScanStock, setShowScanStock] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, categoryFilter, sortBy, sortOrder],
    queryFn: () => api.get('/products', {
      params: { search: search || undefined, category: categoryFilter || undefined, sortBy, sortOrder, limit: 100 },
    }).then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => api.get('/products/categories').then((r) => r.data),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: () => api.get('/products/low-stock').then((r) => r.data),
  });

  const { data: expiring } = useQuery({
    queryKey: ['products', 'expiring'],
    queryFn: () => api.get('/products/expiring').then((r) => r.data),
  });

  const { data: profitStats } = useQuery({
    queryKey: ['products', 'profit-stats'],
    queryFn: () => api.get('/products/profit-stats').then((r) => r.data),
    enabled: isOwner,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: () => toast.error('Failed to delete product'),
  });

  const products = data?.products || [];
  const totalProducts = data?.pagination?.total || 0;
  const lowStockCount = lowStock?.products?.length || 0;
  const totalValue = products.reduce((sum: number, p: Product) => sum + p.quantityInStock * Number(p.unitPrice), 0);

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const isLowStock = (p: Product) => p.quantityInStock <= p.reorderThreshold;
  const isExpiringSoon = (p: Product) => {
    if (!p.expiryDate) return false;
    const days = (new Date(p.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 30;
  };
  const isExpired = (p: Product) => {
    if (!p.expiryDate) return false;
    return new Date(p.expiryDate) < new Date();
  };

  const getMargin = (p: Product) => {
    if (!p.costPrice) return null;
    const sell = Number(p.unitPrice);
    const cost = Number(p.costPrice);
    if (sell <= 0) return null;
    return Math.round(((sell - cost) / sell) * 1000) / 10;
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl text-counter-slate">Inventory Control Center</h1>
          <p className="text-sm text-faded-docket">Manage your products, track stock levels, and stay on top of alerts.</p>
        </div>
        {isOwner && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowScanStock(true)}
              className="btn-secondary"
            >
              <Camera size={16} /> Scan Stock Bill
            </button>
            <button
              onClick={() => { setEditingProduct(null); setShowModal(true); }}
              className="btn-primary"
            >
              <Plus size={16} /> Add Product
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="card p-4">
          <p className="text-xs text-faded-docket font-medium uppercase tracking-wider">Total SKUs</p>
          <p className="font-display text-2xl text-counter-slate mt-1 tabular-nums">{totalProducts}</p>
        </div>
        <div className={`card p-4 ${lowStockCount > 0 ? 'border-l-4 border-l-amber-alert' : ''}`}>
          <p className="text-xs text-faded-docket font-medium uppercase tracking-wider">Low Stock</p>
          <p className={`font-display text-2xl mt-1 tabular-nums ${lowStockCount > 0 ? 'text-amber-alert' : 'text-counter-slate'}`}>{lowStockCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-faded-docket font-medium uppercase tracking-wider">Stock Value</p>
          <p className="font-display text-2xl text-counter-slate mt-1 tabular-nums">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
        </div>
        <div className={`card p-4 ${(expiring?.expired?.length || 0) > 0 ? 'border-l-4 border-l-stamp-vermillion' : ''}`}>
          <p className="text-xs text-faded-docket font-medium uppercase tracking-wider">Expiring</p>
          <p className="font-display text-2xl text-counter-slate mt-1 tabular-nums">
            {(expiring?.expired?.length || 0) + (expiring?.within7Days?.length || 0) + (expiring?.within30Days?.length || 0)}
          </p>
        </div>
        {isOwner && profitStats?.summary && (
          <div className="card p-4 border-l-4 border-l-mint-tender">
            <p className="text-xs text-faded-docket font-medium uppercase tracking-wider flex items-center gap-1">
              <TrendingUp size={10} /> Avg Margin
            </p>
            <p className="font-display text-2xl text-mint-tender mt-1 tabular-nums">
              {profitStats.summary.avgMarginPercent}%
            </p>
          </div>
        )}
      </div>

      {/* Search & filter bar */}
      <div className="card p-3 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faded-docket" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, SKU, or category…"
            className="input-field pl-9"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-faded-docket" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field pl-8 pr-8 appearance-none cursor-pointer min-w-[140px]"
          >
            <option value="">All Categories</option>
            {categories?.categories?.map((cat: string) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-faded-docket/20 bg-counter-slate-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('name')}>
                  <span className="flex items-center gap-1">Product <SortIcon field="name" /></span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('category')}>
                  <span className="flex items-center gap-1">Category <SortIcon field="category" /></span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('unitPrice')}>
                  <span className="flex items-center gap-1 justify-end">Price <SortIcon field="unitPrice" /></span>
                </th>
                {isOwner && (
                  <th className="text-right px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider">
                    Margin
                  </th>
                )}
                <th className="text-right px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider cursor-pointer select-none" onClick={() => toggleSort('quantityInStock')}>
                  <span className="flex items-center gap-1 justify-end">Stock <SortIcon field="quantityInStock" /></span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider">Status</th>
                {isOwner && (
                  <th className="text-right px-4 py-3 text-xs font-semibold text-counter-slate uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-faded-docket">Loading products…</td></tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Package size={40} className="text-faded-docket/30 mx-auto mb-3" />
                    <p className="text-faded-docket font-medium">No products yet</p>
                    <p className="text-sm text-faded-docket/70 mt-1">Add your first product to start tracking inventory.</p>
                    {isOwner && (
                      <div className="flex gap-2 justify-center mt-4">
                        <button onClick={() => setShowScanStock(true)} className="btn-secondary text-sm">
                          <Camera size={14} /> Scan Bill
                        </button>
                        <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
                          <Plus size={14} /> Add Product
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                products.map((product: Product, idx: number) => {
                  const margin = getMargin(product);
                  return (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className={`border-b border-faded-docket/10 hover:bg-counter-slate-50/30 transition-colors ${isLowStock(product) ? 'bg-amber-alert-50/30' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm text-counter-slate">{product.name}</p>
                          {product.sku && <p className="text-xs text-faded-docket font-mono">{product.sku}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-counter-slate-400 bg-counter-slate-50 px-2 py-0.5 rounded text-xs font-medium">
                          {product.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-mono text-sm tabular-nums">₹{Number(product.unitPrice).toFixed(2)}</p>
                        {product.costPrice && (
                          <p className="font-mono text-[10px] text-faded-docket tabular-nums">Cost: ₹{Number(product.costPrice).toFixed(2)}</p>
                        )}
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right">
                          {margin !== null ? (
                            <span className={`font-mono text-xs font-medium tabular-nums ${
                              margin >= 30 ? 'text-mint-tender' : margin >= 15 ? 'text-amber-alert' : 'text-stamp-vermillion'
                            }`}>
                              {margin}%
                            </span>
                          ) : (
                            <span className="text-xs text-faded-docket/40">—</span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-sm font-medium tabular-nums ${isLowStock(product) ? 'text-amber-alert' : 'text-counter-slate'}`}>
                          {product.quantityInStock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isExpired(product) && <span className="badge-danger text-[10px]">EXPIRED</span>}
                          {!isExpired(product) && isExpiringSoon(product) && (
                            <span className="badge-warning text-[10px] flex items-center gap-0.5">
                              <Clock size={9} />
                              {Math.ceil((new Date(product.expiryDate!).getTime() - Date.now()) / (1000*60*60*24))}d
                            </span>
                          )}
                          {isLowStock(product) && <span className="badge-warning text-[10px] flex items-center gap-0.5"><AlertTriangle size={9} />Low</span>}
                          {!isLowStock(product) && !isExpired(product) && !isExpiringSoon(product) && <span className="badge-success text-[10px]">In Stock</span>}
                        </div>
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditingProduct(product); setShowModal(true); }}
                              className="p-1.5 rounded-lg hover:bg-counter-slate-50 text-faded-docket hover:text-counter-slate transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Delete "${product.name}"?`)) {
                                  deleteMutation.mutate(product.id);
                                }
                              }}
                              className="p-1.5 rounded-lg hover:bg-stamp-vermillion-50 text-faded-docket hover:text-stamp-vermillion transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      <AnimatePresence>
        {showModal && (
          <ProductModal
            product={editingProduct}
            onClose={() => { setShowModal(false); setEditingProduct(null); }}
          />
        )}
      </AnimatePresence>

      {/* Scan Stock Modal */}
      <AnimatePresence>
        {showScanStock && (
          <ScanStockModal onClose={() => setShowScanStock(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const isEditing = !!product;

  const [form, setForm] = useState({
    name: product?.name || '',
    category: product?.category || 'General',
    unitPrice: product ? String(Number(product.unitPrice)) : '',
    costPrice: product?.costPrice ? String(Number(product.costPrice)) : '',
    quantityInStock: product ? String(product.quantityInStock) : '0',
    reorderThreshold: product ? String(product.reorderThreshold) : '10',
    sku: product?.sku || '',
    expiryDate: product?.expiryDate ? product.expiryDate.slice(0, 10) : '',
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: form.name,
      category: form.category,
      unitPrice: parseFloat(form.unitPrice),
      costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
      quantityInStock: parseInt(form.quantityInStock, 10),
      reorderThreshold: parseInt(form.reorderThreshold, 10),
      sku: form.sku || undefined,
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
    };

    try {
      if (isEditing) {
        await api.put(`/products/${product!.id}`, payload);
        toast.success('Product updated');
      } else {
        await api.post('/products', payload);
        toast.success('Product added');
      }
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  // Calculate margin preview
  const sellPrice = parseFloat(form.unitPrice) || 0;
  const costPrice = parseFloat(form.costPrice) || 0;
  const margin = sellPrice > 0 && costPrice > 0 ? Math.round(((sellPrice - costPrice) / sellPrice) * 1000) / 10 : null;

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
        className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl text-counter-slate">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-counter-slate-50 rounded-lg transition-colors">
            <X size={18} className="text-faded-docket" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-counter-slate mb-1">Product name *</label>
            <input type="text" value={form.name} onChange={updateField('name')} className="input-field" placeholder="e.g. Tata Salt (1kg)" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-counter-slate mb-1">Category</label>
              <input type="text" value={form.category} onChange={updateField('category')} className="input-field" placeholder="Groceries" />
            </div>
            <div>
              <label className="block text-sm font-medium text-counter-slate mb-1">SKU / Barcode</label>
              <input type="text" value={form.sku} onChange={updateField('sku')} className="input-field" placeholder="GR001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-counter-slate mb-1">Selling Price (₹) *</label>
              <input type="number" step="0.01" min="0" value={form.unitPrice} onChange={updateField('unitPrice')} className="input-field font-mono" placeholder="0.00" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-counter-slate mb-1">
                Cost Price (₹) <span className="text-faded-docket font-normal text-xs">(optional)</span>
              </label>
              <input type="number" step="0.01" min="0" value={form.costPrice} onChange={updateField('costPrice')} className="input-field font-mono" placeholder="0.00" />
            </div>
          </div>

          {/* Margin preview */}
          {margin !== null && (
            <div className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
              margin >= 30 ? 'bg-mint-tender/10 text-mint-tender' : margin >= 15 ? 'bg-amber-alert/10 text-amber-alert' : 'bg-stamp-vermillion/10 text-stamp-vermillion'
            }`}>
              Profit margin: {margin}% · Profit per unit: ₹{(sellPrice - costPrice).toFixed(2)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-counter-slate mb-1">In Stock *</label>
              <input type="number" min="0" value={form.quantityInStock} onChange={updateField('quantityInStock')} className="input-field font-mono" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-counter-slate mb-1">Reorder At</label>
              <input type="number" min="0" value={form.reorderThreshold} onChange={updateField('reorderThreshold')} className="input-field font-mono" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-counter-slate mb-1">
              Expiry Date <span className="text-faded-docket font-normal">(optional)</span>
            </label>
            <input type="date" value={form.expiryDate} onChange={updateField('expiryDate')} className="input-field" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isEditing ? 'Update Product' : 'Add Product'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

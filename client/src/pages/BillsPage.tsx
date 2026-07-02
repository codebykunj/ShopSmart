import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  ScrollText, Download, Clock, Banknote, CreditCard, Smartphone,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import type { Bill } from '../types';

export default function BillsPage() {
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['bills', page],
    queryFn: () => api.get('/bills', { params: { page, limit: 15 } }).then(r => r.data),
  });

  const bills: Bill[] = data?.bills || [];
  const totalPages = data?.pagination?.totalPages || 1;

  const handleDownloadPdf = async (billId: string) => {
    try {
      const response = await api.get(`/bills/${billId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${billId.slice(0, 8)}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const paymentIcons: Record<string, typeof Banknote> = {
    cash: Banknote, card: CreditCard, upi: Smartphone,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl text-counter-slate">Transaction History</h1>
        <p className="text-sm text-faded-docket">Browse all finalized sales and download invoices.</p>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-faded-docket">Loading transactions…</div>
        ) : bills.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText size={40} className="text-faded-docket/30 mx-auto mb-3" />
            <p className="text-faded-docket font-medium">No transactions yet</p>
            <p className="text-sm text-faded-docket/70 mt-1">Finalized sales will appear here.</p>
          </div>
        ) : (
          <div>
            {bills.map((bill, idx) => {
              const isExpanded = expandedBill === bill.id;
              const PayIcon = paymentIcons[bill.paymentMethod] || Banknote;

              return (
                <motion.div
                  key={bill.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`border-b border-faded-docket/10 last:border-b-0 ${isExpanded ? 'bg-counter-slate-50/30' : ''}`}
                >
                  {/* Row */}
                  <button
                    onClick={() => setExpandedBill(isExpanded ? null : bill.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-counter-slate-50/30 transition-colors"
                  >
                    <div className="w-9 h-9 bg-mint-tender-50 rounded-lg flex items-center justify-center shrink-0">
                      {isExpanded ? <ChevronDown size={16} className="text-mint-tender" /> : <ChevronRight size={16} className="text-mint-tender" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-medium text-counter-slate">{bill.invoiceNumber || 'N/A'}</p>
                      <p className="text-xs text-faded-docket flex items-center gap-1.5">
                        <Clock size={10} />
                        {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        {bill.cashier && <span> · {bill.cashier.name}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-faded-docket">
                      <PayIcon size={14} />
                      <span className="uppercase font-mono">{bill.paymentMethod}</span>
                    </div>
                    <p className="font-mono text-sm font-semibold text-counter-slate tabular-nums">
                      ₹{Number(bill.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="px-5 pb-4"
                    >
                      <div className="ml-13 border-l-2 border-faded-docket/20 pl-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-faded-docket uppercase tracking-wider">
                              <th className="text-left py-1 font-semibold">Item</th>
                              <th className="text-right py-1 font-semibold">Qty</th>
                              <th className="text-right py-1 font-semibold">Price</th>
                              <th className="text-right py-1 font-semibold">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bill.items.map((item) => (
                              <tr key={item.id} className="border-t border-faded-docket/10">
                                <td className="py-1.5 text-counter-slate">{item.productNameSnapshot}</td>
                                <td className="py-1.5 text-right font-mono tabular-nums">{item.quantity}</td>
                                <td className="py-1.5 text-right font-mono tabular-nums">₹{Number(item.unitPriceSnapshot).toFixed(2)}</td>
                                <td className="py-1.5 text-right font-mono font-medium tabular-nums">₹{Number(item.lineTotal).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => handleDownloadPdf(bill.id)}
                            className="btn-ghost text-xs text-stamp-vermillion hover:bg-stamp-vermillion-50"
                          >
                            <Download size={14} /> Download PDF
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-5 py-4 border-t border-faded-docket/10">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-ghost text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-faded-docket font-mono">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-ghost text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

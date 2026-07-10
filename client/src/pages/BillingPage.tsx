import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../lib/auth';
import toast from 'react-hot-toast';
import type { Product, CartItem } from '../types';
import {
  Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone,
  ShoppingCart, Camera, Check, Download, ReceiptText, X,
} from 'lucide-react';
import { loadScript } from '../lib/utils';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BillingPage() {
  const { shop } = useAuth();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('cash');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [isFinalized, setIsFinalized] = useState(false);
  const [finalizedBillId, setFinalizedBillId] = useState<string | null>(null);
  const [showStamp, setShowStamp] = useState(false);
  const [showScanUpload, setShowScanUpload] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: searchResults } = useQuery({
    queryKey: ['product-search', searchQuery],
    queryFn: () => api.get('/products', { params: { search: searchQuery, limit: 8 } }).then(r => r.data),
    enabled: searchQuery.length >= 2,
  });

  const { data: allProductsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => api.get('/products', { params: { limit: 100 } }).then(r => r.data),
  });

  const finalizeMutation = useMutation({
    mutationFn: (data: { items: any[]; paymentMethod: string; customerName?: string; customerMobile?: string; }) => api.post('/bills', data),
    onSuccess: (res) => {
      setIsFinalized(true);
      setFinalizedBillId(res.data.bill.id);
      setShowStamp(true);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success('Sale finalized!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to finalize sale');
    },
  });

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, lineTotal: (item.quantity + 1) * item.unitPrice }
            : item
        );
      }
      const price = Number(product.unitPrice);
      return [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice: price,
        lineTotal: price,
      }];
    });
    setSearchQuery('');
    setShowSearch(false);
  }, []);

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: newQty, lineTotal: newQty * item.unitPrice };
    }));
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);

  const handleFinalize = async () => {
    if (cart.length === 0) {
      toast.error('Add at least one item to the bill');
      return;
    }

    if (paymentMethod === 'cash') {
      executeFinalize();
    } else {
      await handleRazorpayCheckout();
    }
  };

  const handleRazorpayCheckout = async () => {
    const res = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!res) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      return;
    }

    const toastId = toast.loading('Initializing payment...');

    try {
      const orderData = await api.post('/payments/create-order', { amount: cartTotal });
      const { id: order_id, currency, amount } = orderData.data.data;

      toast.dismiss(toastId);

      const options = {
        key: (import.meta as any).env.VITE_RAZORPAY_KEY,
        amount: amount.toString(),
        currency: currency,
        name: shop?.name || "ShopSmart",
        description: "Billing Transaction",
        order_id: order_id,
        handler: async function (response: any) {
          const verifyToast = toast.loading('Verifying payment...');
          try {
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              items: cart.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
              paymentMethod,
              customerName: customerName.trim() || undefined,
              customerMobile: customerMobile.trim() || undefined,
            });

            toast.success('Payment successful!', { id: verifyToast });
            setIsFinalized(true);
            setFinalizedBillId(verifyRes.data.bill.id);
            setShowStamp(true);
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['bills'] });
            queryClient.invalidateQueries({ queryKey: ['analytics'] });
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Payment verification failed', { id: verifyToast });
          }
        },
        prefill: {
          name: customerName,
          contact: customerMobile,
        },
        theme: {
          color: "#0f172a", // counter-slate color
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.on('payment.failed', function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      paymentObject.open();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Could not initiate payment', { id: toastId });
    }
  };

  const executeFinalize = () => {
    finalizeMutation.mutate({
      items: cart.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      paymentMethod,
      customerName: customerName.trim() || undefined,
      customerMobile: customerMobile.trim() || undefined,
    });
  };

  const handleNewBill = () => {
    setCart([]);
    setIsFinalized(false);
    setFinalizedBillId(null);
    setShowStamp(false);
    setPaymentMethod('cash');
    setCustomerName('');
    setCustomerMobile('');
  };

  const handleDownloadPdf = async () => {
    if (!finalizedBillId) return;
    try {
      const response = await api.get(`/bills/${finalizedBillId}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${finalizedBillId.slice(0, 8)}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download PDF');
    }
  };

  const handleWhatsAppShare = async () => {
    if (!customerMobile || customerMobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number before finalizing to use WhatsApp');
      return;
    }
    const toastId = toast.loading(`Sending bill to ${customerMobile} via WhatsApp...`);
    try {
      const res = await api.post(`/bills/${finalizedBillId}/whatsapp`);
      toast.success(res.data.message, { id: toastId });
    } catch {
      toast.error('Failed to send WhatsApp message', { id: toastId });
    }
  };

  // Handle OCR scan upload
  const handleScanUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    setShowScanUpload(false);

    const toastId = toast.loading('Processing bill scan… This may take a moment.');
    try {
      const { data } = await api.post('/scans', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const parsed = data.scan.parsed;
      if (parsed?.lineItems?.length > 0) {
        const newItems: CartItem[] = parsed.lineItems.map((item: any) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
        }));
        setCart(prev => [...prev, ...newItems]);
        toast.success(`Scanned ${parsed.lineItems.length} items — please review`, { id: toastId });
      } else {
        toast.error("Couldn't extract items — try better lighting or add manually", { id: toastId });
      }
    } catch {
      toast.error('Scan failed — please try again or add items manually', { id: toastId });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-counter-slate">Smart Billing Terminal</h1>
          <p className="text-sm text-faded-docket">Add items to the bill, review, and finalize the sale.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Item entry */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search + Scan buttons */}
          <div className="card p-4">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faded-docket" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Search products to add…"
                  className="input-field pl-9"
                  disabled={isFinalized}
                />

                {/* Search dropdown */}
                <AnimatePresence>
                  {showSearch && searchQuery.length >= 2 && searchResults?.products?.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full left-0 right-0 mt-1 card p-1 z-20 max-h-60 overflow-y-auto"
                    >
                      {searchResults.products.map((product: Product) => (
                        <button
                          key={product.id}
                          onClick={() => addToCart(product)}
                          className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-counter-slate-50 text-left transition-colors"
                        >
                          <div>
                            <p className="text-sm font-medium text-counter-slate">{product.name}</p>
                            <p className="text-xs text-faded-docket">{product.category} · {product.quantityInStock} in stock</p>
                          </div>
                          <span className="font-mono text-sm text-counter-slate tabular-nums">₹{Number(product.unitPrice).toFixed(2)}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => setShowScanUpload(true)}
                className="btn-secondary shrink-0"
                disabled={isFinalized}
              >
                <Camera size={16} /> Scan
              </button>
            </div>

            {/* Cart items */}
            {cart.length > 0 && (
              <div className="space-y-1 mb-6">
                <AnimatePresence mode="popLayout">
                  {cart.map((item, index) => (
                    <motion.div
                      key={`${item.productId || item.productName}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      layout
                      className="flex items-center gap-3 p-3 rounded-lg bg-counter-slate-50/50 hover:bg-counter-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-counter-slate truncate">{item.productName}</p>
                        <p className="text-xs text-faded-docket font-mono tabular-nums">
                          ₹{item.unitPrice.toFixed(2)} × {item.quantity}
                        </p>
                      </div>

                      {!isFinalized && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(index, -1)}
                            className="w-7 h-7 rounded-md bg-white border border-faded-docket/30 flex items-center justify-center hover:bg-counter-slate-50 transition-colors"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-8 text-center font-mono text-sm tabular-nums font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(index, 1)}
                            className="w-7 h-7 rounded-md bg-white border border-faded-docket/30 flex items-center justify-center hover:bg-counter-slate-50 transition-colors"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      )}

                      <p className="font-mono text-sm font-medium text-counter-slate tabular-nums w-20 text-right">
                        ₹{item.lineTotal.toFixed(2)}
                      </p>

                      {!isFinalized && (
                        <button
                          onClick={() => removeFromCart(index)}
                          className="p-1 text-faded-docket hover:text-stamp-vermillion transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Quick Add Grid */}
            {!isFinalized && (
              <div>
                <h3 className="text-sm font-medium text-counter-slate mb-3 flex items-center gap-2">
                  <ShoppingCart size={16} className="text-faded-docket" />
                  {cart.length === 0 ? "Select Products to Add" : "Available Products"}
                </h3>
                {allProductsData?.products ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 pb-2">
                    {allProductsData.products.map((product: Product) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="p-3 text-left border border-faded-docket/20 rounded-lg hover:border-stamp-vermillion hover:bg-stamp-vermillion/5 transition-all flex flex-col justify-between h-full bg-white shadow-sm group"
                      >
                        <p className="text-sm font-medium text-counter-slate line-clamp-2 leading-tight mb-2 group-hover:text-stamp-vermillion transition-colors">{product.name}</p>
                        <p className="text-sm font-mono font-medium text-faded-docket">₹{Number(product.unitPrice).toFixed(2)}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed border-faded-docket/30 rounded-lg">
                    <div className="w-6 h-6 border-2 border-faded-docket/30 border-t-stamp-vermillion rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-faded-docket text-sm">Loading products...</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment method + Finalize */}
          {!isFinalized && cart.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
              <p className="text-sm font-medium text-counter-slate mb-3">Customer Details (Optional)</p>
              <div className="flex gap-3 mb-4">
                <input 
                  type="text" 
                  placeholder="Name" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  className="input-field flex-1" 
                />
                <input 
                  type="tel" 
                  placeholder="Mobile No." 
                  value={customerMobile} 
                  onChange={(e) => setCustomerMobile(e.target.value.replace(/\D/g, ''))} 
                  maxLength={10}
                  className="input-field flex-1" 
                />
              </div>

              <p className="text-sm font-medium text-counter-slate mb-3">Payment Method</p>
              <div className="flex gap-2 mb-4">
                {[
                  { value: 'cash', label: 'Cash', icon: Banknote },
                  { value: 'card', label: 'Card', icon: CreditCard },
                  { value: 'upi', label: 'UPI', icon: Smartphone },
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setPaymentMethod(value as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      paymentMethod === value
                        ? 'border-stamp-vermillion bg-stamp-vermillion/5 text-stamp-vermillion'
                        : 'border-faded-docket/30 text-faded-docket hover:border-counter-slate-300'
                    }`}
                  >
                    <Icon size={16} />
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleFinalize}
                disabled={finalizeMutation.isPending}
                className="btn-success w-full text-base py-3"
              >
                {finalizeMutation.isPending ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check size={18} />
                    Finalize Sale — ₹{cartTotal.toFixed(2)}
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Post-finalize actions */}
          {isFinalized && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-4 flex flex-wrap sm:flex-nowrap gap-3">
              <button onClick={handleDownloadPdf} className="btn-primary flex-1">
                <Download size={16} /> Download
              </button>
              <button onClick={handleWhatsAppShare} className="btn-primary flex-1 bg-green-600 hover:bg-green-700 border-green-600">
                <Smartphone size={16} /> WhatsApp
              </button>
              <button onClick={handleNewBill} className="btn-secondary flex-1">
                <ReceiptText size={16} /> New Bill
              </button>
            </motion.div>
          )}
        </div>

        {/* Right — Live Receipt Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-20">
            {/* Receipt container */}
            <div className="relative">
              {/* Zigzag top edge */}
              <div className="receipt-edge-top" />

              {/* Receipt body */}
              <div className="bg-white px-5 py-4 shadow-receipt relative" style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
              }}>
                {/* Shop name */}
                <div className="text-center mb-3 pb-3 border-b border-dashed border-faded-docket/40">
                  <h3 className="font-display text-lg text-counter-slate">{shop?.name || 'Your Shop'}</h3>
                  {shop?.address && <p className="text-receipt text-faded-docket font-mono">{shop.address}</p>}
                  {shop?.phone && <p className="text-receipt text-faded-docket font-mono">{shop.phone}</p>}
                </div>

                {/* Date & time */}
                <div className="flex justify-between text-receipt text-faded-docket font-mono mb-3">
                  <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <span>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Column headers */}
                <div className="flex text-receipt-sm font-mono text-faded-docket font-semibold uppercase tracking-wider border-b border-faded-docket/30 pb-1 mb-2">
                  <span className="flex-1">Item</span>
                  <span className="w-8 text-right">Qty</span>
                  <span className="w-16 text-right">Price</span>
                  <span className="w-16 text-right">Total</span>
                </div>

                {/* Line items */}
                <div className="min-h-[120px]">
                  {cart.length === 0 ? (
                    <p className="text-center text-receipt text-faded-docket/50 font-mono py-8 italic">
                      — waiting for items —
                    </p>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {cart.map((item, index) => (
                        <motion.div
                          key={`receipt-${item.productId || item.productName}-${index}`}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="flex font-mono text-receipt text-counter-slate py-0.5"
                        >
                          <span className="flex-1 truncate">{item.productName}</span>
                          <span className="w-8 text-right tabular-nums">{item.quantity}</span>
                          <span className="w-16 text-right tabular-nums">{item.unitPrice.toFixed(2)}</span>
                          <span className="w-16 text-right tabular-nums font-medium">{item.lineTotal.toFixed(2)}</span>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-dashed border-faded-docket/40 mt-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-receipt-sm text-faded-docket uppercase">Items: {cart.reduce((s, i) => s + i.quantity, 0)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-display text-lg text-counter-slate">TOTAL</span>
                    <span className="font-display text-2xl text-counter-slate tabular-nums">
                      ₹{cartTotal.toFixed(2)}
                    </span>
                  </div>
                  {cart.length > 0 && (
                    <div className="mt-1 text-receipt-sm font-mono text-faded-docket text-right">
                      {paymentMethod.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="border-t border-dashed border-faded-docket/40 mt-3 pt-3 text-center">
                  <p className="text-receipt-sm font-mono text-faded-docket">Thank you for shopping with us!</p>
                  <p className="text-[9px] font-mono text-faded-docket/50 mt-1">Powered by ShopSmart</p>
                </div>

                {/* PAID stamp overlay */}
                <AnimatePresence>
                  {showStamp && (
                    <motion.div
                      initial={{ scale: 2.5, rotate: -15, opacity: 0 }}
                      animate={{ scale: 1, rotate: -5, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    >
                      <div className="font-display text-5xl text-stamp-vermillion border-4 border-stamp-vermillion rounded-lg px-6 py-1 uppercase tracking-widest opacity-80">
                        Paid
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Zigzag bottom edge */}
              <div className="receipt-edge-bottom" />
            </div>
          </div>
        </div>
      </div>

      {/* Scan upload modal */}
      <AnimatePresence>
        {showScanUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-counter-slate/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowScanUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-counter-slate">Scan a Paper Bill</h2>
                <button onClick={() => setShowScanUpload(false)} className="p-1.5 hover:bg-counter-slate-50 rounded-lg">
                  <X size={18} className="text-faded-docket" />
                </button>
              </div>

              <p className="text-sm text-faded-docket mb-4">
                Take a photo or upload an image of a paper bill. Our AI will try to extract
                the line items for you to review.
              </p>

              <div className="border-2 border-dashed border-faded-docket/30 rounded-xl p-8 text-center hover:border-stamp-vermillion/40 transition-colors cursor-pointer relative">
                <Camera size={32} className="text-faded-docket/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-counter-slate">Click to upload or drag a photo here</p>
                <p className="text-xs text-faded-docket mt-1">JPEG, PNG, or WebP · Max 10MB</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleScanUpload(file);
                  }}
                />
              </div>

              <p className="text-xs text-faded-docket mt-3 text-center">
                Tip: Flatten the bill and use good lighting for better results.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

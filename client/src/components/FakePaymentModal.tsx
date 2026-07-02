import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CreditCard, Smartphone, CheckCircle, ShieldCheck } from 'lucide-react';

interface FakePaymentModalProps {
  amount: number;
  paymentMethod: 'card' | 'upi';
  onSuccess: () => void;
  onCancel: () => void;
}

export default function FakePaymentModal({ amount, paymentMethod, onSuccess, onCancel }: FakePaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Card state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  
  // UPI state
  const [upiId, setUpiId] = useState('');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string | null>(null);

  const handlePay = () => {
    // Basic validation just for UI feel
    if (paymentMethod === 'card') {
      if (cardNumber.length < 16 || expiry.length < 5 || cvv.length < 3) return;
    } else {
      if (!selectedUpiApp && !upiId.includes('@')) return;
    }

    setIsProcessing(true);
    
    // Fake processing delay
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      
      // Success delay before closing
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
      >
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-blue-600" size={20} />
            <span className="font-semibold text-slate-800">Secure Checkout (Mock)</span>
          </div>
          {!isProcessing && !isSuccess && (
            <button onClick={onCancel} className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-sm text-slate-500">Amount to pay</p>
            <p className="text-3xl font-bold text-slate-800">₹{amount.toFixed(2)}</p>
          </div>

          {isSuccess ? (
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              className="flex flex-col items-center justify-center py-8"
            >
              <CheckCircle size={64} className="text-green-500 mb-4" />
              <p className="text-xl font-bold text-slate-800">Payment Successful!</p>
              <p className="text-sm text-slate-500 mt-2">Redirecting...</p>
            </motion.div>
          ) : isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-slate-600 font-medium">Processing payment...</p>
              <p className="text-sm text-slate-400 mt-1">Please do not close this window</p>
            </div>
          ) : paymentMethod === 'card' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Card Number</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="text"
                    placeholder="MM/YY"
                    maxLength={5}
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CVV</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="***"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>
              <button
                onClick={handlePay}
                disabled={cardNumber.length < 16 || expiry.length < 5 || cvv.length < 3}
                className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Pay ₹{amount.toFixed(2)}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'gpay', name: 'GPay', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
                  { id: 'phonepe', name: 'PhonePe', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
                  { id: 'paytm', name: 'Paytm', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100' },
                ].map(app => (
                  <button
                    key={app.id}
                    onClick={() => { setSelectedUpiApp(app.id); setUpiId(''); }}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                      selectedUpiApp === app.id ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50 shadow-sm' : app.color
                    }`}
                  >
                    <Smartphone size={24} />
                    <span className="text-xs font-semibold">{app.name}</span>
                  </button>
                ))}
              </div>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">OR</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Enter UPI ID</label>
                <input
                  type="text"
                  placeholder="username@upi"
                  value={upiId}
                  onChange={(e) => { setUpiId(e.target.value); setSelectedUpiApp(null); }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <button
                onClick={handlePay}
                disabled={!selectedUpiApp && !upiId.includes('@')}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Pay ₹{amount.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

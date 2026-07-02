import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { Store, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', shopName: '', shopAddress: '', shopPhone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Shop registered! Welcome aboard.');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-counter-slate flex">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-stamp-vermillion rounded-xl flex items-center justify-center">
              <Store className="text-white" size={22} />
            </div>
            <span className="font-display text-white text-2xl">ShopSmart</span>
          </div>
          <h2 className="font-display text-white text-4xl lg:text-5xl leading-tight mb-4">
            Set up your shop<br />in 60 seconds.
          </h2>
          <p className="text-counter-slate-300 text-lg max-w-md leading-relaxed">
            No technical setup needed. Register, add your products, and start billing
            customers today — digitally.
          </p>
        </div>
        <p className="text-counter-slate-400 text-sm font-mono relative z-10">
          © 2024 ShopSmart — Built for local retail.
        </p>
        <div className="absolute top-20 right-0 w-96 h-96 bg-mint-tender/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-stamp-vermillion/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-ledger-cream overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-stamp-vermillion rounded-xl flex items-center justify-center">
              <Store className="text-white" size={22} />
            </div>
            <span className="font-display text-counter-slate text-2xl">ShopSmart</span>
          </div>

          <h1 className="font-display text-counter-slate text-3xl mb-2">Register your shop</h1>
          <p className="text-faded-docket mb-6">Fill in your details to get started</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-name" className="block text-sm font-medium text-counter-slate mb-1">Your name</label>
                <input id="reg-name" type="text" value={form.name} onChange={updateField('name')} className="input-field" placeholder="Rajesh Sharma" required />
              </div>
              <div>
                <label htmlFor="reg-email" className="block text-sm font-medium text-counter-slate mb-1">Email</label>
                <input id="reg-email" type="email" value={form.email} onChange={updateField('email')} className="input-field" placeholder="you@email.com" required />
              </div>
            </div>

            <div>
              <label htmlFor="reg-password" className="block text-sm font-medium text-counter-slate mb-1">Password</label>
              <div className="relative">
                <input id="reg-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={updateField('password')} className="input-field pr-10" placeholder="Min. 6 characters" required minLength={6} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-faded-docket hover:text-counter-slate transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-faded-docket/20">
              <p className="text-xs text-faded-docket font-medium uppercase tracking-wider mb-3">Shop Details</p>
            </div>

            <div>
              <label htmlFor="reg-shop" className="block text-sm font-medium text-counter-slate mb-1">Shop name</label>
              <input id="reg-shop" type="text" value={form.shopName} onChange={updateField('shopName')} className="input-field" placeholder="Sharma General Store" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-address" className="block text-sm font-medium text-counter-slate mb-1">Address <span className="text-faded-docket">(optional)</span></label>
                <input id="reg-address" type="text" value={form.shopAddress} onChange={updateField('shopAddress')} className="input-field" placeholder="42, MG Road" />
              </div>
              <div>
                <label htmlFor="reg-phone" className="block text-sm font-medium text-counter-slate mb-1">Phone <span className="text-faded-docket">(optional)</span></label>
                <input id="reg-phone" type="tel" value={form.shopPhone} onChange={updateField('shopPhone')} className="input-field" placeholder="+91 98765 43210" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Register Shop <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-faded-docket">
            Already have an account?{' '}
            <Link to="/login" className="text-stamp-vermillion font-medium hover:text-stamp-vermillion-600 transition-colors">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

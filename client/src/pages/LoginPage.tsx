import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { Store, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-counter-slate flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 bg-stamp-vermillion rounded-xl flex items-center justify-center">
              <Store className="text-white" size={22} />
            </div>
            <span className="font-display text-white text-2xl">ShopSmart</span>
          </div>
          <h2 className="font-display text-white text-4xl lg:text-5xl leading-tight mb-4">
            Smart billing<br />for smart shops.
          </h2>
          <p className="text-counter-slate-300 text-lg max-w-md leading-relaxed">
            Replace paper ledgers with AI-powered billing. Scan bills, track inventory,
            and grow your business — all from one screen.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-counter-slate-400 text-sm font-mono">
            © 2024 ShopSmart — Built for local retail.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-stamp-vermillion/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-mint-tender/5 rounded-full blur-3xl" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-ledger-cream">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-stamp-vermillion rounded-xl flex items-center justify-center">
              <Store className="text-white" size={22} />
            </div>
            <span className="font-display text-counter-slate text-2xl">ShopSmart</span>
          </div>

          <h1 className="font-display text-counter-slate text-3xl mb-2">Welcome back</h1>
          <p className="text-faded-docket mb-8">Sign in to your shop dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-counter-slate mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@yourshop.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-counter-slate mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-faded-docket hover:text-counter-slate transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Sign in
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-faded-docket">
            New to ShopSmart?{' '}
            <Link to="/register" className="text-stamp-vermillion font-medium hover:text-stamp-vermillion-600 transition-colors">
              Register your shop
            </Link>
          </p>

          {/* Demo credentials hint */}
          <div className="mt-8 p-3 bg-counter-slate-50 rounded-lg border border-faded-docket/20">
            <p className="text-xs text-faded-docket font-mono text-center">
              Demo: kunj@shopsmart.demo / password123
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

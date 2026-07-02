import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../lib/auth';
import {
  LayoutDashboard,
  Package,
  ReceiptText,
  BarChart3,
  ScrollText,
  LogOut,
  Menu,
  X,
  User,
  Store,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/billing', label: 'Billing', icon: ReceiptText },
  { path: '/bills', label: 'Bills', icon: ScrollText },
  { path: '/sales', label: 'Sales', icon: BarChart3 },
];

export default function TopBar() {
  const { user, shop, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-counter-slate sticky top-0 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 bg-stamp-vermillion rounded-lg flex items-center justify-center">
              <Store className="w-4.5 h-4.5 text-white" size={18} />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-white text-lg leading-none">ShopSmart</h1>
              <p className="text-counter-slate-300 text-[10px] font-mono tracking-wider uppercase">
                {shop?.name || 'Smart Billing'}
              </p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'text-white'
                      : 'text-counter-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-white/10 rounded-lg border border-white/10"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* User info — desktop */}
            <div className="hidden md:flex items-center gap-2 text-right">
              <div>
                <p className="text-white text-xs font-medium leading-tight">{user?.name}</p>
                <p className="text-counter-slate-400 text-[10px] font-mono uppercase">{user?.role}</p>
              </div>
              <div className="w-8 h-8 bg-stamp-vermillion/20 rounded-full flex items-center justify-center">
                <User size={14} className="text-stamp-vermillion-300" />
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={logout}
              className="hidden md:flex items-center gap-1 text-counter-slate-400 hover:text-white text-xs transition-colors p-1.5 rounded-lg hover:bg-white/5"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-white/10"
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-counter-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              <div className="pt-2 border-t border-white/10 mt-2">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 bg-stamp-vermillion/20 rounded-full flex items-center justify-center">
                    <User size={14} className="text-stamp-vermillion-300" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{user?.name}</p>
                    <p className="text-counter-slate-400 text-xs font-mono">{shop?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-stamp-vermillion-300 hover:bg-white/5 w-full transition-colors"
                >
                  <LogOut size={18} />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

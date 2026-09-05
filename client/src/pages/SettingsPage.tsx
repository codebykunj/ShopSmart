import { motion } from 'framer-motion';
import { Settings, Store, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { Navigate } from 'react-router-dom';

export default function SettingsPage() {
  const { user } = useAuth();
  
  if (user?.role !== 'OWNER') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-counter-slate">Settings</h1>
      </div>

      <div className="grid gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <Store className="text-blue-600" size={24} />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-medium text-counter-slate">Store Preferences & Configuration</h2>
                <p className="text-sm text-faded-docket mt-1">
                  Manage your store details, bill receipts, and application configuration.
                </p>

                <div className="mt-6 border border-faded-docket/20 rounded-xl p-6 bg-slate-50 space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-green-500 shrink-0" size={20} />
                    <div>
                      <h4 className="text-sm font-semibold text-counter-slate">System Status</h4>
                      <p className="text-xs text-faded-docket">All services are online and operating normally.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-faded-docket/10">
                    <ShieldCheck className="text-blue-500 shrink-0" size={20} />
                    <div>
                      <h4 className="text-sm font-semibold text-counter-slate">Role & Security</h4>
                      <p className="text-xs text-faded-docket">Logged in as Owner ({user?.email}).</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

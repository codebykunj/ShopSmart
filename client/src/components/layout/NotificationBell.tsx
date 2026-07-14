import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../lib/api';
import type { Notification } from '../../types';
import {
  Bell, AlertTriangle, Clock, Package, TrendingUp,
  CheckCheck, X,
} from 'lucide-react';

const typeIcons: Record<string, any> = {
  LOW_STOCK: AlertTriangle,
  EXPIRY_WARNING: Clock,
  STOCK_IMPORTED: Package,
  DEMAND_SPIKE: TrendingUp,
  DAILY_SUMMARY: Bell,
  VOID_BILL: AlertTriangle,
  GENERAL: Bell,
};

const typeColors: Record<string, string> = {
  LOW_STOCK: 'text-amber-500 bg-amber-50',
  EXPIRY_WARNING: 'text-stamp-vermillion bg-stamp-vermillion/10',
  STOCK_IMPORTED: 'text-mint-tender bg-mint-tender/10',
  DEMAND_SPIKE: 'text-blue-500 bg-blue-50',
  DAILY_SUMMARY: 'text-counter-slate bg-counter-slate-50',
  VOID_BILL: 'text-stamp-vermillion bg-stamp-vermillion/10',
  GENERAL: 'text-counter-slate bg-counter-slate-50',
};

export default function NotificationBell() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications', { params: { limit: 15 } }).then((r) => r.data),
    refetchInterval: 60000, // poll every 60s
  });

  // Trigger alert check on mount
  useEffect(() => {
    api.post('/notifications/check').catch(() => {});
  }, []);

  const markAllRead = useMutation({
    mutationFn: () => api.put('/notifications/read'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications: Notification[] = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-1.5 text-counter-slate-300 hover:text-white transition-colors rounded-lg hover:bg-white/5"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-stamp-vermillion text-white text-[9px] font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-faded-docket/20 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-faded-docket/10">
              <h3 className="font-display text-sm text-counter-slate">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="text-[10px] text-stamp-vermillion font-medium hover:text-stamp-vermillion-600 flex items-center gap-0.5"
                  >
                    <CheckCheck size={11} /> Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-counter-slate-50 rounded">
                  <X size={14} className="text-faded-docket" />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-10">
                  <Bell size={28} className="text-faded-docket/30 mx-auto mb-2" />
                  <p className="text-sm text-faded-docket">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = typeIcons[n.type] || Bell;
                  const color = typeColors[n.type] || 'text-faded-docket bg-counter-slate-50';

                  return (
                    <div
                      key={n.id}
                      className={`flex gap-3 px-4 py-3 border-b border-faded-docket/5 hover:bg-counter-slate-50/50 transition-colors ${
                        !n.isRead ? 'bg-stamp-vermillion/[0.02]' : ''
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                        <Icon size={13} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-tight ${!n.isRead ? 'text-counter-slate' : 'text-faded-docket'}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-faded-docket/70 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-faded-docket/50 mt-1">
                          {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          {' · '}
                          {new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!n.isRead && (
                        <span className="w-2 h-2 bg-stamp-vermillion rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

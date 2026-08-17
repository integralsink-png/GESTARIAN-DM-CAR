import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface ToastOptions {
  duration?: number;
  disableBounce?: boolean;
  playSound?: boolean;
}

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  disableBounce?: boolean;
}

interface ActionToast {
  id: string;
  message: string;
  onConfirm: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  showActionToast: (message: string, onConfirm: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [actionToasts, setActionToasts] = useState<ActionToast[]>([]);

  const playToastSound = useCallback((type: ToastType) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      } else if (type === 'warning' || type === 'info') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
      }
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio play error:', e);
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success', options?: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    const duration = options?.duration ?? 2500;
    const disableBounce = options?.disableBounce ?? false;
    
    setToasts((prev) => [...prev, { id, message, type, disableBounce }]);
    if (options?.playSound !== false) {
      playToastSound(type);
    }
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, [playToastSound]);

  const showActionToast = useCallback((message: string, onConfirm: () => void) => {
    const id = Math.random().toString(36).substr(2, 9);
    setActionToasts((prev) => [...prev, { id, message, onConfirm }]);
  }, []);

  const handleActionConfirm = useCallback((toast: ActionToast) => {
    setActionToasts((prev) => prev.filter((t) => t.id !== toast.id));
    toast.onConfirm();
  }, []);

  const handleActionCancel = useCallback((id: string) => {
    setActionToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showActionToast }}>
      {children}
      
      {/* Actionable Simple Toasts (Centered Top) */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 w-full max-w-md px-4 pointer-events-none">
        <AnimatePresence>
          {actionToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20, transition: { duration: 0.2 } }}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.5)] border-2 border-white/20 bg-slate-800 text-white backdrop-blur-md cursor-pointer hover:bg-slate-700 transition-all pointer-events-auto w-full text-center"
              onClick={() => handleActionConfirm(toast)}
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="font-bold text-sm sm:text-base tracking-wide">{toast.message}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleActionCancel(toast.id); }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
              >
                <X className="w-4 h-4 opacity-70 hover:opacity-100" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Global Animated Toasts (Centered in Screen) */}
      {toasts.length > 0 && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none p-4">
          <AnimatePresence>
            {toasts.map((toast) => {
              let bgClass = '';
              let shadowClass = '';
              let Icon = CheckCircle2;
              
              if (toast.type === 'success') {
                bgClass = 'bg-emerald-600 text-white';
                shadowClass = 'shadow-[0_20px_50px_rgba(16,185,129,0.7)]';
                Icon = CheckCircle2;
              } else if (toast.type === 'warning') {
                bgClass = 'bg-amber-500 text-white';
                shadowClass = 'shadow-[0_20px_50px_rgba(245,158,11,0.7)]';
                Icon = AlertCircle;
              } else if (toast.type === 'info') {
                bgClass = 'bg-slate-900/95 text-white border-2 border-amber-400';
                shadowClass = 'shadow-[0_20px_50px_rgba(0,0,0,0.8)]';
                Icon = AlertCircle;
              } else {
                bgClass = 'bg-rose-600 text-white';
                shadowClass = 'shadow-[0_20px_50px_rgba(225,29,72,0.7)]';
                Icon = XCircle;
              }

              const bounceClass = toast.disableBounce ? '' : 'animate-bounce';

              return (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, scale: 0.85, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.85, y: -10, transition: { duration: 0.2 } }}
                  className={`${bgClass} ${shadowClass} font-black text-xl sm:text-2xl px-10 py-5 rounded-3xl ${toast.type === 'info' ? '' : 'border-4 border-white'} ${bounceClass} flex items-center gap-4 text-center tracking-wide uppercase select-none`}
                >
                  <Icon className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 ${toast.type === 'info' ? 'text-amber-400' : 'text-white'}`} />
                  <span className="text-center">{toast.message}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </ToastContext.Provider>
  );
}

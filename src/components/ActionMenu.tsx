import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical } from 'lucide-react';

interface ActionItem {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}

interface ActionMenuProps {
  actions: ActionItem[];
  triggerLabel?: string;
  className?: string;
}

export function ActionMenu({ actions, triggerLabel = "ACCIONES ▼", className = "" }: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-5 rounded-xl border border-white/10 transition-colors shadow-lg active:scale-95"
      >
        <span>{triggerLabel}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-hidden z-[100] origin-top-right"
          >
            <div className="py-1 flex flex-col">
              {actions.map((action, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.preventDefault();
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors ${
                    action.variant === 'danger'
                      ? 'text-rose-400 hover:bg-rose-500/10'
                      : action.variant === 'success'
                      ? 'text-emerald-400 hover:bg-emerald-500/10'
                      : 'text-white hover:bg-white/5'
                  }`}
                >
                  {action.icon && <span className="shrink-0">{action.icon}</span>}
                  <span className="font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

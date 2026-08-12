"use client";

import React, { useEffect, useState } from 'react';
import { useCoreStore } from '@/modules/core/store';
import { Menu } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Header() {
  const [time, setTime] = useState(new Date());
  const { notificationsActive, toggleNotifications, setSidebarOpen } = useCoreStore();
  const [activeTab, setActiveTab] = useState('dashboard');

  const temperature = "24°C";

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      setActiveTab(customEvent.detail);
    };
    window.addEventListener('navigate-tab', handleNavigate);
    return () => window.removeEventListener('navigate-tab', handleNavigate);
  }, []);

  const isDashboard = activeTab === 'dashboard';

  if (!isDashboard) {
    return null;
  }

  const dayName = format(time, 'EEEE', { locale: es });
  const dateFormatted = format(time, 'dd MMM yy', { locale: es }).toUpperCase();
  const timeFormatted = format(time, 'HH:mm');

  const handleGoHome = () => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }));
  };

  return (
    <header className="h-16 w-full bg-surface border-b border-border flex items-center justify-between px-4 lg:px-6 shadow-sm shrink-0 transition-all duration-300">
      
      {/* LEFT: Menu Mobile + Date */}
      <div className="flex items-center gap-3 min-w-0">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden p-1.5 rounded-lg bg-surface-hover text-on-surface hover:bg-border transition-colors shrink-0"
        >
          <Menu size={20} />
        </button>
        <div className="flex flex-col text-on-surface min-w-0">
          <span className="text-sm font-bold capitalize tracking-wide truncate">{dayName}</span>
          <span className="text-xs font-medium opacity-80 truncate">{dateFormatted}</span>
        </div>
      </div>

      {/* CENTER: Notifications (METIS) Triangle + Logo "G" to its right */}
      <div className="flex items-center justify-center gap-2 relative shrink-0 mx-2">
        <button 
          onClick={() => toggleNotifications()}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
            notificationsActive 
              ? 'bg-primary text-on-primary shadow-md transform rotate-180' 
              : 'bg-surface-hover text-on-surface border border-border hover:bg-border'
          }`}
          title="Notificaciones METIS"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 4l8 14H4z" />
          </svg>
        </button>

        {/* Logo de la empresa a la DERECHA del botón del triángulo */}
        <button 
          onClick={handleGoHome}
          className="w-9 h-9 bg-primary text-on-primary rounded-xl flex items-center justify-center font-black text-lg shadow-sm hover:scale-105 transition-transform shrink-0"
          title="Ir a Inicio"
        >
          G
        </button>
      </div>

      {/* RIGHT: Time & Temperature */}
      <div className="flex flex-col text-right text-on-surface shrink-0">
        <span className="text-base font-black tracking-tight">{timeFormatted}</span>
        <span className="text-xs font-bold text-primary opacity-90">{temperature}</span>
      </div>

    </header>
  );
}

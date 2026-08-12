"use client";

import React, { useState } from 'react';
import { useCoreStore } from '@/modules/core/store';
import { LayoutDashboard, FolderOpen, Settings, Users, PenTool, FileText, BarChart3, Wrench, Calculator } from 'lucide-react';

const MENU_ITEMS = [
  { name: 'Dashboard', icon: LayoutDashboard, id: 'dashboard' },
  { name: 'Expedientes', icon: FolderOpen, id: 'expedientes' },
  { name: 'Clientes', icon: Users, id: 'clientes' },
  { name: 'Presupuestos', icon: Calculator, id: 'presupuestos' },
  { name: 'Citas', icon: PenTool, id: 'citas' },
  { name: 'Reparaciones', icon: Wrench, id: 'reparaciones' },
  { name: 'Facturación', icon: FileText, id: 'facturas' },
  { name: 'Balances', icon: BarChart3, id: 'balances' },
  { name: 'Configuración', icon: Settings, id: 'configuracion' },
];

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isSidebarOpen, setSidebarOpen } = useCoreStore();

  // Suscribirse al movimiento de scroll para actualizar la opción activa del menú de forma automática
  React.useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.5, // 50% de la pantalla visible activa la opción
    });

    const sections = MENU_ITEMS.map((item) => document.getElementById(item.id)).filter(Boolean);
    sections.forEach((sec) => sec && observer.observe(sec));

    return () => observer.disconnect();
  }, []);

  const handleLinkClick = (id: string) => {
    setActiveTab(id);
    // Dispatch custom event to snap to the view
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: id }));
    
    // Solo cerramos el menú en dispositivos móviles
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`fixed lg:static top-0 left-0 h-screen bg-surface border-r border-border flex flex-col p-6 shadow-sm z-40 shrink-0 w-72 transition-transform duration-300 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-primary text-on-primary rounded-xl flex items-center justify-center shadow-sm">
             <span className="text-xl font-black tracking-tighter">G</span>
          </div>
          <span className="text-xl font-black tracking-tight text-on-surface">GESTARIAN</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            
            return (
              <button 
                key={item.name} 
                onClick={() => handleLinkClick(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-200 text-left ${
                  isActive 
                    ? 'bg-primary/20 text-on-surface shadow-sm border border-primary/10' 
                    : 'text-on-surface/60 hover:bg-surface-hover hover:text-on-surface'
                }`}
              >
                <Icon size={20} className={isActive ? "text-primary" : "opacity-70"} />
                {item.name}
              </button>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="mt-auto pt-6 border-t border-border flex items-center gap-3 cursor-pointer hover:bg-surface-hover p-2 rounded-xl transition-colors">
          <div className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center font-bold shrink-0">
            AD
          </div>
          <div className="flex flex-col truncate">
            <span className="text-sm font-bold text-on-surface truncate">Administrador</span>
            <span className="text-xs text-on-surface/60 truncate">Taller Miguel</span>
          </div>
        </div>
        
      </aside>
    </>
  );
}

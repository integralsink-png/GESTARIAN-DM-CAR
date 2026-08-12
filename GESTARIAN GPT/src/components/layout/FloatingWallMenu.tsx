"use client";

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Users, 
  Calculator, 
  Calendar, 
  Wrench, 
  FileText, 
  BarChart3, 
  Settings, 
  Grid, 
  X 
} from 'lucide-react';

interface WallTile {
  id: string;
  icon: React.ElementType;
  title: string;
  bgClass: string;
  sizeClass: string;
  animationClass: string;
}

const WALL_TILES: WallTile[] = [
  { 
    id: 'dashboard', 
    icon: LayoutDashboard, 
    title: 'Resumen de Actividad', 
    bgClass: 'bg-primary text-on-primary', 
    sizeClass: 'col-span-2 row-span-2 h-32', 
    animationClass: 'animate-slide-in-left' 
  },
  { 
    id: 'expedientes', 
    icon: FolderOpen, 
    title: 'Expedientes', 
    bgClass: 'bg-secondary text-on-secondary', 
    sizeClass: 'col-span-1 row-span-2 h-32', 
    animationClass: 'animate-slide-in-right' 
  },
  { 
    id: 'clientes', 
    icon: Users, 
    title: 'Clientes', 
    bgClass: 'bg-slate-700 text-white', 
    sizeClass: 'col-span-1 row-span-1 h-20', 
    animationClass: 'animate-slide-in-left' 
  },
  { 
    id: 'presupuestos', 
    icon: Calculator, 
    title: 'Presupuestos', 
    bgClass: 'bg-primary/90 text-on-primary', 
    sizeClass: 'col-span-2 row-span-1 h-20', 
    animationClass: 'animate-slide-in-right' 
  },
  { 
    id: 'citas', 
    icon: Calendar, 
    title: 'Citas', 
    bgClass: 'bg-secondary/90 text-on-secondary', 
    sizeClass: 'col-span-1 row-span-2 h-32', 
    animationClass: 'animate-slide-in-left' 
  },
  { 
    id: 'reparaciones', 
    icon: Wrench, 
    title: 'Reparaciones', 
    bgClass: 'bg-slate-800 text-white', 
    sizeClass: 'col-span-2 row-span-1 h-20', 
    animationClass: 'animate-slide-in-right' 
  },
  { 
    id: 'facturas', 
    icon: FileText, 
    title: 'Facturación', 
    bgClass: 'bg-primary text-on-primary', 
    sizeClass: 'col-span-1 row-span-1 h-20', 
    animationClass: 'animate-slide-in-left' 
  },
  { 
    id: 'balances', 
    icon: BarChart3, 
    title: 'Balances', 
    bgClass: 'bg-secondary text-on-secondary', 
    sizeClass: 'col-span-1 row-span-1 h-20', 
    animationClass: 'animate-slide-in-right' 
  },
  { 
    id: 'configuracion', 
    icon: Settings, 
    title: 'Ajustes', 
    bgClass: 'bg-slate-700 text-white', 
    sizeClass: 'col-span-1 row-span-1 h-20', 
    animationClass: 'animate-slide-in-left' 
  },
];

export default function FloatingWallMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigate = (targetId: string) => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: targetId }));
    setIsOpen(false);
  };

  return (
    <>
      {/* PARED DE BALDOSAS MASONRY (DESPLEGABLE TIPO MURO) */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface/90 border-2 border-primary/40 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3 mb-16 sm:mb-0"
          >
            {/* Header del Muro */}
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-xs font-black uppercase text-primary tracking-wider">Menú Rápido</span>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full bg-surface-hover text-on-surface hover:bg-border transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Muro en Cuadrícula Irregular (Bento Wall Masonry) */}
            <div className="grid grid-cols-3 gap-2.5 max-h-[70vh] overflow-y-auto pr-1 hide-scrollbar">
              {WALL_TILES.map((tile) => {
                const IconComponent = tile.icon;

                return (
                  <button
                    key={tile.id}
                    onClick={() => handleNavigate(tile.id)}
                    className={`${tile.sizeClass} ${tile.bgClass} ${tile.animationClass} rounded-2xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer overflow-hidden group`}
                    title={tile.title}
                  >
                    <IconComponent className="w-10 h-10 sm:w-12 sm:h-12 group-hover:scale-115 transition-transform shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE CÍRCULO AZUL CON BORDE 3PX Y RELLENO TRANSPARENTE 30% */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full border-[3px] border-primary bg-primary/30 backdrop-blur-md flex items-center justify-center text-primary shadow-xl hover:scale-110 active:scale-90 transition-all duration-200 cursor-pointer"
        title="Abrir Menú de Navegación Muro"
      >
        {isOpen ? <X className="w-7 h-7" /> : <Grid className="w-7 h-7" />}
      </button>
    </>
  );
}

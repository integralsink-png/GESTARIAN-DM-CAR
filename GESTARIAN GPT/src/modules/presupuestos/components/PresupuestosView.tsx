"use client";

import React, { useState } from 'react';
import { Search, Plus, ArrowLeft, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';

interface PresupuestoItem {
  id: string;
  numero: string;
  cliente_nombre: string;
  objeto_titulo: string;
  total: number;
  estado: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO' | 'ENVIADO';
  fecha: string;
}

const MOCK_PRESUPUESTOS: PresupuestoItem[] = [
  {
    id: '1',
    numero: 'PRES-2026-001',
    cliente_nombre: 'García López, Juan Antonio',
    objeto_titulo: '1234-BBB',
    total: 850.00,
    estado: 'ENVIADO',
    fecha: '10/08/2026',
  },
  {
    id: '2',
    numero: 'PRES-2026-002',
    cliente_nombre: 'Martínez Ruiz, María del Carmen',
    objeto_titulo: '5678-CDC',
    total: 1240.50,
    estado: 'ACEPTADO',
    fecha: '09/08/2026',
  },
  {
    id: '3',
    numero: 'PRES-2026-003',
    cliente_nombre: 'Fernández Gómez, Carlos',
    objeto_titulo: '9101-DDD',
    total: 320.00,
    estado: 'PENDIENTE',
    fecha: '08/08/2026',
  },
];

const ESTADO_CONFIG: Record<PresupuestoItem['estado'], { label: string; bg: string; text: string }> = {
  PENDIENTE: { label: 'Pendiente', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  ENVIADO: { label: 'Enviado', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  ACEPTADO: { label: 'Aceptado', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  RECHAZADO: { label: 'Rechazado', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
};

export default function PresupuestosView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGoHome = () => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }));
  };

  const filteredPresupuestos = MOCK_PRESUPUESTOS.filter((p) => {
    const matchesEstado = filterEstado === 'TODOS' || p.estado === filterEstado;
    const q = searchQuery.toLowerCase();
    return matchesEstado && (
      p.numero.toLowerCase().includes(q) ||
      p.cliente_nombre.toLowerCase().includes(q) ||
      p.objeto_titulo.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-3 w-full h-full p-3 lg:p-5">
      
      {/* TÍTULO PRESUPUESTOS CON LA "P" EN AZUL X2 */}
      <div className="w-full text-left shrink-0 pt-1 flex items-baseline">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-on-background flex items-baseline">
          <span className="text-primary text-5xl sm:text-6xl font-black mr-0.5 leading-none">P</span>resupuestos
        </h1>
      </div>

      {/* FILA DE 5 BOTONES SUPERIORES EQUIDISTANTES */}
      <div className="flex items-center justify-between gap-2 w-full shrink-0 border-b border-border/40 pb-2">
        <button 
          onClick={handleGoHome}
          className="flex-1 h-12 bg-primary text-on-primary rounded-xl flex items-center justify-center font-black text-xl shadow-sm hover:scale-105 transition-transform"
          title="Ir a Inicio"
        >
          G
        </button>

        <button 
          onClick={() => setShowSearchInput(!showSearchInput)}
          className={`flex-1 h-12 rounded-xl border flex items-center justify-center transition-all ${
            showSearchInput 
              ? 'bg-primary text-on-primary border-primary' 
              : 'bg-surface border-border text-on-surface hover:bg-surface-hover'
          }`}
          title="Buscar Presupuesto"
        >
          <Search className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          className={`flex-1 h-12 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-black ${
            filterEstado !== 'TODOS' || showFilterDropdown
              ? 'bg-primary text-on-primary border-primary' 
              : 'bg-surface border-border text-on-surface hover:bg-surface-hover'
          }`}
          title="Filtrar"
        >
          <Filter className="w-5 h-5" />
          <span className="hidden sm:inline">Filtrar</span>
        </button>

        <button 
          className="flex-1 h-12 minimal-button rounded-xl flex items-center justify-center shrink-0"
          title="Nuevo Presupuesto"
        >
          <Plus className="w-6 h-6" />
        </button>

        <button 
          onClick={handleGoHome}
          className="flex-1 h-12 rounded-xl flex items-center justify-center gap-1 text-xs font-black text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-colors"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline">Volver</span>
        </button>
      </div>

      {/* Input de Búsqueda Desplegable */}
      {showSearchInput && (
        <div className="relative w-full shrink-0 animate-fade-in">
          <input 
            type="text" 
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Escribe nº presupuesto, cliente o matrícula..." 
            className="w-full pl-4 pr-10 py-3 bg-surface border-2 border-primary text-base font-bold text-on-surface rounded-xl focus:outline-none shadow-md"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3.5 text-on-surface/50 hover:text-on-surface"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Selector de Filtros Desplegable */}
      {showFilterDropdown && (
        <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 bg-surface-hover/80 rounded-2xl border border-border/60 shrink-0 hide-scrollbar animate-fade-in">
          {(['TODOS', 'PENDIENTE', 'ENVIADO', 'ACEPTADO', 'RECHAZADO'] as const).map((est) => (
            <button
              key={est}
              onClick={() => { setFilterEstado(est); setShowFilterDropdown(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                filterEstado === est 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'bg-surface border border-border text-on-surface/70 hover:bg-surface-hover'
              }`}
            >
              {est === 'TODOS' ? 'Todos los Estados' : ESTADO_CONFIG[est].label}
            </button>
          ))}
        </div>
      )}

      {/* LISTA DE TARJETAS DE PRESUPUESTO (ESTADO X2 MÁS GRANDE) */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
        {filteredPresupuestos.length === 0 ? (
          <div className="flex items-center justify-center h-28 text-sm text-on-surface/50 font-bold">
            Sin presupuestos
          </div>
        ) : (
          filteredPresupuestos.map((p) => {
            const estadoCfg = ESTADO_CONFIG[p.estado];
            const isExpanded = expandedId === p.id;

            return (
              <div 
                key={p.id} 
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                className="minimal-card p-4 flex flex-col gap-2.5 border border-border/60 hover:border-primary/40 transition-all duration-200 shadow-sm cursor-pointer"
              >
                {/* LÍNEA 1: Nº Presupuesto + ESTADO X2 MÁS GRANDE */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm sm:text-base px-3 py-1 bg-surface-hover border border-border/80 rounded-xl text-slate-800 dark:text-slate-200 shrink-0 shadow-sm">
                    {p.numero}
                  </span>

                  <span className={`text-sm sm:text-base font-black px-4 py-2 rounded-xl shrink-0 shadow-sm ${estadoCfg.bg} ${estadoCfg.text}`}>
                    {estadoCfg.label}
                  </span>
                </div>

                {/* LÍNEA 2: Nombre Completo a Tamaño Grande */}
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {p.cliente_nombre}
                  </h3>
                </div>

                {/* LÍNEA 3: Matrícula + Total € (Sin marca) */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 truncate">
                    {p.objeto_titulo}
                  </p>
                  <span className="text-base sm:text-lg font-black text-primary shrink-0">
                    {p.total.toFixed(2)} €
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

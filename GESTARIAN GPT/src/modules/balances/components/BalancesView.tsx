"use client";

import React, { useState } from 'react';
import { Search, Plus, ArrowLeft, X, Filter, ChevronDown, ChevronUp, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface BalanceItem {
  id: string;
  codigo: string;
  concepto: string;
  categoria: 'INGRESOS' | 'GASTOS' | 'BENEFICIO';
  monto: number;
  variacion: string;
  periodo: string;
}

const MOCK_BALANCES: BalanceItem[] = [
  {
    id: 'bal_1',
    codigo: 'BAL-2026-01',
    concepto: 'Facturación Mensual Taller',
    categoria: 'INGRESOS',
    monto: 12480.00,
    variacion: '+14.2% vs mes anterior',
    periodo: 'Agosto 2026',
  },
  {
    id: 'bal_2',
    codigo: 'BAL-2026-02',
    concepto: 'Gastos Recambios y Piezas',
    categoria: 'GASTOS',
    monto: 4120.00,
    variacion: 'Suministros y repuestos',
    periodo: 'Agosto 2026',
  },
  {
    id: 'bal_3',
    codigo: 'BAL-2026-03',
    concepto: 'Beneficio Neto Operativo',
    categoria: 'BENEFICIO',
    monto: 8360.00,
    variacion: 'Margen neto 67%',
    periodo: 'Agosto 2026',
  },
];

const CATEGORIA_CONFIG: Record<BalanceItem['categoria'], { label: string; bg: string; text: string }> = {
  INGRESOS: { label: 'Ingresos', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  GASTOS: { label: 'Gastos', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
  BENEFICIO: { label: 'Beneficio', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
};

export default function BalancesView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [filterCategoria, setFilterCategoria] = useState<string>('TODOS');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGoHome = () => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }));
  };

  const filteredBalances = MOCK_BALANCES.filter((b) => {
    const matchesCategoria = filterCategoria === 'TODOS' || b.categoria === filterCategoria;
    const q = searchQuery.toLowerCase();
    return matchesCategoria && (
      b.codigo.toLowerCase().includes(q) ||
      b.concepto.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-3 w-full h-full p-3 lg:p-5">

      {/* TÍTULO BALANCES CON LA "B" EN AZUL X2 */}
      <div className="w-full text-left shrink-0 pt-1 flex items-baseline">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-on-background flex items-baseline">
          <span className="text-primary text-5xl sm:text-6xl font-black mr-0.5 leading-none">B</span>alances
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
          title="Buscar Balance"
        >
          <Search className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          className={`flex-1 h-12 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-black ${
            filterCategoria !== 'TODOS' || showFilterDropdown
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
          title="Nuevo Registro"
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
            placeholder="Escribe código o concepto..." 
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
          {(['TODOS', 'INGRESOS', 'GASTOS', 'BENEFICIO'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => { setFilterCategoria(cat); setShowFilterDropdown(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                filterCategoria === cat 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'bg-surface border border-border text-on-surface/70 hover:bg-surface-hover'
              }`}
            >
              {cat === 'TODOS' ? 'Todos los Balances' : CATEGORIA_CONFIG[cat].label}
            </button>
          ))}
        </div>
      )}

      {/* LISTA DE TARJETAS DE BALANCES (SIN RELOJES NI MARQUITAS/RECUADROS EXTRA) */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
        {filteredBalances.length === 0 ? (
          <div className="flex items-center justify-center h-28 text-sm text-on-surface/50 font-bold">
            Sin balances registrados
          </div>
        ) : (
          filteredBalances.map((b) => {
            const catCfg = CATEGORIA_CONFIG[b.categoria];
            const isExpanded = expandedId === b.id;

            return (
              <div 
                key={b.id} 
                onClick={() => setExpandedId(isExpanded ? null : b.id)}
                className="minimal-card p-4 flex flex-col gap-2.5 border border-border/60 hover:border-primary/40 transition-all duration-200 shadow-sm cursor-pointer"
              >
                {/* LÍNEA 1: Código x1.5 + Categoria Badge x2 a la derecha (Sin recuadros extra) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm sm:text-base px-3 py-1 bg-surface-hover border border-border/80 rounded-xl text-slate-800 dark:text-slate-200 shrink-0 shadow-sm">
                    {b.codigo}
                  </span>

                  <span className={`text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl shrink-0 shadow-sm ${catCfg.bg} ${catCfg.text}`}>
                    {catCfg.label}
                  </span>
                </div>

                {/* LÍNEA 2: Concepto del Balance */}
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {b.concepto}
                  </h3>
                </div>

                {/* LÍNEA 3: Período y Variación (Izquierda) + Monto € (Derecha) */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 truncate">
                    {b.periodo} • <span className="text-slate-500 font-bold text-xs">{b.variacion}</span>
                  </p>
                  <span className="text-base sm:text-lg font-black text-primary shrink-0">
                    {b.monto.toFixed(2)} €
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

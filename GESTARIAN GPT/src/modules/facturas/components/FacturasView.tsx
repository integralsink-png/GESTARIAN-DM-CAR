"use client";

import React, { useState } from 'react';
import { Search, Plus, ArrowLeft, X, Filter, Download, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useFacturasStore } from '../store';

export default function FacturasView() {
  const { facturas, filterPagada, setFilterPagada } = useFacturasStore();
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGoHome = () => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }));
  };

  const filteredFacturas = facturas.filter(f => {
    const matchesFilter = filterPagada === 'TODAS' || (filterPagada === 'PAGADAS' ? f.pagada : !f.pagada);
    const q = searchQuery.toLowerCase();
    return matchesFilter && (f.numero.toLowerCase().includes(q) || f.cliente_nombre.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col gap-3 w-full h-full p-3 lg:p-5">

      {/* TÍTULO FACTURAS CON LA "F" EN AZUL X2 */}
      <div className="w-full text-left shrink-0 pt-1 flex items-baseline">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-on-background flex items-baseline">
          <span className="text-primary text-5xl sm:text-6xl font-black mr-0.5 leading-none">F</span>acturas
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
          title="Buscar Factura"
        >
          <Search className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          className={`flex-1 h-12 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-black ${
            filterPagada !== 'TODAS' || showFilterDropdown
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
          title="Nueva Factura"
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
            placeholder="Buscar por nº o cliente..." 
            className="w-full pl-4 pr-10 py-3 bg-surface border-2 border-primary text-base font-bold text-on-surface rounded-xl focus:outline-none shadow-md"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3.5 text-on-surface/50 hover:text-on-surface">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Selector de Filtros Desplegable */}
      {showFilterDropdown && (
        <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 bg-surface-hover/80 rounded-2xl border border-border/60 shrink-0 hide-scrollbar animate-fade-in">
          {(['TODAS', 'PAGADAS', 'PENDIENTES'] as const).map((fp) => (
            <button
              key={fp}
              onClick={() => { setFilterPagada(fp as any); setShowFilterDropdown(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                filterPagada === fp 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'bg-surface border border-border text-on-surface/70 hover:bg-surface-hover'
              }`}
            >
              {fp === 'TODAS' ? 'Todas las Facturas' : fp === 'PAGADAS' ? 'Pagadas' : 'Pendientes'}
            </button>
          ))}
        </div>
      )}

      {/* LISTA DE TARJETAS DE FACTURAS (SIN MARQUITAS NI RECUADROS EXTRA) */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
        {filteredFacturas.length === 0 ? (
          <div className="flex items-center justify-center h-28 text-sm text-on-surface/50 font-bold">
            Sin facturas registradas
          </div>
        ) : (
          filteredFacturas.map((fac) => {
            const isExpanded = expandedId === fac.id;

            return (
              <div 
                key={fac.id} 
                onClick={() => setExpandedId(isExpanded ? null : fac.id)}
                className="minimal-card p-4 flex flex-col gap-2.5 border border-border/60 hover:border-primary/40 transition-all duration-200 shadow-sm cursor-pointer"
              >
                {/* LÍNEA 1: Nº Factura x1.5 + Estado Badge x2 a la derecha (Sin recuadros extra) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm sm:text-base px-3 py-1 bg-surface-hover border border-border/80 rounded-xl text-slate-800 dark:text-slate-200 shrink-0 shadow-sm">
                    {fac.numero}
                  </span>

                  <span className={`text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl shrink-0 shadow-sm ${
                    fac.pagada ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                  }`}>
                    {fac.pagada ? 'Pagada' : 'Pendiente'}
                  </span>
                </div>

                {/* LÍNEA 2: Nombre Completo del Cliente */}
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {fac.cliente_nombre}
                  </h3>
                </div>

                {/* LÍNEA 3: Fecha + Total € */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 truncate">
                    {new Date(fac.fecha_emision).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <span className="text-base sm:text-lg font-black text-primary shrink-0">
                    {fac.total.toFixed(2)} €
                  </span>
                </div>

                {/* ACCIONES DESPLEGABLES */}
                {isExpanded && (
                  <div className="flex items-center justify-around gap-2 pt-3 mt-1 border-t border-border/40 w-full animate-fade-in">
                    <button 
                      className="flex-1 py-2 px-3 bg-surface-hover hover:bg-border text-slate-800 dark:text-slate-200 rounded-xl text-xs font-black flex items-center justify-center gap-2 border border-border/60"
                      title="Descargar PDF"
                    >
                      <Download className="w-4 h-4 text-primary" />
                      <span>Descargar PDF</span>
                    </button>
                    
                    <button 
                      className="flex-1 py-2 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-black flex items-center justify-center gap-2 border border-primary/20"
                      title="Enviar Factura"
                    >
                      <Send className="w-4 h-4" />
                      <span>Enviar</span>
                    </button>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

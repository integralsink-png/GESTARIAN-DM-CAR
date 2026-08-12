"use client";

import React, { useState } from 'react';
import { Search, Plus, ArrowLeft, X, Filter, ChevronDown, ChevronUp, FileText, RefreshCw } from 'lucide-react';
import { useReparacionesStore, EstadoReparacion, Reparacion } from '../store';

const ESTADO_CONFIG: Record<EstadoReparacion, { label: string; bg: string; text: string }> = {
  PENDIENTE: { label: 'Pendiente', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  EN_CURSO: { label: 'En Curso', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  ESPERA_PIEZAS: { label: 'Espera Piezas', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  FINALIZADO: { label: 'Finalizado', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
};

export default function ReparacionesView() {
  const { reparaciones, filterEstado, setFilterEstado, updateEstadoReparacion } = useReparacionesStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGoHome = () => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }));
  };

  const filteredReparaciones = reparaciones.filter((r: Reparacion) => {
    const matchesEstado = filterEstado === 'TODOS' || r.estado === filterEstado;
    const q = searchQuery.toLowerCase();
    return matchesEstado && (
      r.expediente_numero.toLowerCase().includes(q) ||
      r.cliente_nombre.toLowerCase().includes(q) ||
      r.vehiculo.toLowerCase().includes(q)
    );
  });

  const handleNextState = (rep: Reparacion, e: React.MouseEvent) => {
    e.stopPropagation();
    const sequence: EstadoReparacion[] = ['PENDIENTE', 'EN_CURSO', 'ESPERA_PIEZAS', 'FINALIZADO'];
    const currentIndex = sequence.indexOf(rep.estado);
    const nextIndex = (currentIndex + 1) % sequence.length;
    updateEstadoReparacion(rep.id, sequence[nextIndex]);
  };

  return (
    <div className="flex flex-col gap-3 w-full h-full p-3 lg:p-5">

      {/* TÍTULO REPARACIONES CON LA "R" EN AZUL X2 */}
      <div className="w-full text-left shrink-0 pt-1 flex items-baseline">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-on-background flex items-baseline">
          <span className="text-primary text-5xl sm:text-6xl font-black mr-0.5 leading-none">R</span>eparaciones
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
          title="Buscar Reparación"
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
          title="Nueva Reparación"
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
            placeholder="Escribe nº expediente, titular o vehículo..." 
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
          {(['TODOS', 'PENDIENTE', 'EN_CURSO', 'ESPERA_PIEZAS', 'FINALIZADO'] as const).map((est) => (
            <button
              key={est}
              onClick={() => { setFilterEstado(est as any); setShowFilterDropdown(false); }}
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

      {/* LISTA DE TARJETAS DE REPARACIONES (SIN RELOJES NI MARQUITAS/RECUADROS SOBRANTES) */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
        {filteredReparaciones.length === 0 ? (
          <div className="flex items-center justify-center h-28 text-sm text-on-surface/50 font-bold">
            Sin órdenes de reparación
          </div>
        ) : (
          filteredReparaciones.map((r: Reparacion) => {
            const estadoCfg = ESTADO_CONFIG[r.estado];
            const isExpanded = expandedId === r.id;

            return (
              <div 
                key={r.id} 
                onClick={() => setExpandedId(isExpanded ? null : r.id)}
                className="minimal-card p-4 flex flex-col gap-2.5 border border-border/60 hover:border-primary/40 transition-all duration-200 shadow-sm cursor-pointer"
              >
                {/* LÍNEA 1: Número Expediente x1.5 + Estado Badge x2 a la derecha (Sin recuadros extra) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm sm:text-base px-3 py-1 bg-surface-hover border border-border/80 rounded-xl text-slate-800 dark:text-slate-200 shrink-0 shadow-sm">
                    {r.expediente_numero}
                  </span>

                  <span className={`text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl shrink-0 shadow-sm ${estadoCfg.bg} ${estadoCfg.text}`}>
                    {estadoCfg.label}
                  </span>
                </div>

                {/* LÍNEA 2: Titular / Nombre Completo */}
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {r.cliente_nombre}
                  </h3>
                </div>

                {/* LÍNEA 3: Matrícula, Marca y Modelo */}
                <div>
                  <p className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 truncate">
                    {r.vehiculo}
                  </p>
                </div>

                {/* BOTONES DESPLEGABLES AL PULSAR TARJETA */}
                {isExpanded && (
                  <div className="flex items-center gap-2 pt-3 mt-1 border-t border-border/40 w-full animate-fade-in">
                    
                    {/* Botón Actualizar Estado */}
                    <button 
                      onClick={(e) => handleNextState(r, e)}
                      className="flex-1 py-2.5 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors border border-primary/20"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Actualizar Estado</span>
                    </button>

                    {/* Botón Generar Factura (Aparece automáticamente cuando el estado es FINALIZADO) */}
                    {r.estado === 'FINALIZADO' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'facturas' }));
                        }}
                        className="flex-1 py-2.5 px-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-colors shadow-md animate-bounce"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Generar Factura</span>
                      </button>
                    )}

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

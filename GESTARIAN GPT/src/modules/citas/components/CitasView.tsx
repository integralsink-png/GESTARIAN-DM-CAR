"use client";

import React, { useState } from 'react';
import { Search, Plus, ArrowLeft, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useCitasStore, EstadoCita } from '../store';

const ESTADO_CONFIG: Record<EstadoCita, { label: string; bg: string; text: string }> = {
  PENDIENTE: { label: 'Pendiente', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  CONFIRMADA: { label: 'Confirmada', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  COMPLETADA: { label: 'Completada', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  CANCELADA: { label: 'Cancelada', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
};

export default function CitasView() {
  const { citas, filterEstado, setFilterEstado } = useCitasStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleGoHome = () => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }));
  };

  const filteredCitas = citas.filter((c) => {
    const matchesEstado = filterEstado === 'TODAS' || c.estado === filterEstado;
    const q = searchQuery.toLowerCase();
    return matchesEstado && (
      c.cliente_nombre.toLowerCase().includes(q) ||
      c.objeto_titulo.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-3 w-full h-full p-3 lg:p-5">

      {/* TÍTULO CITAS CON LA "C" EN AZUL X2 */}
      <div className="w-full text-left shrink-0 pt-1 flex items-baseline">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-on-background flex items-baseline">
          <span className="text-primary text-5xl sm:text-6xl font-black mr-0.5 leading-none">C</span>itas
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
          title="Buscar Cita"
        >
          <Search className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          className={`flex-1 h-12 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs font-black ${
            filterEstado !== 'TODAS' || showFilterDropdown
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
          title="Nueva Cita"
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
            placeholder="Escribe cliente, matrícula o vehículo..." 
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
          {(['TODAS', 'PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'] as const).map((est) => (
            <button
              key={est}
              onClick={() => { setFilterEstado(est as any); setShowFilterDropdown(false); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                filterEstado === est 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'bg-surface border border-border text-on-surface/70 hover:bg-surface-hover'
              }`}
            >
              {est === 'TODAS' ? 'Todas las Citas' : ESTADO_CONFIG[est].label}
            </button>
          ))}
        </div>
      )}

      {/* LISTA DE TARJETAS DE CITAS (SIN RELOJ Y SIN MARCA DE VEHÍCULO) */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
        {filteredCitas.length === 0 ? (
          <div className="flex items-center justify-center h-28 text-sm text-on-surface/50 font-bold">
            Sin citas programadas
          </div>
        ) : (
          filteredCitas.map((cita) => {
            const estadoCfg = ESTADO_CONFIG[cita.estado];
            const isExpanded = expandedId === cita.id;

            // Extraer sólo Matrícula (sin marcas ni conceptos sobrantes)
            // Ejemplo de objeto_titulo: "BMW X5 (1234-BBB) - Revisión 50.000km"
            const partes = cita.objeto_titulo.split(' - ')[0]; 
            const matchMatricula = partes.match(/\(([^)]+)\)/);
            const matriculaLimpia = matchMatricula ? matchMatricula[1] : partes;

            // Formatear Fecha y Hora limpias (Sin icono de reloj)
            const dateObj = new Date(cita.fecha_hora);
            const fechaStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
            const horaStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

            return (
              <div 
                key={cita.id} 
                onClick={() => setExpandedId(isExpanded ? null : cita.id)}
                className="minimal-card p-4 flex flex-col gap-2.5 border border-border/60 hover:border-primary/40 transition-all duration-200 shadow-sm cursor-pointer"
              >
                {/* LÍNEA 1: Hora/Fecha x1.5 SIN RELOJ + Estado Badge x2 a la derecha */}
                <div className="flex items-center justify-between gap-2">
                  <div className="px-3 py-1 bg-surface-hover border border-border/80 rounded-xl text-slate-800 dark:text-slate-200 shrink-0 shadow-sm font-black text-sm sm:text-base">
                    <span>{horaStr} ({fechaStr})</span>
                  </div>

                  <span className={`text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl shrink-0 shadow-sm ${estadoCfg.bg} ${estadoCfg.text}`}>
                    {estadoCfg.label}
                  </span>
                </div>

                {/* LÍNEA 2: Nombre Completo del Cliente */}
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {cita.cliente_nombre}
                  </h3>
                </div>

                {/* LÍNEA 3: Sólo Matrícula (Sin marca ni conceptos) */}
                <div>
                  <p className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 truncate">
                    {matriculaLimpia}
                  </p>
                </div>

              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

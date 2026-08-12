"use client";

import React, { useState } from 'react';
import { Search, FolderPlus, FileText, X, ArrowLeft, Filter, Calendar, Wrench, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { useExpedientesStore, EstadoExpediente, Expediente } from '../store';
import NuevoExpedienteModal from './NuevoExpedienteModal';

const ESTADO_CONFIG: Record<EstadoExpediente, { label: string; bg: string; text: string }> = {
  RECEPCION: { label: 'Recepción', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  EN_PROCESO: { label: 'En Proceso', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  PRESUPUESTADO: { label: 'Presupuestado', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  PENDIENTE_PAGO: { label: 'Pendiente Pago', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400' },
  FINALIZADO: { label: 'Finalizado', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
};

type TipoSubVentana = 'PRESUPUESTO' | 'PRESUPUESTADO' | 'CITA' | 'REPARACION' | 'FACTURA' | null;

export default function ExpedientesView() {
  const { expedientes, filterEstado, searchQuery, setFilterEstado, setSearchQuery } = useExpedientesStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [expandedExpId, setExpandedExpId] = useState<string | null>(null);
  
  // Estado para abrir la sub-ventana modal al pulsar cualquier icono
  const [activeSubModal, setActiveSubModal] = useState<{ tipo: TipoSubVentana; exp: Expediente | null }>({ tipo: null, exp: null });

  const handleGoHome = () => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }));
  };

  const toggleCardExpand = (id: string) => {
    setExpandedExpId(expandedExpId === id ? null : id);
  };

  const openSubView = (tipo: TipoSubVentana, exp: Expediente, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar cerrar el acordeón al pulsar el icono
    setActiveSubModal({ tipo, exp });
  };

  const filteredExpedientes = expedientes.filter((exp) => {
    const matchesEstado = filterEstado === 'TODOS' || exp.estado === filterEstado;
    const q = searchQuery.toLowerCase();
    return matchesEstado && (
      exp.numero.toLowerCase().includes(q) ||
      exp.cliente_nombre.toLowerCase().includes(q) ||
      exp.objeto_titulo.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-3 w-full h-full p-3 lg:p-5">
      <NuevoExpedienteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* SUB-VENTANA MODAL CON BOTÓN DE VOLVER AL PULSAR CUALQUIER ICONO */}
      {activeSubModal.tipo && activeSubModal.exp && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col p-4 animate-fade-in">
          <div className="bg-surface border border-border w-full max-w-lg mx-auto rounded-3xl p-6 shadow-2xl flex flex-col gap-4 my-auto">
            {/* Header Sub-Ventana */}
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <span className="font-extrabold text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-lg">
                  {activeSubModal.exp.numero}
                </span>
                <h2 className="text-xl font-black text-on-surface mt-1">
                  {activeSubModal.tipo === 'PRESUPUESTADO' ? 'Presupuesto' : activeSubModal.tipo}
                </h2>
              </div>

              {/* Botón Volver */}
              <button 
                onClick={() => setActiveSubModal({ tipo: null, exp: null })}
                className="flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-xl transition-colors border border-primary/20"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver</span>
              </button>
            </div>

            {/* Contenido de la Sub-Ventana */}
            <div className="py-4 space-y-3">
              <p className="text-sm font-semibold text-on-surface/80">
                Cliente: <strong className="text-on-surface">{activeSubModal.exp.cliente_nombre}</strong>
              </p>
              <p className="text-sm font-semibold text-on-surface/80">
                Vehículo: <strong className="text-on-surface">{activeSubModal.exp.objeto_titulo.split(' - ')[0]}</strong>
              </p>

              <div className="p-4 bg-surface-hover border border-border/60 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-primary uppercase">Detalle del {activeSubModal.tipo}</span>
                <p className="text-xs text-on-surface/70 leading-relaxed font-medium">
                  Información completa y desglosada vinculada al expediente {activeSubModal.exp.numero}.
                </p>
              </div>
            </div>

            {/* Cierre */}
            <button 
              onClick={() => setActiveSubModal({ tipo: null, exp: null })}
              className="minimal-button py-3 text-sm rounded-xl w-full"
            >
              Cerrar Ventana
            </button>
          </div>
        </div>
      )}

      {/* TÍTULO EXPEDIENTES CON LA "E" EN AZUL */}
      <div className="w-full text-left shrink-0 pt-1 flex items-baseline">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-on-background flex items-baseline">
          <span className="text-primary text-5xl sm:text-6xl font-black mr-0.5 leading-none">E</span>xpedientes
        </h1>
      </div>

      {/* FILA DE BOTONES SUPERIORES */}
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
          title="Buscar Expediente"
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
          onClick={() => setIsModalOpen(true)}
          className="flex-1 h-12 minimal-button rounded-xl flex items-center justify-center shrink-0"
          title="Nuevo Expediente"
        >
          <FolderPlus className="w-6 h-6" />
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
            placeholder="Escribe nº exp, cliente o vehículo..." 
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
          {(['TODOS', 'RECEPCION', 'EN_PROCESO', 'PRESUPUESTADO', 'PENDIENTE_PAGO', 'FINALIZADO'] as const).map((est) => (
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

      {/* LISTA DE TARJETAS DE EXPEDIENTE (ICONOS OCULTOS HASTA PULSAR LA TARJETA) */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
        {filteredExpedientes.length === 0 ? (
          <div className="flex items-center justify-center h-28 text-sm text-on-surface/50 font-bold">
            Sin expedientes
          </div>
        ) : (
          filteredExpedientes.map((exp) => {
            const estadoCfg = ESTADO_CONFIG[exp.estado];
            const isExpanded = expandedExpId === exp.id;

            return (
              <div 
                key={exp.id} 
                onClick={() => toggleCardExpand(exp.id)}
                className="minimal-card p-4 flex flex-col gap-2.5 border border-border/60 hover:border-primary/40 transition-all duration-200 shadow-sm cursor-pointer"
              >
                {/* LÍNEA 1: Número de expediente x1.5 + Estado Badge x2 a la derecha (Sin recuadros extra) */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm sm:text-base px-3 py-1 bg-surface-hover border border-border/80 rounded-xl text-slate-800 dark:text-slate-200 shrink-0 shadow-sm">
                    {exp.numero}
                  </span>

                  <span className={`text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl shrink-0 shadow-sm ${estadoCfg.bg} ${estadoCfg.text}`}>
                    {estadoCfg.label}
                  </span>
                </div>

                {/* LÍNEA 2: Nombre Completo a Tamaño Grande */}
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-800 dark:text-slate-200 truncate leading-tight">
                    {exp.cliente_nombre}
                  </h3>
                </div>

                {/* LÍNEA 3: Matrícula y Marca del Vehículo x1.2 más de tamaño */}
                <div>
                  <p className="text-sm sm:text-base font-black text-slate-700 dark:text-slate-300 truncate">
                    {exp.objeto_titulo.split(' - ')[0]}
                  </p>
                </div>

                {/* ICONOS X2 OCULTOS POR DEFECTO: Aparecen al pulsar la tarjeta de forma fluida empujando al resto */}
                {isExpanded && (
                  <div className="flex items-center justify-around gap-2 pt-3 mt-1 border-t border-border/40 w-full animate-fade-in">
                    
                    {/* 1. Presupuesto */}
                    <button 
                      onClick={(e) => openSubView('PRESUPUESTADO', exp, e)}
                      className="p-2.5 text-primary hover:scale-125 transition-transform"
                      title="Presupuesto"
                    >
                      <Calculator className="w-8 h-8 sm:w-9 sm:h-9" />
                    </button>

                    {/* 2. Cita */}
                    <button 
                      onClick={(e) => openSubView('CITA', exp, e)}
                      className="p-2.5 text-primary hover:scale-125 transition-transform"
                      title="Cita"
                    >
                      <Calendar className="w-8 h-8 sm:w-9 sm:h-9" />
                    </button>

                    {/* 3. Reparación */}
                    <button 
                      onClick={(e) => openSubView('REPARACION', exp, e)}
                      className="p-2.5 text-primary hover:scale-125 transition-transform"
                      title="Reparación"
                    >
                      <Wrench className="w-8 h-8 sm:w-9 sm:h-9" />
                    </button>

                    {/* 4. Factura */}
                    <button 
                      onClick={(e) => openSubView('FACTURA', exp, e)}
                      className="p-2.5 text-primary hover:scale-125 transition-transform"
                      title="Factura"
                    >
                      <FileText className="w-8 h-8 sm:w-9 sm:h-9" />
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

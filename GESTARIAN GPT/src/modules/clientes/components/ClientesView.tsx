"use client";

import React, { useState } from 'react';
import { Search, UserPlus, FolderPlus, Eye, ArrowLeft, X } from 'lucide-react';
import { useClientesStore } from '../store';
import NuevoClienteModal from './NuevoClienteModal';

export default function ClientesView() {
  const { clientes, searchQuery, setSearchQuery } = useClientesStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);

  const handleGoHome = () => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'dashboard' }));
  };

  const filteredClientes = clientes.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      (c.dni && c.dni.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.includes(q))
    );
  });

  return (
    <div className="flex flex-col gap-3 w-full h-full p-3 lg:p-5">
      <NuevoClienteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* TÍTULO CLIENTES CON LA "C" EN AZUL */}
      <div className="w-full text-left shrink-0 pt-1 flex items-baseline">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-on-background flex items-baseline">
          <span className="text-primary text-5xl sm:text-6xl font-black mr-0.5 leading-none">C</span>lientes
        </h1>
      </div>

      {/* FILA DE 4 BOTONES SUPERIORES EQUIDISTANTES */}
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
          title="Buscar Cliente"
        >
          <Search className="w-6 h-6" />
        </button>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex-1 h-12 minimal-button rounded-xl flex items-center justify-center"
          title="Nuevo Cliente"
        >
          <UserPlus className="w-6 h-6" />
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
            placeholder="Escribe nombre, DNI o teléfono..." 
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

      {/* LISTA DE TARJETAS: Solo Nombre x1.2 + 2 Botones Grandes x2 Debajo (Expedientes y Ver) */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3">
        {filteredClientes.length === 0 ? (
          <div className="flex items-center justify-center h-28 text-sm text-on-surface/50 font-bold">
            Sin resultados
          </div>
        ) : (
          filteredClientes.map((cliente) => (
            <div 
              key={cliente.id} 
              className="minimal-card p-4 flex flex-col gap-3 border border-border/60 hover:border-primary/40 transition-colors shadow-sm"
            >
              {/* Único dato en la tarjeta: Nombre del Cliente x1.2 en Gris Oscuro */}
              <div>
                <h3 className="font-black text-lg sm:text-xl text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {cliente.nombre}
                </h3>
              </div>

              {/* 2 Botones Grandes x2 Justo Debajo repartiéndose el ancho equitativamente */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40 w-full">
                <button 
                  className="flex-1 py-3 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-sm sm:text-base font-black flex items-center justify-center gap-2 transition-colors border border-primary/20 shadow-sm"
                  title="Expedientes"
                >
                  <FolderPlus className="w-5 h-5" />
                  <span>Expedientes</span>
                </button>

                <button 
                  className="flex-1 py-3 px-3 bg-surface-hover hover:bg-border text-slate-800 dark:text-slate-200 rounded-xl text-sm sm:text-base font-black flex items-center justify-center gap-2 transition-colors border border-border/60 shadow-sm"
                  title="Ver Ficha"
                >
                  <Eye className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <span>Ver</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

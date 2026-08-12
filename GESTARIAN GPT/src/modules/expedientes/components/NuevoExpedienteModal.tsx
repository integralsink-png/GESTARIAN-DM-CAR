"use client";

import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { useExpedientesStore } from '../store';
import { useClientesStore } from '@/modules/clientes/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NuevoExpedienteModal({ isOpen, onClose }: Props) {
  const { addExpediente } = useExpedientesStore();
  const { clientes } = useClientesStore();

  const [clienteId, setClienteId] = useState(clientes[0]?.id || '');
  const [objetoTitulo, setObjetoTitulo] = useState('');
  const [presupuesto, setPresupuesto] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!objetoTitulo.trim()) return;

    const selectedCliente = clientes.find(c => c.id === clienteId) || clientes[0];

    addExpediente({
      organizacion_id: 'org_1',
      cliente_id: selectedCliente?.id || 'cli_1',
      cliente_nombre: selectedCliente?.nombre || 'Cliente General',
      cliente_telefono: selectedCliente?.telefono || undefined,
      objeto_titulo: objetoTitulo.trim(),
      estado: 'RECEPCION',
      total_presupuesto: presupuesto ? parseFloat(presupuesto) : undefined,
      fotos_count: 0,
      incidencias_count: 0,
    });

    setObjetoTitulo('');
    setPresupuesto('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-on-surface">Abrir Expediente</h2>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface/50 hover:text-on-surface rounded-xl hover:bg-surface-hover">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-on-surface/70 block mb-1">Cliente *</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full p-3 bg-surface-hover border border-border rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
            >
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre} ({c.dni || 'Sin DNI'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface/70 block mb-1">Objeto / Vehículo / Trabajo *</label>
            <input
              type="text"
              required
              value={objetoTitulo}
              onChange={(e) => setObjetoTitulo(e.target.value)}
              placeholder="Ej: Seat Leon 1234-XYZ - Cambio Aceite"
              className="w-full p-3 bg-surface-hover border border-border rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface/70 block mb-1">Presupuesto Estimado (€)</label>
            <input
              type="number"
              step="0.01"
              value={presupuesto}
              onChange={(e) => setPresupuesto(e.target.value)}
              placeholder="0.00"
              className="w-full p-3 bg-surface-hover border border-border rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 minimal-button-outline py-3 text-sm">
              Cancelar
            </button>
            <button type="submit" className="flex-1 minimal-button py-3 text-sm">
              Crear Expediente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

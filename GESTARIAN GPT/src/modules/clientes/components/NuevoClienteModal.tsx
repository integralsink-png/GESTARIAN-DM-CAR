"use client";

import React, { useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { useClientesStore } from '../store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function NuevoClienteModal({ isOpen, onClose }: Props) {
  const { addCliente } = useClientesStore();
  const [nombre, setNombre] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    addCliente({
      organizacion_id: 'org_1',
      nombre: nombre.trim(),
      dni: dni.trim() || null,
      telefono: telefono.trim() || null,
      email: email.trim() || null,
      direccion: null,
      cp: null,
      localidad: null,
    });

    setNombre('');
    setDni('');
    setTelefono('');
    setEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-on-surface">Nuevo Cliente</h2>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface/50 hover:text-on-surface rounded-xl hover:bg-surface-hover">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-on-surface/70 block mb-1">Nombre Completo *</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Manuel García"
              className="w-full p-3 bg-surface-hover border border-border rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-on-surface/70 block mb-1">DNI / NIF</label>
              <input
                type="text"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                placeholder="12345678X"
                className="w-full p-3 bg-surface-hover border border-border rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-on-surface/70 block mb-1">Teléfono</label>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="600000000"
                className="w-full p-3 bg-surface-hover border border-border rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-on-surface/70 block mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
              className="w-full p-3 bg-surface-hover border border-border rounded-xl text-sm font-semibold text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 minimal-button-outline py-3 text-sm">
              Cancelar
            </button>
            <button type="submit" className="flex-1 minimal-button py-3 text-sm">
              Guardar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

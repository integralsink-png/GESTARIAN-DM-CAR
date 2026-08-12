"use client";

import React, { useState } from 'react';
import { X, Camera, Plus, Image as ImageIcon, Trash2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  expedienteNumero: string;
  objetoTitulo: string;
  onClose: () => void;
}

type CategoriaFoto = 'ANTES' | 'DURANTE' | 'DESPUES';

interface FotoItem {
  id: string;
  url: string;
  categoria: CategoriaFoto;
  fecha: string;
}

const MOCK_FOTOS: FotoItem[] = [
  {
    id: 'f1',
    url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=600&q=80',
    categoria: 'ANTES',
    fecha: '10 AGO 10:30',
  },
  {
    id: 'f2',
    url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80',
    categoria: 'DURANTE',
    fecha: '10 AGO 12:15',
  },
  {
    id: 'f3',
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=600&q=80',
    categoria: 'DESPUES',
    fecha: '10 AGO 14:00',
  }
];

export default function AlbumFotosModal({ isOpen, expedienteNumero, objetoTitulo, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<CategoriaFoto>('ANTES');
  const [fotos, setFotos] = useState<FotoItem[]>(MOCK_FOTOS);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentFotos = fotos.filter(f => f.categoria === activeTab);

  const handleAddSimulatedPhoto = () => {
    const newFoto: FotoItem = {
      id: `f_${Date.now()}`,
      url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
      categoria: activeTab,
      fecha: 'HORA ACTUAL',
    };
    setFotos([newFoto, ...fotos]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-lg rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between shrink-0 border-b border-border/50 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              <span className="font-extrabold text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md">
                {expedienteNumero}
              </span>
            </div>
            <h2 className="text-base font-bold text-on-surface truncate mt-0.5">{objetoTitulo}</h2>
          </div>

          <button onClick={onClose} className="p-2 text-on-surface/50 hover:text-on-surface rounded-xl hover:bg-surface-hover">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas de Contexto: ANTES | DURANTE | DESPUÉS */}
        <div className="flex bg-surface-hover p-1 rounded-2xl border border-border/60 shrink-0">
          {(['ANTES', 'DURANTE', 'DESPUES'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                activeTab === cat
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface/60 hover:text-on-surface'
              }`}
            >
              {cat === 'ANTES' ? '1. Antes (Recepción)' : cat === 'DURANTE' ? '2. Durante (Taller)' : '3. Después (Entrega)'}
            </button>
          ))}
        </div>

        {/* Galería de Fotos Grid */}
        <div className="flex-1 overflow-y-auto min-h-[220px] pr-1">
          {currentFotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-on-surface/40 space-y-2">
              <ImageIcon className="w-10 h-10 opacity-50" />
              <span className="text-xs font-semibold">Sin fotos grabadas en la etapa de {activeTab}</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {currentFotos.map((foto) => (
                <div 
                  key={foto.id}
                  onClick={() => setSelectedImage(foto.url)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-surface-hover border border-border cursor-pointer shadow-sm hover:border-primary transition-all"
                >
                  <img src={foto.url} alt="Foto Expediente" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-90 p-2 flex items-end justify-between">
                    <span className="text-[10px] font-bold text-white">{foto.fecha}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions: Capturar / Añadir Foto */}
        <div className="shrink-0 pt-2 border-t border-border/50 flex gap-2">
          <button 
            onClick={handleAddSimulatedPhoto}
            className="w-full minimal-button py-3 text-xs flex items-center justify-center gap-2 rounded-xl"
          >
            <Camera className="w-4 h-4" />
            Capturar Foto ({activeTab})
          </button>
        </div>

      </div>

      {/* Modal Zoom en Imagen Completa */}
      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <img src={selectedImage} alt="Zoom" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}

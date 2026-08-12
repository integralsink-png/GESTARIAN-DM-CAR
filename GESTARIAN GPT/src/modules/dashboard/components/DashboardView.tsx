"use client";

import React from 'react';
import { FileText, Calendar, DollarSign } from 'lucide-react';

export default function DashboardView() {
  return (
    <div className="flex flex-col gap-5 w-full h-full p-4 lg:p-6">
      {/* Título Resumen de Actividad con la R y la A en AZUL */}
      <div className="flex flex-col">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-on-background leading-none">
          <span className="text-primary">R</span>esumen
        </h1>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-on-background leading-none mt-1">
          de <span className="text-primary">A</span>ctividad
        </h1>
      </div>

      {/* Grid de Métricas con Títulos x2 en Negrita e Iconos x1.5 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        
        {/* Card 1 */}
        <div className="minimal-card p-5 bg-primary text-on-primary flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xl sm:text-2xl font-black tracking-tight opacity-95">Expedientes Activos</p>
            <p className="text-3xl font-black mt-1">24</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-on-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-7 h-7" />
          </div>
        </div>

        {/* Card 2 */}
        <div className="minimal-card p-5 bg-secondary text-on-secondary flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xl sm:text-2xl font-black tracking-tight opacity-95">Citas Hoy</p>
            <p className="text-3xl font-black mt-1">7</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-on-secondary/10 flex items-center justify-center shrink-0">
            <Calendar className="w-7 h-7" />
          </div>
        </div>

        {/* Card 3 */}
        <div className="minimal-card p-5 bg-tertiary text-on-tertiary flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xl sm:text-2xl font-black tracking-tight opacity-95">Ingresos Mes</p>
            <p className="text-3xl font-black mt-1">4.250 €</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-on-tertiary/10 flex items-center justify-center shrink-0">
            <DollarSign className="w-7 h-7" />
          </div>
        </div>

      </div>
    </div>
  );
}

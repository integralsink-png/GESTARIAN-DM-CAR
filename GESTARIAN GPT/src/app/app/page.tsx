"use client";

import React, { useEffect, useRef } from 'react';
import DashboardView from '@/modules/dashboard/components/DashboardView';
import ExpedientesView from '@/modules/expedientes/components/ExpedientesView';
import ClientesView from '@/modules/clientes/components/ClientesView';
import PresupuestosView from '@/modules/presupuestos/components/PresupuestosView';
import CitasView from '@/modules/citas/components/CitasView';
import ReparacionesView from '@/modules/reparaciones/components/ReparacionesView';
import FacturasView from '@/modules/facturas/components/FacturasView';
import BalancesView from '@/modules/balances/components/BalancesView';
import ConfiguracionView from '@/modules/configuracion/components/ConfiguracionView';
import FloatingWallMenu from '@/components/layout/FloatingWallMenu';

export default function AppMainLayout() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Escuchar rueda del ratón y arrastre (drag) para navegación fluida en PC / VS Code
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasDragged = false;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && !e.shiftKey) {
        el.scrollLeft += e.deltaY;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDown = true;
      hasDragged = false;
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };

    const handleMouseLeaveOrUp = () => {
      isDown = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      
      // Solo consideramos arrastre si se mueve más de 5px
      if (Math.abs(walk) > 5) {
        hasDragged = true;
        el.scrollLeft = scrollLeft - walk;
      }
    };

    const handleClickCapture = (e: MouseEvent) => {
      if (hasDragged) {
        e.stopPropagation();
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: true });
    el.addEventListener('mousedown', handleMouseDown);
    el.addEventListener('mouseleave', handleMouseLeaveOrUp);
    el.addEventListener('mouseup', handleMouseLeaveOrUp);
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('click', handleClickCapture, true);

    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('mousedown', handleMouseDown);
      el.removeEventListener('mouseleave', handleMouseLeaveOrUp);
      el.removeEventListener('mouseup', handleMouseLeaveOrUp);
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('click', handleClickCapture, true);
    };
  }, []);

  // Listen for custom navigation events triggered by the Sidebar
  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetId = customEvent.detail;
      const targetElement = document.getElementById(targetId);
      
      if (targetElement && scrollRef.current) {
        targetElement.scrollIntoView({ behavior: 'smooth', inline: 'start' });
      }
    };

    window.addEventListener('navigate-tab', handleNavigate);
    return () => window.removeEventListener('navigate-tab', handleNavigate);
  }, []);

  return (
    <div 
      ref={scrollRef}
      className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar"
      style={{ scrollBehavior: 'smooth' }}
    >
      
      {/* 1. Resumen de Actividad (Dashboard) */}
      <section id="dashboard" className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto relative">
        <DashboardView />
      </section>

      {/* 2. Expedientes */}
      <section id="expedientes" className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto relative">
        <ExpedientesView />
      </section>

      {/* 3. Clientes */}
      <section id="clientes" className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto relative">
        <ClientesView />
      </section>

      {/* 4. Presupuestos */}
      <section id="presupuestos" className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto relative">
        <PresupuestosView />
      </section>

      {/* 5. Citas */}
      <section id="citas" className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto relative">
        <CitasView />
      </section>

      {/* 6. Reparaciones / Taller */}
      <section id="reparaciones" className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto relative">
        <ReparacionesView />
      </section>

      {/* 7. Facturación */}
      <section id="facturas" className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto relative">
        <FacturasView />
      </section>

      {/* 8. Balances */}
      <section id="balances" className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto relative">
        <BalancesView />
      </section>

      {/* 9. Configuración */}
      <section id="configuracion" className="w-full h-full flex-shrink-0 snap-start snap-always overflow-y-auto relative">
        <ConfiguracionView />
      </section>
      
      {/* Menú Flotante Muro de Baldosas */}
      <FloatingWallMenu />

    </div>
  );
}

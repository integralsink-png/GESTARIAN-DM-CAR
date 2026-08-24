import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { playSuccessChime, playTimepickerTickSound } from '../lib/sound';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronUp, CheckCircle2, ArrowLeft } from 'lucide-react';
import { MatriculaBadge } from '../components/UI';
import { notificarModificacionCitaAlCliente } from '../services/notificationService';

// Generar intervalos de 15 minutos desde 07:00 hasta 21:00
const TIME_SLOTS: string[] = [];
for (let h = 7; h <= 21; h++) {
  for (let m = 0; m < 60; m += 15) {
    if (h === 21 && m > 0) break;
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

// Índice por defecto para las 12:00
const DEFAULT_12_INDEX = TIME_SLOTS.indexOf('12:00') !== -1 ? TIME_SLOTS.indexOf('12:00') : 20;

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function AsignarCitaPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as {
    vehiculoId?: string;
    clienteId?: string;
    presupuestoId?: string;
    citaId?: string;
    expedienteId?: string;
    clienteNombre?: string;
    matricula?: string;
  };

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());
  const [selectedTimeIndex, setSelectedTimeIndex] = useState<number>(DEFAULT_12_INDEX);
  
  const [guardando, setGuardando] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Referencias para el control táctil/arrastre de la rueda vintage
  const wheelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);

  // Month navigation
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    setSelectedDay(1);
  };

  // Days in month calculation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday = 0

  // Scroll de rueda vintage tuning con sonido sutil de reloj
  const handleWheelTuning = (e: React.WheelEvent) => {
    e.preventDefault();
    playTimepickerTickSound();
    if (e.deltaY > 0) {
      setSelectedTimeIndex((prev) => Math.min(TIME_SLOTS.length - 1, prev + 1));
    } else {
      setSelectedTimeIndex((prev) => Math.max(0, prev - 1));
    }
  };

  // Arrastre táctil en la rueda tuning con sonido sutil de reloj
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = dragStartY.current - currentY;
    if (Math.abs(diff) > 16) {
      playTimepickerTickSound();
      if (diff > 0) {
        setSelectedTimeIndex((prev) => Math.min(TIME_SLOTS.length - 1, prev + 1));
      } else {
        setSelectedTimeIndex((prev) => Math.max(0, prev - 1));
      }
      dragStartY.current = currentY;
    }
  };

  const handleTouchEnd = () => {
    dragStartY.current = null;
  };

  // Horizontal swipe for month change
  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    if (info.offset.x < -40) {
      handleNextMonth();
    } else if (info.offset.x > 40) {
      handlePrevMonth();
    }
  };

  // Asignar Cita Action
  const handleAsignarCita = async () => {
    if (guardando) return;
    setGuardando(true);

    try {
      // 1. Insertar o actualizar la cita en la tabla `citas`
      let citaIdTarget = state.citaId;
      if (citaIdTarget) {
        await supabase
          .from('citas')
          .update({
            fecha: fechaStr,
            hora: horaStr,
            estado: 'confirmada',
          })
          .eq('id', citaIdTarget);
      } else {
        const citaData: any = {
          fecha: fechaStr,
          hora: horaStr,
          estado: 'confirmada',
        };
        if (state.clienteId) citaData.cliente_id = state.clienteId;
        if (state.vehiculoId) citaData.vehiculo_id = state.vehiculoId;
        if (state.presupuestoId) citaData.presupuesto_id = state.presupuestoId;

        const { data: nuevaCita } = await supabase
          .from('citas')
          .insert(citaData)
          .select()
          .single();
        citaIdTarget = nuevaCita?.id;
      }

      // 2. Notificar al cliente de la cita asignada/propuesta
      if (state.clienteId) {
        const { data: cli } = await supabase.from('clientes').select('nombre, email').eq('id', state.clienteId).maybeSingle();
        const { data: inv } = await supabase.from('cliente_invitaciones').select('token').eq('cliente_id', state.clienteId).maybeSingle();
        if (cli?.email) {
          void notificarModificacionCitaAlCliente({
            clienteEmail: cli.email,
            clienteNombre: cli.nombre || state.clienteNombre || 'Cliente',
            matricula: state.matricula,
            nuevaFecha: fechaStr,
            nuevaHora: horaStr,
            token: inv?.token
          });
        }
      }

      // 3. Marcar el presupuesto como aceptado si existe
      if (state.presupuestoId) {
        await supabase
          .from('presupuestos')
          .update({ estado: 'aceptado' })
          .eq('id', state.presupuestoId);
      }

      // 4. Sonido y Toast animado verde
      playSuccessChime();
      setShowSuccessToast(true);

      // 5. Regreso automático tras 2 segundos a Expedientes con roadmap abierto
      setTimeout(() => {
        navigate('/expedientes', {
          state: {
            expandPresupuestoId: state.presupuestoId,
            expandExpedienteId: state.expedienteId,
            expandVehiculoId: state.vehiculoId,
            search: state.matricula || state.clienteNombre || '',
          },
        });
      }, 2000);
    } catch (err) {
      console.error('Error al asignar cita:', err);
      setGuardando(false);
    }
  };

  const currentTime = TIME_SLOTS[selectedTimeIndex] || '12:00';
  const [horaDisplay, minutoDisplay] = currentTime.split(':');

  return (
    <div className="min-h-screen bg-bg-950 text-white flex flex-col justify-between p-3 sm:p-4 select-none touch-none w-full pb-[145px]">
      {/* Toast Centrado con Glow */}
      <AnimatePresence>
        {showSuccessToast && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-none p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-emerald-600 border-4 border-white text-white font-black text-xl sm:text-2xl px-10 py-5 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.8)] flex items-center gap-4 tracking-wider uppercase animate-bounce text-center select-none"
            >
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white shrink-0" />
              <span>CITA ASIGNADA</span>
            </motion.div>
          </div>,
          document.body
        )}
      </AnimatePresence>

      {/* Header Superior */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between border-b border-bg-800 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-bg-850 hover:bg-bg-750 text-slate-300 hover:text-white transition-all active:scale-95"
            title="Volver"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-cyan-400 tracking-wide uppercase">
              ASIGNAR CITA
            </h1>
            {(state.clienteNombre || state.matricula) && (
              <div className="flex items-center gap-2 mt-0.5">
                {state.clienteNombre && (
                  <span className="text-xs text-slate-300 font-semibold truncate">
                    {state.clienteNombre}
                  </span>
                )}
                {state.matricula && <MatriculaBadge matricula={state.matricula} />}
              </div>
            )}
          </div>
        </div>

        {/* Selector rápido de mes */}
        <div className="flex items-center gap-1 bg-bg-900 border border-bg-700 rounded-xl p-1">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg hover:bg-bg-800 text-slate-400 hover:text-white transition-all active:scale-95"
            title="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-bg-800 text-cyan-400 hover:text-cyan-300 transition-all active:scale-95"
            title="Avanzar de mes"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg hover:bg-bg-800 text-slate-400 hover:text-white transition-all active:scale-95"
            title="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Conjunto Centrado: Calendario + Hora + Botones (espacio reducido a la mitad y centrado) */}
      <div className="flex-1 flex flex-col justify-center items-center gap-1.5 sm:gap-2 w-full max-w-md mx-auto my-auto py-1">
        {/* 1. Tarjeta del Mes (subida 20px) */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          className="w-full bg-bg-800/95 border border-bg-700/80 rounded-2xl p-2.5 sm:p-3 shadow-xl cursor-grab active:cursor-grabbing -mt-5"
        >
          {/* Cabecera del Mes */}
          <div className="flex items-center justify-between mb-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-slate-400 hover:text-white hover:bg-bg-700/50 rounded-xl transition-all active:scale-90"
              title="Mes anterior"
            >
              <ChevronLeft className="w-8 h-8 sm:w-9 sm:h-9 text-cyan-400" />
            </button>
            <span className="font-black text-xl sm:text-2xl text-white tracking-widest uppercase">
              {MESES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 text-slate-400 hover:text-white hover:bg-bg-700/50 rounded-xl transition-all active:scale-90"
              title="Mes siguiente"
            >
              <ChevronRight className="w-8 h-8 sm:w-9 sm:h-9 text-cyan-400" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="w-[98%] mx-auto grid grid-cols-7 gap-1 text-center font-bold text-[20px] sm:text-[23px] mb-0.5 leading-none">
            {DIAS_SEMANA.map((d, i) => {
              let colorClass = 'text-slate-400';
              if (d === 'S') colorClass = 'text-blue-400 font-bold';
              if (d === 'D') colorClass = 'text-rose-500 font-bold';

              return (
                <div key={i} className={`py-0.5 ${colorClass}`}>
                  {d}
                </div>
              );
            })}
          </div>

          {/* Grid de días */}
          <div className="w-[98%] mx-auto grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-9 sm:h-10" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const isSelected = selectedDay === dayNum;
              const isToday =
                dayNum === new Date().getDate() &&
                currentMonth === new Date().getMonth() &&
                currentYear === new Date().getFullYear();

              return (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`h-9 sm:h-10 rounded-xl text-[22px] sm:text-[25px] flex items-center justify-center transition-all active:scale-90 leading-none ${
                    isSelected
                      ? 'bg-cyan-500 text-bg-950 font-bold shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-105 ring-2 ring-white'
                      : isToday
                      ? 'text-cyan-300 font-bold drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]'
                      : 'font-medium hover:bg-bg-700/60 text-slate-200'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* 2. Selector de Hora Flotante (Espacio reducido a la mitad) */}
        <div className="w-full py-1 flex items-center justify-between gap-2 sm:gap-4">
          {/* A la izquierda: Etiqueta "Hora:" */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-black text-2xl sm:text-3xl text-cyan-400 tracking-wider uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
              Hora:
            </span>
          </div>

          {/* Al centro: Display flotante de la hora seleccionada */}
          <div className="flex items-center justify-center gap-1.5 py-0.5 px-3.5 rounded-2xl bg-cyan-500/10 border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <span className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums">
              {horaDisplay}
            </span>
            <span className="text-2xl sm:text-3xl font-black text-cyan-400 animate-pulse pb-0.5">:</span>
            <span className="text-3xl sm:text-4xl font-black text-cyan-300 tracking-tight tabular-nums">
              {minutoDisplay}
            </span>
          </div>

          {/* A la derecha: Rueda Vintage Tuning */}
          <div
            ref={wheelRef}
            onWheel={handleWheelTuning}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex items-center gap-2 cursor-ns-resize group select-none shrink-0"
            title="Gira la rueda o haz scroll para ajustar la hora"
          >
            {/* Rueda Vintage Tuning */}
            <div className="relative w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-gradient-to-b from-slate-700 via-slate-900 to-slate-700 border-2 border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.35)] flex flex-col justify-between py-1 px-2 overflow-hidden active:scale-95 transition-transform">
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-black/30 pointer-events-none" />
              <div className="flex flex-col justify-between h-full w-full py-0.5 z-10">
                <div className="h-0.5 w-full bg-slate-500 rounded-full opacity-60" />
                <div className="h-1 w-full bg-amber-400/80 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                <div className="h-0.5 w-full bg-slate-500 rounded-full opacity-60" />
                <div className="h-1.5 w-full bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
                <div className="h-0.5 w-full bg-slate-500 rounded-full opacity-60" />
                <div className="h-1 w-full bg-amber-400/80 rounded-full shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                <div className="h-0.5 w-full bg-slate-500 rounded-full opacity-60" />
              </div>

              <div className="absolute inset-y-0 right-1 w-1 bg-red-500/90 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
            </div>

            {/* Micro flechas */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => {
                  playTimepickerTickSound();
                  setSelectedTimeIndex((prev) => Math.max(0, prev - 1));
                }}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-90 border border-slate-700"
                title="+15 min"
              >
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  playTimepickerTickSound();
                  setSelectedTimeIndex((prev) => Math.min(TIME_SLOTS.length - 1, prev + 1));
                }}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all active:scale-90 border border-slate-700"
                title="-15 min"
              >
                <ChevronLeft className="w-3.5 h-3.5 -rotate-90" />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Botones CANCELAR y ASIGNAR CITA (bajados 40px) */}
        <div className="w-full grid grid-cols-2 gap-2.5 pt-1 mt-10 shrink-0">
          <button
            onClick={() => navigate(-1)}
            disabled={guardando}
            className="py-2.5 px-4 rounded-2xl font-black text-base sm:text-lg border-2 border-slate-700 bg-slate-800 hover:bg-slate-700 text-white transition-all active:scale-95 uppercase tracking-wider text-center flex items-center justify-center"
          >
            CANCELAR
          </button>

          <button
            onClick={handleAsignarCita}
            disabled={guardando}
            className="py-2.5 px-4 rounded-2xl font-black text-base sm:text-lg bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center uppercase tracking-wider text-center"
          >
            <span>{guardando ? 'ASIGNANDO...' : 'ASIGNAR CITA'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { playSuccessChime } from '../lib/sound';
import { Calendar as CalendarIcon, Clock, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { MatriculaBadge } from '../components/UI';

const HORAS = ['07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20'];
const MINUTOS = ['00', '15', '30', '45'];

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
    expedienteId?: string;
    clienteNombre?: string;
    matricula?: string;
  };

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number>(() => new Date().getDate());
  const [selectedHoraIndex, setSelectedHoraIndex] = useState<number>(2); // Default '09'
  const [selectedMinutoIndex, setSelectedMinutoIndex] = useState<number>(0); // Default '00'
  
  const [guardando, setGuardando] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

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

  // Roller picker helpers
  const handleHoraWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      setSelectedHoraIndex((prev) => (prev < HORAS.length - 1 ? prev + 1 : prev));
    } else {
      setSelectedHoraIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
  };

  const handleMinutoWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      setSelectedMinutoIndex((prev) => (prev < MINUTOS.length - 1 ? prev + 1 : prev));
    } else {
      setSelectedMinutoIndex((prev) => (prev > 0 ? prev - 1 : prev));
    }
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
      const horaStr = `${HORAS[selectedHoraIndex]}:${MINUTOS[selectedMinutoIndex]}`;
      const dayFormatted = String(selectedDay).padStart(2, '0');
      const monthFormatted = String(currentMonth + 1).padStart(2, '0');
      const fechaStr = `${currentYear}-${monthFormatted}-${dayFormatted}`;

      // 1. Insertar la cita en la tabla `citas`
      const citaData: any = {
        fecha: fechaStr,
        hora: horaStr,
        estado: 'pendiente',
      };

      if (state.clienteId) citaData.cliente_id = state.clienteId;
      if (state.vehiculoId) citaData.vehiculo_id = state.vehiculoId;
      if (state.presupuestoId) citaData.presupuesto_id = state.presupuestoId;

      const { data: nuevaCita, error: citaError } = await supabase
        .from('citas')
        .insert(citaData)
        .select()
        .single();

      if (citaError) {
        console.error('Error insertando cita:', citaError);
      }

      // 2. Marcar el presupuesto como aceptado en segundo plano si existe
      if (state.presupuestoId) {
        await supabase
          .from('presupuestos')
          .update({ estado: 'aceptado' })
          .eq('id', state.presupuestoId);
      }

      // 3. Sonido y Toast animado verde
      playSuccessChime();
      setShowSuccessToast(true);

      // 4. Regreso automático tras 2 segundos a Expedientes con roadmap abierto
      setTimeout(() => {
        navigate('/expedientes', {
          state: {
            expandVehiculoId: state.vehiculoId,
            expandExpedienteId: state.expedienteId,
            search: state.matricula || state.clienteNombre || '',
          },
        });
      }, 2000);
    } catch (err) {
      console.error('Error al asignar cita:', err);
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg-950 text-white flex flex-col justify-between p-3 sm:p-5 overflow-hidden select-none touch-none">
      {/* Toast animado verde con texto blanco y bordes blancos (Centrado en pantalla vía Portal) */}
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
      <div className="flex items-center justify-between border-b border-bg-800 pb-2">
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
              <div className="flex items-center gap-2 mt-1">
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

        {/* Flecha arriba para avanzar de mes rápido */}
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

      {/* Contenedor Central: Calendario con Swipe Horizontal + Selector de Hora Rodillo */}
      <div className="flex-1 flex flex-col justify-around py-2 max-w-xl mx-auto w-full overflow-hidden">
        {/* 1. Calendario del Mes */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          className="bg-bg-800/95 border border-bg-700/80 rounded-2xl p-4 sm:p-6 shadow-xl cursor-grab active:cursor-grabbing mb-3"
        >
          {/* Cabecera del Mes */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handlePrevMonth}
              className="p-2 text-slate-400 hover:text-white hover:bg-bg-700/50 rounded-xl transition-all active:scale-90"
              title="Mes anterior"
            >
              <ChevronLeft className="w-12 h-12 text-cyan-400" />
            </button>
            <span className="font-black text-2xl sm:text-3xl text-white tracking-widest uppercase">
              {MESES[currentMonth]} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-2 text-slate-400 hover:text-white hover:bg-bg-700/50 rounded-xl transition-all active:scale-90"
              title="Mes siguiente"
            >
              <ChevronRight className="w-12 h-12 text-cyan-400" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 text-center font-black text-lg sm:text-xl mb-1">
            {DIAS_SEMANA.map((d, i) => {
              let colorClass = 'text-slate-400';
              if (d === 'S') colorClass = 'text-blue-400 font-black';
              if (d === 'D') colorClass = 'text-rose-500 font-black';

              return (
                <div key={i} className={`py-1 ${colorClass}`}>
                  {d}
                </div>
              );
            })}
          </div>

          {/* Grid de días */}
          <div className="grid grid-cols-7 gap-1 text-center">
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
                  className={`h-9 sm:h-10 rounded-xl font-black text-xl sm:text-2xl flex items-center justify-center transition-all active:scale-90 ${
                    isSelected
                      ? 'bg-cyan-500 text-bg-950 font-black shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-105 ring-2 ring-white'
                      : isToday
                      ? 'text-cyan-300 font-black drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]'
                      : 'hover:bg-bg-700/60 text-slate-100'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* 2. Selector de Hora Tipo Rodillo (Grande, Minutero en Cuartos de Hora) */}
        <div className="bg-bg-800/95 border border-bg-700/80 rounded-2xl p-4 sm:p-6 shadow-xl">
          <div className="flex items-center justify-center gap-3 mb-3 text-cyan-400 font-black text-lg sm:text-xl uppercase tracking-widest">
            <Clock className="w-8 h-8" />
            <span>HORA DE LLEGADA</span>
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-8 py-2">
            {/* Rodillo de HORAS */}
            <div
              onWheel={handleHoraWheel}
              className="relative flex flex-col items-center justify-center w-24 sm:w-28 h-32 overflow-hidden cursor-pointer"
            >
              {/* Botón arriba */}
              <button
                onClick={() => setSelectedHoraIndex((prev) => Math.max(0, prev - 1))}
                className="absolute top-0 z-10 p-1 text-slate-400 hover:text-white"
              >
                <ChevronUp className="w-5 h-5" />
              </button>

              {/* Elementos anteriores y activos */}
              <div className="flex flex-col items-center justify-center space-y-1">
                {/* Hora anterior */}
                <span
                  onClick={() => setSelectedHoraIndex((prev) => Math.max(0, prev - 1))}
                  className="text-slate-500 font-bold text-lg opacity-40 select-none cursor-pointer"
                >
                  {HORAS[selectedHoraIndex - 1] || '—'}
                </span>

                {/* Hora seleccionada (GRANDE) */}
                <span className="text-4xl sm:text-5xl font-black text-cyan-300 tracking-wider py-1 px-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  {HORAS[selectedHoraIndex]}
                </span>

                {/* Hora siguiente */}
                <span
                  onClick={() => setSelectedHoraIndex((prev) => Math.min(HORAS.length - 1, prev + 1))}
                  className="text-slate-500 font-bold text-lg opacity-40 select-none cursor-pointer"
                >
                  {HORAS[selectedHoraIndex + 1] || '—'}
                </span>
              </div>

              {/* Botón abajo */}
              <button
                onClick={() => setSelectedHoraIndex((prev) => Math.min(HORAS.length - 1, prev + 1))}
                className="absolute bottom-0 z-10 p-1 text-slate-400 hover:text-white"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Separador de dos puntos */}
            <span className="text-4xl sm:text-5xl font-black text-slate-400 pb-1">:</span>

            {/* Rodillo de MINUTOS (Cuartos de hora: 00, 15, 30, 45) */}
            <div
              onWheel={handleMinutoWheel}
              className="relative flex flex-col items-center justify-center w-24 sm:w-28 h-32 overflow-hidden cursor-pointer"
            >
              {/* Botón arriba */}
              <button
                onClick={() => setSelectedMinutoIndex((prev) => Math.max(0, prev - 1))}
                className="absolute top-0 z-10 p-1 text-slate-400 hover:text-white"
              >
                <ChevronUp className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center justify-center space-y-1">
                {/* Minuto anterior */}
                <span
                  onClick={() => setSelectedMinutoIndex((prev) => Math.max(0, prev - 1))}
                  className="text-slate-500 font-bold text-lg opacity-40 select-none cursor-pointer"
                >
                  {MINUTOS[selectedMinutoIndex - 1] || '—'}
                </span>

                {/* Minuto seleccionado (GRANDE) */}
                <span className="text-4xl sm:text-5xl font-black text-cyan-300 tracking-wider py-1 px-3 rounded-xl bg-cyan-500/15 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  {MINUTOS[selectedMinutoIndex]}
                </span>

                {/* Minuto siguiente */}
                <span
                  onClick={() => setSelectedMinutoIndex((prev) => Math.min(MINUTOS.length - 1, prev + 1))}
                  className="text-slate-500 font-bold text-lg opacity-40 select-none cursor-pointer"
                >
                  {MINUTOS[selectedMinutoIndex + 1] || '—'}
                </span>
              </div>

              {/* Botón abajo */}
              <button
                onClick={() => setSelectedMinutoIndex((prev) => Math.min(MINUTOS.length - 1, prev + 1))}
                className="absolute bottom-0 z-10 p-1 text-slate-400 hover:text-white"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Botones Inferiores: ASIGNAR CITA y CANCELAR */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 border-t border-bg-800 max-w-xl mx-auto w-full">
        <button
          onClick={handleAsignarCita}
          disabled={guardando}
          className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl font-black text-base sm:text-lg bg-emerald-500 hover:bg-emerald-400 text-bg-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 uppercase tracking-wider"
        >
          <CalendarIcon className="w-5 h-5" />
          <span>{guardando ? 'ASIGNANDO...' : 'ASIGNAR CITA'}</span>
        </button>

        <button
          onClick={() => navigate(-1)}
          disabled={guardando}
          className="w-full sm:w-auto py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base border border-bg-700 bg-bg-850 hover:bg-bg-800 text-slate-300 hover:text-white transition-all active:scale-95 uppercase tracking-wider"
        >
          CANCELAR
        </button>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { playLongSuccessChime } from '../lib/sound';

export type TimelineColor = 'emerald' | 'amber' | 'yellow' | 'blue' | 'slate' | 'red';

export interface TimelineStep {
  id: string;
  title: string;
  subtitle?: string;
  color: TimelineColor;
  date?: string;
  animatedBorder?: boolean;
  action?: {
    onClick: () => void;
  };
}

interface TimelineVisualProps {
  steps: TimelineStep[];
}

export function TimelineVisual({ steps }: TimelineVisualProps) {
  const [confirmStepId, setConfirmStepId] = useState<string | null>(null);
  const [animatingStepId, setAnimatingStepId] = useState<string | null>(null);
  const [flashingStepId, setFlashingStepId] = useState<string | null>(null);

  return (
    <div className="w-full flex flex-col items-center gap-3 py-4 overflow-visible">
      {steps.map((step) => {
        const isPresupuesto = step.id === 'presupuesto';
        const isPresupuestoPendiente = isPresupuesto && (step.title === 'Presupuesto Pendiente' || step.color === 'amber');
        const isConfirming = confirmStepId === step.id;
        const isBursting = animatingStepId === step.id;
        const isFlashing = flashingStepId === step.id;

        // Si esta parada está en animación de aceptación activa
        const effectiveColor = isBursting ? 'emerald' : step.color;
        const effectiveTitle = isBursting ? 'Presupuesto Aceptado' : step.title;
        
        let bgClass = 'bg-slate-700/20 border-slate-600 text-slate-300';
        if (effectiveColor === 'emerald') {
          bgClass = 'bg-emerald-500/25 border-emerald-400 text-emerald-300 hover:bg-emerald-500/35 shadow-[0_0_20px_rgba(16,185,129,0.3)] drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]';
        } else if (effectiveColor === 'amber') {
          bgClass = 'bg-amber-500/20 border-amber-500/60 text-amber-400 hover:bg-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
        } else if (effectiveColor === 'blue') {
          bgClass = 'bg-blue-500/20 border-blue-500/60 text-blue-400 hover:bg-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
        } else if (effectiveColor === 'yellow') {
          bgClass = 'bg-yellow-500/20 border-yellow-400/60 text-yellow-300 hover:bg-yellow-500/25 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
        } else if (effectiveColor === 'red') {
          bgClass = 'bg-red-500/20 border-red-500/60 text-red-400 hover:bg-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
        } else if (effectiveColor === 'slate') {
          bgClass = 'bg-slate-500/20 border-slate-600/30 text-slate-500';
        }

        let borderAnimClass = '';
        if (step.animatedBorder && !isBursting && !isFlashing) {
          if (effectiveColor === 'emerald') borderAnimClass = 'animated-contour-border-emerald';
          else if (effectiveColor === 'amber' || effectiveColor === 'yellow') borderAnimClass = 'animated-contour-border-amber';
          else borderAnimClass = 'animated-contour-border';
        }

        const burstAnimClass = isBursting ? 'animated-step-burst' : '';
        const flashAnimClass = isFlashing ? 'roadmap-flash' : '';

        // Renderizado especial cuando está en fase de confirmación previa
        if (isPresupuestoPendiente && isConfirming && !isBursting) {
          return (
            <React.Fragment key={step.id}>
              <div className={`w-full max-w-sm rounded-xl border-[2px] p-3 flex items-center justify-between transition-all bg-emerald-500/25 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] ${flashAnimClass}`}>
                <div 
                  onClick={() => {
                    setConfirmStepId(null);
                    setFlashingStepId(step.id);
                    setTimeout(() => {
                      setFlashingStepId(null);
                      setAnimatingStepId(step.id);
                      playLongSuccessChime();
                      setTimeout(() => {
                        setAnimatingStepId(null);
                        if (step.action?.onClick) {
                          step.action.onClick();
                        }
                      }, 500);
                    }, 800);
                  }}
                  className="flex-1 text-center font-extrabold uppercase tracking-wider text-sm md:text-base py-2 cursor-pointer active:scale-95 transition-transform text-white"
                >
                  ACEPTAR PRESUPUESTO
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmStepId(null);
                  }}
                  className="p-1 ml-2 text-yellow-400 hover:text-yellow-300 transition-all hover:scale-110 active:scale-95 shrink-0 flex items-center justify-center border-l border-emerald-500/30 pl-4"
                  title="Descartar"
                >
                  <X className="w-10 h-10 stroke-[3.5]" />
                </button>
              </div>
            </React.Fragment>
          );
        }

        const isInteractive = !!step.action && effectiveColor !== 'slate' && !isBursting;
        const Container = isInteractive ? 'button' : 'div';
        const containerProps = isInteractive ? { 
          onClick: () => {
            if (isPresupuestoPendiente) {
              setConfirmStepId(step.id);
            } else {
              step.action!.onClick();
            }
          },
          className: `w-full max-w-sm rounded-xl border-[2px] p-4 text-center transition-all cursor-pointer active:scale-95 ${bgClass} ${borderAnimClass} ${burstAnimClass}`
        } : {
          className: `w-full max-w-sm rounded-xl border-[2px] p-4 text-center transition-all ${bgClass} ${borderAnimClass} ${burstAnimClass}`
        };

        return (
          <React.Fragment key={step.id}>
            <Container {...(containerProps as any)}>
              <div className="flex flex-col items-center justify-center gap-1 py-1">
                <span className="font-bold uppercase tracking-wider text-sm md:text-base">
                  {effectiveTitle}
                </span>
                {step.subtitle && !isBursting && (
                  <span className="font-black uppercase tracking-wider text-xs md:text-sm text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)] mt-0.5">
                    {step.subtitle}
                  </span>
                )}
              </div>
            </Container>
          </React.Fragment>
        );
      })}
    </div>
  );
}

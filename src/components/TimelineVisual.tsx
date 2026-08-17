import React from 'react';
import { X } from 'lucide-react';

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
  const [confirmStepId, setConfirmStepId] = React.useState<string | null>(null);

  return (
    <div className="w-full flex flex-col items-center gap-3 py-4">
      {steps.map((step) => {
        const isPresupuestoPendiente = step.id === 'presupuesto' && step.title === 'Presupuesto Pendiente';
        const isConfirming = confirmStepId === step.id;
        
        let bgClass = 'bg-slate-700/20 border-slate-600 text-slate-300';
        if (step.color === 'emerald') {
          bgClass = 'bg-emerald-500/25 border-emerald-400 text-emerald-300 hover:bg-emerald-500/35 shadow-[0_0_20px_rgba(16,185,129,0.3)] drop-shadow-[0_0_6px_rgba(16,185,129,0.4)]';
        } else if (step.color === 'amber') {
          bgClass = 'bg-amber-500/20 border-amber-500/60 text-amber-400 hover:bg-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
        } else if (step.color === 'blue') {
          bgClass = 'bg-blue-500/20 border-blue-500/60 text-blue-400 hover:bg-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
        } else if (step.color === 'yellow') {
          bgClass = 'bg-yellow-500/20 border-yellow-400/60 text-yellow-300 hover:bg-yellow-500/25 shadow-[0_0_15px_rgba(234,179,8,0.2)]';
        } else if (step.color === 'red') {
          bgClass = 'bg-red-500/20 border-red-500/60 text-red-400 hover:bg-red-500/25 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
        } else if (step.color === 'slate') {
          bgClass = 'bg-slate-500/20 border-slate-600/30 text-slate-500';
        }

        let borderAnimClass = '';
        if (step.animatedBorder) {
          if (step.color === 'emerald') borderAnimClass = 'animated-contour-border-emerald';
          else if (step.color === 'amber' || step.color === 'yellow') borderAnimClass = 'animated-contour-border-amber';
          else borderAnimClass = 'animated-contour-border';
        }

        // Renderizado especial cuando está en fase de confirmación
        if (isPresupuestoPendiente && isConfirming) {
          return (
            <React.Fragment key={step.id}>
              <div className="w-full max-w-sm rounded-xl border-[2px] p-3 flex items-center justify-between transition-all bg-emerald-500/25 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                <div 
                  onClick={() => {
                    setConfirmStepId(null);
                    step.action!.onClick();
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

        const isInteractive = !!step.action && step.color !== 'slate';
        const Container = isInteractive ? 'button' : 'div';
        const containerProps = isInteractive ? { 
          onClick: () => {
            if (isPresupuestoPendiente) {
              setConfirmStepId(step.id);
            } else {
              step.action!.onClick();
            }
          },
          className: `w-full max-w-sm rounded-xl border-[2px] p-4 text-center transition-all cursor-pointer active:scale-95 ${bgClass} ${borderAnimClass}`
        } : {
          className: `w-full max-w-sm rounded-xl border-[2px] p-4 text-center transition-all ${bgClass} ${borderAnimClass}`
        };

        return (
          <React.Fragment key={step.id}>
            <Container {...(containerProps as any)}>
              <div className="flex flex-col items-center justify-center gap-1 py-1">
                <span className="font-bold uppercase tracking-wider text-sm md:text-base">
                  {step.title}
                </span>
                {step.subtitle && (
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

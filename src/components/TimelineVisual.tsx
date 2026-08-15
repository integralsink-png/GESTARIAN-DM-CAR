import React from 'react';
import { ArrowDown, Mail, MessageCircle } from 'lucide-react';

export type TimelineColor = 'emerald' | 'amber' | 'yellow' | 'yellow_glow' | 'blue' | 'slate' | 'red';

export interface TimelineStep {
  id: string;
  title: string;
  subtitle?: string; // Para mostrar ej. "FACTURA ENVIADA"
  showCommunicationIcons?: boolean; // Para mostrar iconos de Email y WA
  color: TimelineColor;
  date?: string;
  action?: {
    onClick: () => void;
  };
}

interface TimelineVisualProps {
  steps: TimelineStep[];
}

export function TimelineVisual({ steps }: TimelineVisualProps) {
  return (
    <div className="w-full flex flex-col items-center gap-2 py-4">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        // Asignar colores según la prop
        let bgClass = 'bg-slate-700/50 border-slate-600 text-slate-300';
        if (step.color === 'emerald') {
          bgClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
        } else if (step.color === 'amber') {
          bgClass = 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
        } else if (step.color === 'blue') {
          bgClass = 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]';
        } else if (step.color === 'yellow') {
          bgClass = 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300 hover:bg-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]';
        } else if (step.color === 'yellow_glow') {
          bgClass = 'bg-yellow-500/20 border-yellow-400 text-yellow-300 hover:bg-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse';
        } else if (step.color === 'red') {
          bgClass = 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]';
        } else if (step.color === 'slate') {
          bgClass = 'bg-slate-500/10 border-slate-600/30 text-slate-500';
        }

        const isInteractive = !!step.action;
        const Container = isInteractive ? 'button' : 'div';
        const containerProps = isInteractive ? { 
          onClick: step.action!.onClick,
          className: `w-full max-w-sm rounded-2xl border-2 p-4 text-center transition-all cursor-pointer active:scale-95 ${bgClass}`
        } : {
          className: `w-full max-w-sm rounded-2xl border-2 p-4 text-center transition-all ${bgClass}`
        };

        return (
          <React.Fragment key={step.id}>
            <Container {...(containerProps as any)}>
              <div className="flex flex-col items-center justify-center gap-1">
                <span className="font-bold uppercase tracking-wider" style={{ fontSize: '1.3em' }}>
                  {step.title}
                </span>
                {step.subtitle && (
                  <span className="font-bold uppercase tracking-widest opacity-90 mt-1" style={{ fontSize: '1.05em' }}>
                    {step.subtitle}
                  </span>
                )}
                {step.showCommunicationIcons && (
                  <div className="flex items-center justify-center gap-3 mt-2 text-slate-400">
                    <Mail className="w-5 h-5 hover:text-white transition-colors" />
                    <MessageCircle className="w-5 h-5 hover:text-white transition-colors" />
                  </div>
                )}
                {step.date && (
                  <span className="text-xs opacity-70 mt-1">
                    {step.date}
                  </span>
                )}
              </div>
            </Container>
            
            {!isLast && (
              <div className="flex items-center justify-center py-1 text-slate-500">
                <ArrowDown className="w-6 h-6 animate-pulse" />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

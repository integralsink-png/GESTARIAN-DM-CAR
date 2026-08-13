import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, PlayCircle, CircleDashed } from 'lucide-react';

export type TimelineStatus = 'completed' | 'active' | 'pending' | 'future';

export interface TimelineStep {
  id: string;
  title: string;
  status: TimelineStatus;
  date?: string;
}

interface TimelineVisualProps {
  steps: TimelineStep[];
}

export function TimelineVisual({ steps }: TimelineVisualProps) {
  return (
    <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4 p-4 bg-slate-800/50 rounded-2xl border border-white/5">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        
        let bgColor = 'bg-slate-700';
        let textColor = 'text-slate-400';
        let Icon = CircleDashed;
        
        if (step.status === 'completed') {
          bgColor = 'bg-emerald-500';
          textColor = 'text-emerald-500';
          Icon = Check;
        } else if (step.status === 'active') {
          bgColor = 'bg-blue-500 text-white';
          textColor = 'text-blue-400';
          Icon = PlayCircle;
        } else if (step.status === 'pending') {
          bgColor = 'bg-amber-500 text-white';
          textColor = 'text-amber-500';
          Icon = Clock;
        }

        return (
          <React.Fragment key={step.id}>
            <div className="flex md:flex-col items-center gap-3 md:gap-2 relative z-10 w-full md:w-auto">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bgColor} ${step.status === 'completed' ? 'text-white' : ''} shadow-lg transition-colors`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex flex-col md:items-center md:text-center">
                <span className={`font-bold text-sm uppercase tracking-wider ${textColor}`}>
                  {step.title}
                </span>
                {step.date && <span className="text-xs text-slate-400">{step.date}</span>}
              </div>
            </div>
            
            {!isLast && (
              <div className="hidden md:block flex-1 h-1 bg-slate-700/50 rounded-full mx-2 overflow-hidden relative self-start mt-5">
                {step.status === 'completed' && (
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: '100%' }} 
                    className="absolute top-0 left-0 h-full bg-emerald-500" 
                  />
                )}
                {step.status === 'active' && (
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: '50%' }} 
                    className="absolute top-0 left-0 h-full bg-blue-500" 
                  />
                )}
              </div>
            )}
            {!isLast && (
              <div className="block md:hidden w-1 h-6 bg-slate-700/50 rounded-full ml-4 my-1 relative overflow-hidden">
                 {step.status === 'completed' && (
                   <div className="absolute top-0 left-0 w-full h-full bg-emerald-500" />
                 )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

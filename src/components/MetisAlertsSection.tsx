// src/components/MetisAlertsSection.tsx
import React from 'react';
import { FileText, TrendingUp, Users } from 'lucide-react';

interface MetisAlertsSectionProps {
  mostrarAvisos: boolean;
  totalAvisos: number;
  touchSelectable: boolean;
  presupuestosPendientes: number;
  facturasPendienteCobro: number;
  totalClientes: number;
  navigate: (path: string) => void;
}

export const MetisAlertsSection: React.FC<MetisAlertsSectionProps> = ({
  mostrarAvisos,
  totalAvisos,
  touchSelectable,
  presupuestosPendientes,
  facturasPendienteCobro,
  totalClientes,
  navigate,
}) => {
  return (
    <div className="px-2 sm:px-4">
      <div 
        className={`grid transition-all duration-500 ease-in-out overflow-hidden ${
          mostrarAvisos ? 'grid-rows-[1fr] opacity-100 mb-6' : 'grid-rows-[0fr] opacity-0 mb-0'
        }`}
      >
        <div className="overflow-hidden">
          <div 
            className="backdrop-blur-md rounded-2xl p-4 border border-emerald-500/60 border-[2px] space-y-3 shadow-[0_0_25px_rgba(0,0,0,0.4)] transition-colors duration-500 ease-in-out" 
            style={{ backgroundColor: 'rgba(6, 78, 59, 0.5)' }} // Opacidad 0.5 Verde Bosque Oscuro
          >
            <div className="flex items-center justify-center pb-2 border-b border-white/10">
              <h3 className="text-sm font-semibold text-emerald-100 tracking-wide">Avisos y Notificaciones</h3>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <span className="text-sm font-bold tracking-widest text-[#84cc16] drop-shadow-[0_0_10px_rgba(132,204,22,0.8)]">METIS</span>
              <div className={`px-3 py-1 rounded-xl text-xs font-bold border border-[2px] flex items-center gap-1.5 ${
                totalAvisos > 0 ? 'bg-amber-950/70 text-amber-200 border-amber-500/70' : 'bg-emerald-950/70 text-emerald-300 border-emerald-500/70'
              }`}>
                <span>{totalAvisos}</span>
                <span>Pendientes</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Presupuestos Pendientes: Ámbar / Naranja Oscuro (Opacidad 0.5) */}
              <div className={!touchSelectable ? 'opacity-50 pointer-events-none' : ''}>
                <AlertCard
                  icon={<FileText className="w-4 h-4" />}
                  label="Presupuestos pendientes"
                  count={presupuestosPendientes}
                  color="text-amber-300"
                  bg="rgba(180, 83, 9, 0.5)"
                  border="border-amber-500/60 border-[2px]"
                  onClick={() => navigate('/presupuestos')}
                />
              </div>

              {/* Facturas sin cobrar (Prioridad alta): Rojo Burdeos Oscuro (Opacidad 0.5) */}
              <div className={!touchSelectable ? 'opacity-50 pointer-events-none' : ''}>
                <AlertCard
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="Facturas sin cobrar (Prioridad)"
                  count={facturasPendienteCobro}
                  color="text-rose-300"
                  bg="rgba(159, 18, 57, 0.5)"
                  border="border-rose-500/60 border-[2px]"
                  onClick={() => navigate('/facturas')}
                />
              </div>

              {/* Total Clientes: Azul Cian Oscuro (Opacidad 0.5) */}
              <div className={!touchSelectable ? 'opacity-50 pointer-events-none' : ''}>
                <AlertCard
                  icon={<Users className="w-4 h-4" />}
                  label="Total clientes"
                  count={totalClientes}
                  color="text-cyan-300"
                  bg="rgba(8, 145, 178, 0.5)"
                  border="border-cyan-500/60 border-[2px]"
                  onClick={() => navigate('/clientes')}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function AlertCard({
  icon, label, count, color, bg, border, onClick
}: {
  icon: React.ReactNode; label: string; count: number
  color: string; bg: string; border: string; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-3 flex items-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 w-full text-left ${border} backdrop-blur-md`}
      style={{ backgroundColor: bg }}
    >
      <span className={`${color} flex-shrink-0 drop-shadow-[0_0_8px_currentColor]`} suppressHydrationWarning>{icon}</span>
      <span className="flex-1 text-sm text-white/90 font-medium">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${color}`}>{count}</span>
    </button>
  );
}

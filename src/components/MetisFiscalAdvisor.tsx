import { Calculator, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react'

interface MetisFiscalAdvisorProps {
  beneficioAnual: number;
  tipoEmpresa: 'autonomo' | 'sociedad_limitada' | null;
}

function calcularIRPF(base: number): number {
  let tax = 0;
  let remaining = base;

  if (remaining > 300000) {
    tax += (remaining - 300000) * 0.47;
    remaining = 300000;
  }
  if (remaining > 60000) {
    tax += (remaining - 60000) * 0.45;
    remaining = 60000;
  }
  if (remaining > 35200) {
    tax += (remaining - 35200) * 0.37;
    remaining = 35200;
  }
  if (remaining > 20200) {
    tax += (remaining - 20200) * 0.30;
    remaining = 20200;
  }
  if (remaining > 12450) {
    tax += (remaining - 12450) * 0.24;
    remaining = 12450;
  }
  if (remaining > 0) {
    tax += remaining * 0.19;
  }
  return tax;
}

export function MetisFiscalAdvisor({ beneficioAnual, tipoEmpresa }: MetisFiscalAdvisorProps) {
  if (tipoEmpresa !== 'autonomo' || beneficioAnual <= 0) {
    return null;
  }

  // Estimaciones
  const cuotaAutonomoEstimada = 3600; // ~300€/mes
  const baseIRPF = Math.max(0, beneficioAnual - cuotaAutonomoEstimada);
  const irpfEstimado = calcularIRPF(baseIRPF);
  const totalImpuestosAutonomo = irpfEstimado + cuotaAutonomoEstimada;

  const cuotaAutonomoSocietario = 4500; // ~375€/mes
  const isEstimado = beneficioAnual * 0.25; // 25% Impuesto Sociedades
  const totalImpuestosSL = isEstimado + cuotaAutonomoSocietario;

  const diferencia = totalImpuestosAutonomo - totalImpuestosSL;
  
  // Lógica de avisos
  // Umbral donde suele empezar a compensar (aprox. 40k-50k de beneficio)
  const isRentableSL = diferencia > 0 && beneficioAnual > 45000;
  const isAcercandose = beneficioAnual >= 35000 && beneficioAnual <= 45000;

  if (!isRentableSL && !isAcercandose) {
    return null; // Aún no es relevante
  }

  return (
    <div className={`mt-6 p-5 rounded-xl border relative overflow-hidden ${
      isRentableSL 
        ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30' 
        : 'bg-amber-500/10 border-amber-500/30'
    }`}>
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Sparkles className="w-24 h-24" />
      </div>
      
      <div className="flex items-start gap-4 relative z-10">
        <div className={`p-3 rounded-lg ${isRentableSL ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {isRentableSL ? <TrendingUp className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white">METIS Insight Fiscal</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
              isRentableSL ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'
            }`}>
              {isRentableSL ? 'Recomendación Estratégica' : 'Aviso Preventivo'}
            </span>
          </div>
          
          <p className="text-white/80 text-sm mb-4">
            {isRentableSL 
              ? `Según tus beneficios actuales (${beneficioAnual.toLocaleString('es-ES')} €), te saldría más rentable constituir una Sociedad Limitada (S.L.). Podrías ahorrar aproximadamente ${diferencia.toLocaleString('es-ES', { maximumFractionDigits: 0 })} € anuales en impuestos.`
              : `Tus beneficios netos (${beneficioAnual.toLocaleString('es-ES')} €) se están acercando al umbral donde compensa fiscalmente crear una Sociedad Limitada (S.L.). Te recomendamos empezar a evaluar esta transición.`
            }
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-bg-900/50 p-3 rounded-lg border border-bg-700/50">
              <h4 className="text-xs text-white/50 mb-2 font-medium">ESCENARIO ACTUAL (AUTÓNOMO)</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">IRPF Estimado</span>
                  <span className="text-red-400">{irpfEstimado.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Cuota RETA</span>
                  <span className="text-red-400">{cuotaAutonomoEstimada.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="border-t border-bg-700/50 mt-2 pt-2 flex justify-between font-bold">
                  <span className="text-white">Total Carga Fiscal</span>
                  <span className="text-red-500">{totalImpuestosAutonomo.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
              </div>
            </div>

            <div className="bg-bg-900/50 p-3 rounded-lg border border-bg-700/50">
              <h4 className="text-xs text-white/50 mb-2 font-medium">ESCENARIO S.L.</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Impuesto Sociedades (25%)</span>
                  <span className="text-blue-400">{isEstimado.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Cuota Societario</span>
                  <span className="text-blue-400">{cuotaAutonomoSocietario.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
                <div className="border-t border-bg-700/50 mt-2 pt-2 flex justify-between font-bold">
                  <span className="text-white">Total Carga Fiscal</span>
                  <span className="text-blue-400">{totalImpuestosSL.toLocaleString('es-ES', { maximumFractionDigits: 0 })} €</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-white/40 mt-4 flex items-center gap-1.5">
            <Calculator className="w-3 h-3" />
            Cálculos puramente estimativos basados en tramos generales de IRPF y un 25% de IS. Consulta siempre con tu asesor.
          </p>
        </div>
      </div>
    </div>
  )
}

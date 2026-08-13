import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PageHeader, Card, ActionMenu, TimelineVisual } from '../components/UI';
import { ArrowLeft, User, Car } from 'lucide-react';
import type { Vehiculo, Cliente, Presupuesto, Cita, Reparacion, Factura } from '../lib/types';
import type { TimelineStep } from '../components/TimelineVisual';
import { useToast } from '../lib/ToastContext';

export function ExpedientePage() {
  const { vehiculoId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [vehiculo, setVehiculo] = useState<Vehiculo | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [presupuesto, setPresupuesto] = useState<Presupuesto | null>(null);
  const [cita, setCita] = useState<Cita | null>(null);
  const [reparacion, setReparacion] = useState<Reparacion | null>(null);
  const [factura, setFactura] = useState<Factura | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExpediente() {
      if (!vehiculoId) return;
      try {
        const { data: vData } = await supabase.from('vehiculos').select('*').eq('id', vehiculoId).single();
        if (vData) {
          setVehiculo(vData);
          const { data: cData } = await supabase.from('clientes').select('*').eq('id', vData.cliente_id).single();
          setCliente(cData);
        }

        // Get latest active items
        const { data: pData } = await supabase.from('presupuestos').select('*').eq('vehiculo_id', vehiculoId).order('created_at', { ascending: false }).limit(1).maybeSingle();
        setPresupuesto(pData);

        const { data: ciData } = await supabase.from('citas').select('*').eq('vehiculo_id', vehiculoId).order('created_at', { ascending: false }).limit(1).maybeSingle();
        setCita(ciData);

        const { data: rData } = await supabase.from('reparaciones').select('*').eq('vehiculo_id', vehiculoId).order('created_at', { ascending: false }).limit(1).maybeSingle();
        setReparacion(rData);

        const { data: fData } = await supabase.from('facturas').select('*').eq('vehiculo_id', vehiculoId).order('created_at', { ascending: false }).limit(1).maybeSingle();
        setFactura(fData);

      } catch (e) {
        console.error(e);
        showToast("Error cargando expediente", "error");
      } finally {
        setLoading(false);
      }
    }
    loadExpediente();
  }, [vehiculoId, showToast]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Cargando expediente...</div>;
  }

  if (!vehiculo || !cliente) {
    return <div className="p-8 text-center text-rose-400">Expediente no encontrado.</div>;
  }

  // Calculate timeline steps
  const steps: TimelineStep[] = [
    { id: 'recepcion', title: 'Recepci\u00F3n', status: 'completed' }
  ];

  if (presupuesto) {
    if (presupuesto.estado === 'aceptado') steps.push({ id: 'presupuesto', title: 'Presupuesto', status: 'completed' });
    else steps.push({ id: 'presupuesto', title: 'Presupuesto', status: 'pending' });
  } else {
    steps.push({ id: 'presupuesto', title: 'Presupuesto', status: 'future' });
  }

  if (cita) {
    if (cita.estado === 'completada' || cita.estado === 'confirmada') steps.push({ id: 'cita', title: 'Cita', status: 'completed' });
    else steps.push({ id: 'cita', title: 'Cita', status: 'pending' });
  } else {
    steps.push({ id: 'cita', title: 'Cita', status: 'future' });
  }

  if (reparacion) {
    if (reparacion.estado === 'finalizado') steps.push({ id: 'reparacion', title: 'Reparaci\u00F3n', status: 'completed' });
    else steps.push({ id: 'reparacion', title: 'Reparaci\u00F3n', status: 'active' });
  } else {
    steps.push({ id: 'reparacion', title: 'Reparaci\u00F3n', status: 'future' });
  }

  if (factura) {
    if (factura.estado_cobro === 'pagada') steps.push({ id: 'factura', title: 'Factura', status: 'completed' });
    else steps.push({ id: 'factura', title: 'Factura', status: 'pending' });
  } else {
    steps.push({ id: 'factura', title: 'Factura', status: 'future' });
  }

  if (factura && factura.estado_cobro === 'pagada') {
    steps.push({ id: 'cobro', title: 'Cobro', status: 'completed' });
  } else if (factura && (factura.estado_cobro === 'pendiente' || factura.estado_cobro === 'parcial')) {
    steps.push({ id: 'cobro', title: 'Cobro', status: 'active' });
  } else {
    steps.push({ id: 'cobro', title: 'Cobro', status: 'future' });
  }

  // Determine available actions based on current state
  const actions = [];
  
  if (!presupuesto) {
    actions.push({
      label: 'Crear Presupuesto',
      onClick: () => navigate('/presupuestos', { state: { vehiculoId, clienteId: cliente.id } })
    });
  } else if (presupuesto.estado === 'pendiente') {
    actions.push({
      label: 'Ver Presupuesto',
      onClick: () => navigate('/presupuestos', { state: { vehiculoId, clienteId: cliente.id } })
    });
  } else if (presupuesto.estado === 'aceptado' && !cita) {
    actions.push({
      label: 'Crear Cita',
      onClick: () => navigate('/citas', { state: { vehiculoId, clienteId: cliente.id, presupuestoId: presupuesto.id } })
    });
  } else if (cita && (cita.estado === 'confirmada' || cita.estado === 'pendiente') && !reparacion) {
    actions.push({
      label: 'Abrir Reparaci\u00F3n',
      onClick: () => navigate('/reparaciones', { state: { vehiculoId, clienteId: cliente.id } })
    });
  }
  
  if (reparacion && reparacion.estado === 'en_proceso') {
    actions.push({
      label: 'Gestionar Reparaci\u00F3n',
      onClick: () => navigate('/reparaciones', { state: { vehiculoId, clienteId: cliente.id } })
    });
  } else if (reparacion && reparacion.estado === 'finalizado' && !factura) {
    actions.push({
      label: 'Generar Factura',
      variant: 'success' as const,
      onClick: () => navigate('/facturas', { state: { vehiculoId, clienteId: cliente.id, reparacionId: reparacion.id } })
    });
  }

  if (factura) {
    actions.push({
      label: 'Ver Factura',
      onClick: () => navigate('/facturas', { state: { vehiculoId, clienteId: cliente.id } })
    });
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-24">
      <PageHeader title="EXPEDIENTE">
        <button
          onClick={() => navigate(-1)}
          className="w-[60px] h-[60px] rounded-2xl bg-slate-800/80 text-white border border-white/20 flex items-center justify-center hover:bg-slate-700 transition-transform active:scale-95 shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
          title="Volver"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>
      </PageHeader>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{vehiculo.marca} {vehiculo.modelo}</h2>
          <div className="flex flex-wrap items-center gap-2 text-slate-400 mt-1">
            <Car className="w-4 h-4" />
            <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-sm text-white border border-slate-700">{vehiculo.matricula}</span>
            <span className="mx-1">•</span>
            <User className="w-4 h-4" />
            <span>{cliente.nombre}</span>
          </div>
        </div>
        
        {actions.length > 0 && (
          <ActionMenu actions={actions} triggerLabel="ACCIONES DISPONIBLES ▼" />
        )}
      </div>

      <div className="mt-2 mb-4 w-full overflow-x-hidden">
        <TimelineVisual steps={steps} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><User className="w-5 h-5 text-emerald-400"/> Datos del Cliente</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-slate-400">Nombre:</span> 
              <span className="font-medium text-white">{cliente.nombre}</span>
            </div>
            {cliente.telefono && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Tel\u00E9fono:</span> 
                <span className="font-medium text-white">{cliente.telefono}</span>
              </div>
            )}
            {cliente.email && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Email:</span> 
                <span className="font-medium text-white">{cliente.email}</span>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Car className="w-5 h-5 text-blue-400"/> Datos del Veh\u00EDculo</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-slate-400">Matr\u00EDcula:</span> 
              <span className="font-mono font-medium text-white bg-slate-800 px-2 rounded">{vehiculo.matricula}</span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-slate-400">Marca/Modelo:</span> 
              <span className="font-medium text-white">{vehiculo.marca} {vehiculo.modelo}</span>
            </div>
            {vehiculo.vin && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">VIN:</span> 
                <span className="font-mono font-medium text-white">{vehiculo.vin}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

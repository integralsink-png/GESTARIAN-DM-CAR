import { create } from 'zustand';

export type EstadoReparacion = 'PENDIENTE' | 'EN_CURSO' | 'ESPERA_PIEZAS' | 'FINALIZADO';

export interface Reparacion {
  id: string;
  expediente_numero: string;
  cliente_nombre: string;
  vehiculo: string;
  mecanico: string;
  descripcion: string;
  horas_estimadas: number;
  horas_reales: number;
  estado: EstadoReparacion;
  progreso_porcentaje: number;
}

interface ReparacionesState {
  reparaciones: Reparacion[];
  filterEstado: string;
  setFilterEstado: (estado: string) => void;
  updateEstadoReparacion: (id: string, nuevoEstado: EstadoReparacion) => void;
}

const MOCK_REPARACIONES: Reparacion[] = [
  {
    id: 'rep_1',
    expediente_numero: 'EXP-26001',
    cliente_nombre: 'García López, Juan Antonio',
    vehiculo: 'BMW X5 (1234-BBB)',
    mecanico: 'Miguel Ángel',
    descripcion: 'Cambio de discos y pastillas de freno delanteras.',
    horas_estimadas: 2.5,
    horas_reales: 1.5,
    estado: 'EN_CURSO',
    progreso_porcentaje: 65,
  },
  {
    id: 'rep_2',
    expediente_numero: 'EXP-26002',
    cliente_nombre: 'Martínez Ruiz, María del Carmen',
    vehiculo: 'Audi A4 (9876-LKN)',
    mecanico: 'Juan José',
    descripcion: 'Desmontaje de caja de cambios.',
    horas_estimadas: 5.0,
    horas_reales: 0.5,
    estado: 'PENDIENTE',
    progreso_porcentaje: 15,
  },
  {
    id: 'rep_3',
    expediente_numero: 'EXP-26003',
    cliente_nombre: 'Fernández Gómez, Carlos',
    vehiculo: 'Seat León (9101-DDD)',
    mecanico: 'Carlos',
    descripcion: 'Mantenimiento preventivo.',
    horas_estimadas: 1.0,
    horas_reales: 1.0,
    estado: 'FINALIZADO',
    progreso_porcentaje: 100,
  }
];

export const useReparacionesStore = create<ReparacionesState>((set) => ({
  reparaciones: MOCK_REPARACIONES,
  filterEstado: 'TODOS',
  setFilterEstado: (estado) => set({ filterEstado: estado }),
  updateEstadoReparacion: (id, nuevoEstado) => set((state) => ({
    reparaciones: state.reparaciones.map((r) => r.id === id ? { ...r, estado: nuevoEstado } : r)
  }))
}));

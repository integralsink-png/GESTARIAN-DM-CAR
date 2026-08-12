import { create } from 'zustand';

export type EstadoCita = 'PENDIENTE' | 'CONFIRMADA' | 'COMPLETADA' | 'CANCELADA';

export interface Cita {
  id: string;
  cliente_nombre: string;
  cliente_telefono: string;
  objeto_titulo: string; // ej: "Audi A4 - Mantenimiento"
  fecha_hora: string;
  estado: EstadoCita;
  notas?: string;
}

interface CitasState {
  citas: Cita[];
  filterEstado: EstadoCita | 'TODAS';
  setFilterEstado: (estado: EstadoCita | 'TODAS') => void;
  addCita: (cita: Omit<Cita, 'id'>) => void;
}

const MOCK_CITAS: Cita[] = [
  {
    id: 'cit_1',
    cliente_nombre: 'Juan Sánchez García',
    cliente_telefono: '+34 600 123 456',
    objeto_titulo: 'BMW X5 (1234-BBB) - Revisión 50.000km',
    fecha_hora: new Date(Date.now() + 3600000 * 3).toISOString(), // En 3 horas
    estado: 'CONFIRMADA',
    notas: 'Cliente solicita coche de sustitución si es posible.',
  },
  {
    id: 'cit_2',
    cliente_nombre: 'María López',
    cliente_telefono: '+34 699 987 654',
    objeto_titulo: 'Audi A4 (9876-LKN) - Ruido en suspensión delantera',
    fecha_hora: new Date(Date.now() + 86400000).toISOString(), // Mañana
    estado: 'PENDIENTE',
    notas: 'Llamar antes para confirmar horario exacto.',
  },
  {
    id: 'cit_3',
    cliente_nombre: 'Pedro Ramírez',
    cliente_telefono: '+34 612 345 678',
    objeto_titulo: 'Ford Focus (3321-GTR) - Carga de aire acondicionado',
    fecha_hora: new Date(Date.now() - 86400000 * 2).toISOString(), // Hace 2 días
    estado: 'COMPLETADA',
    notas: 'Trabajo finalizado e integrado en expediente EXP-26004.',
  }
];

export const useCitasStore = create<CitasState>((set) => ({
  citas: MOCK_CITAS,
  filterEstado: 'TODAS',
  setFilterEstado: (estado) => set({ filterEstado: estado }),
  addCita: (data) => {
    const newCita: Cita = { ...data, id: `cit_${Date.now()}` };
    set((state) => ({ citas: [newCita, ...state.citas] }));
  }
}));

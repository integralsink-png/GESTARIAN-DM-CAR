import { create } from 'zustand';

export type EstadoExpediente = 'RECEPCION' | 'EN_PROCESO' | 'PRESUPUESTADO' | 'PENDIENTE_PAGO' | 'FINALIZADO';

export interface Expediente {
  id: string;
  organizacion_id: string;
  numero: string;
  cliente_id: string;
  cliente_nombre: string;
  cliente_telefono?: string;
  objeto_titulo: string; // Ej: "BMW Serie 3 - 4821-KMY" o "Reparación General"
  estado: EstadoExpediente;
  fecha_apertura: string;
  total_presupuesto?: number;
  total_facturado?: number;
  fotos_count: number;
  incidencias_count: number;
}

interface ExpedientesState {
  expedientes: Expediente[];
  isLoading: boolean;
  filterEstado: EstadoExpediente | 'TODOS';
  searchQuery: string;

  setFilterEstado: (estado: EstadoExpediente | 'TODOS') => void;
  setSearchQuery: (query: string) => void;
  addExpediente: (expediente: Omit<Expediente, 'id' | 'numero' | 'fecha_apertura'>) => void;
}

const MOCK_EXPEDIENTES: Expediente[] = [
  {
    id: 'exp_1',
    organizacion_id: 'org_1',
    numero: 'EXP-26001',
    cliente_id: 'cli_1',
    cliente_nombre: 'Juan Sánchez García',
    cliente_telefono: '+34 600 123 456',
    objeto_titulo: 'BMW X5 (1234-BBB) - Cambio de Aceite y Frenos',
    estado: 'EN_PROCESO',
    fecha_apertura: new Date(Date.now() - 86400000 * 2).toISOString(),
    total_presupuesto: 480.00,
    fotos_count: 5,
    incidencias_count: 1,
  },
  {
    id: 'exp_2',
    organizacion_id: 'org_1',
    numero: 'EXP-26002',
    cliente_id: 'cli_2',
    cliente_nombre: 'María López',
    cliente_telefono: '+34 699 987 654',
    objeto_titulo: 'Audi A4 (9876-LKN) - Sustitución de Embrague',
    estado: 'RECEPCION',
    fecha_apertura: new Date(Date.now() - 86400000 * 5).toISOString(),
    total_presupuesto: 920.50,
    fotos_count: 2,
    incidencias_count: 0,
  },
  {
    id: 'exp_3',
    organizacion_id: 'org_1',
    numero: 'EXP-26003',
    cliente_id: 'cli_1',
    cliente_nombre: 'Juan Sánchez García',
    cliente_telefono: '+34 600 123 456',
    objeto_titulo: 'Seat Ibiza (5544-HJK) - Revisión Pre-ITV',
    estado: 'PENDIENTE_PAGO',
    fecha_apertura: new Date(Date.now() - 86400000 * 10).toISOString(),
    total_presupuesto: 150.00,
    total_facturado: 150.00,
    fotos_count: 3,
    incidencias_count: 0,
  },
  {
    id: 'exp_4',
    organizacion_id: 'org_1',
    numero: 'EXP-26004',
    cliente_id: 'cli_3',
    cliente_nombre: 'Carlos Rodríguez',
    cliente_telefono: '+34 611 222 333',
    objeto_titulo: 'Mercedes C200 (7711-MNP) - Reparación Aire Acondicionado',
    estado: 'FINALIZADO',
    fecha_apertura: new Date(Date.now() - 86400000 * 20).toISOString(),
    total_presupuesto: 310.00,
    total_facturado: 310.00,
    fotos_count: 8,
    incidencias_count: 0,
  }
];

export const useExpedientesStore = create<ExpedientesState>((set) => ({
  expedientes: MOCK_EXPEDIENTES,
  isLoading: false,
  filterEstado: 'TODOS',
  searchQuery: '',

  setFilterEstado: (estado) => set({ filterEstado: estado }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addExpediente: (data) => {
    const nextSeq = Math.floor(Math.random() * 900) + 100;
    const newExp: Expediente = {
      ...data,
      id: `exp_${Date.now()}`,
      numero: `EXP-26${nextSeq}`,
      fecha_apertura: new Date().toISOString(),
    };
    set((state) => ({ expedientes: [newExp, ...state.expedientes] }));
  }
}));

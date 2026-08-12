import { create } from 'zustand';

export interface Factura {
  id: string;
  numero: string; // ej: F2600001
  cliente_nombre: string;
  fecha_emision: string;
  total_base: number;
  total_iva: number;
  total: number;
  pagada: boolean;
  metodo_pago?: string;
}

interface FacturasState {
  facturas: Factura[];
  filterPagada: 'TODAS' | 'PAGADAS' | 'PENDIENTES';
  setFilterPagada: (val: 'TODAS' | 'PAGADAS' | 'PENDIENTES') => void;
}

const MOCK_FACTURAS: Factura[] = [
  {
    id: 'fac_1',
    numero: 'F2600001',
    cliente_nombre: 'Carlos Rodríguez',
    fecha_emision: new Date(Date.now() - 86400000 * 15).toISOString(),
    total_base: 256.20,
    total_iva: 53.80,
    total: 310.00,
    pagada: true,
    metodo_pago: 'Tarjeta de Crédito',
  },
  {
    id: 'fac_2',
    numero: 'F2600002',
    cliente_nombre: 'Juan Sánchez García',
    fecha_emision: new Date(Date.now() - 86400000 * 3).toISOString(),
    total_base: 123.97,
    total_iva: 26.03,
    total: 150.00,
    pagada: false,
  }
];

export const useFacturasStore = create<FacturasState>((set) => ({
  facturas: MOCK_FACTURAS,
  filterPagada: 'TODAS',
  setFilterPagada: (val) => set({ filterPagada: val }),
}));

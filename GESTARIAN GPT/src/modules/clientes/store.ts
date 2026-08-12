import { create } from 'zustand';

export interface Cliente {
  id: string;
  organizacion_id: string;
  nombre: string;
  dni: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  cp: string | null;
  localidad: string | null;
  created_at: string;
}

interface ClientesState {
  clientes: Cliente[];
  isLoading: boolean;
  searchQuery: string;
  
  // Acciones
  setSearchQuery: (query: string) => void;
  fetchClientes: (organizacion_id: string) => Promise<void>;
  addCliente: (cliente: Omit<Cliente, 'id' | 'created_at'>) => Promise<void>;
}

// Datos mockeados iniciales
const MOCK_CLIENTES: Cliente[] = [
  {
    id: 'cli_1',
    organizacion_id: 'org_1',
    nombre: 'Juan Sánchez García',
    dni: '12345678A',
    telefono: '+34 600 123 456',
    email: 'juan@example.com',
    direccion: 'Calle Falsa 123',
    cp: '28001',
    localidad: 'Madrid',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cli_2',
    organizacion_id: 'org_1',
    nombre: 'María López',
    dni: '87654321B',
    telefono: '+34 699 987 654',
    email: null,
    direccion: null,
    cp: null,
    localidad: null,
    created_at: new Date().toISOString(),
  }
];

export const useClientesStore = create<ClientesState>((set, get) => ({
  clientes: MOCK_CLIENTES,
  isLoading: false,
  searchQuery: '',

  setSearchQuery: (query) => set({ searchQuery: query }),

  fetchClientes: async (organizacion_id) => {
    set({ isLoading: true });
    // TODO: Conectar a Supabase real cuando la DB esté lista
    // const { data } = await supabase.from('clientes').select('*').eq('organizacion_id', organizacion_id);
    
    // Simular latencia de red
    setTimeout(() => {
      set({ 
        clientes: MOCK_CLIENTES.filter(c => c.organizacion_id === organizacion_id),
        isLoading: false 
      });
    }, 500);
  },

  addCliente: async (clienteData) => {
    const newCliente: Cliente = {
      ...clienteData,
      id: `cli_${Math.random().toString(36).substring(2, 9)}`,
      created_at: new Date().toISOString(),
    };
    
    set((state) => ({
      clientes: [newCliente, ...state.clientes]
    }));
  }
}));

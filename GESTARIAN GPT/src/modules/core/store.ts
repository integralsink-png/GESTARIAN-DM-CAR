import { create } from 'zustand';

interface CoreState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  
  notificationsActive: boolean;
  toggleNotifications: () => void;
  
  // Datos simulados de la organización actual
  currentOrganization: {
    id: string;
    name: string;
  } | null;
  setCurrentOrganization: (org: any) => void;
}

export const useCoreStore = create<CoreState>((set) => ({
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
  
  notificationsActive: false,
  toggleNotifications: () => set((state) => ({ notificationsActive: !state.notificationsActive })),
  
  currentOrganization: {
    id: 'org_1',
    name: 'Taller Miguel',
  },
  setCurrentOrganization: (org) => set({ currentOrganization: org }),
}));

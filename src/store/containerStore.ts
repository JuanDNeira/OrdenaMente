import { create } from 'zustand';
import { ContainerRepository } from '../database/repositories/ContainerRepository';
import type { Container, CreateContainerInput, UpdateContainerInput } from '../types/Container';

interface ContainerState {
  containers: Container[];
  selectedContainer: Container | null;
  isLoading: boolean;
  error: string | null;

  loadContainers: () => Promise<void>;
  loadContainerById: (id: string) => Promise<void>;
  createContainer: (data: CreateContainerInput) => Promise<Container>;
  updateContainer: (id: string, data: UpdateContainerInput) => Promise<void>;
  deleteContainer: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  selectContainer: (container: Container | null) => void;
  clearError: () => void;
}

export const useContainerStore = create<ContainerState>((set) => ({
  containers: [],
  selectedContainer: null,
  isLoading: false,
  error: null,

  loadContainers: async () => {
    set({ isLoading: true, error: null });
    try {
      const containers = await ContainerRepository.findRoots();
      set({ containers, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al cargar contenedores', isLoading: false });
    }
  },

  loadContainerById: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const container = await ContainerRepository.findById(id);
      set({ selectedContainer: container, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al cargar contenedor', isLoading: false });
    }
  },

  createContainer: async (data: CreateContainerInput) => {
    set({ isLoading: true, error: null });
    try {
      const container = await ContainerRepository.create(data);
      set((state) => ({ containers: [container, ...state.containers], isLoading: false }));
      return container;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al crear contenedor', isLoading: false });
      throw err;
    }
  },

  updateContainer: async (id: string, data: UpdateContainerInput) => {
    set({ error: null });
    try {
      await ContainerRepository.update(id, data);
      const updated = await ContainerRepository.findById(id);
      if (updated) {
        set((state) => ({
          containers: state.containers.map((c) => (c.id === id ? updated : c)),
          selectedContainer: state.selectedContainer?.id === id ? updated : state.selectedContainer,
        }));
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al actualizar contenedor' });
      throw err;
    }
  },

  toggleFavorite: async (id: string) => {
    try {
      await ContainerRepository.toggleFavorite(id);
      const updated = await ContainerRepository.findById(id);
      if (updated) {
        set((state) => ({
          containers: state.containers.map((c) => (c.id === id ? updated : c)),
          selectedContainer: state.selectedContainer?.id === id ? updated : state.selectedContainer,
        }));
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al actualizar favorito' });
    }
  },

  deleteContainer: async (id: string) => {
    set({ error: null });
    try {
      await ContainerRepository.delete(id);
      set((state) => ({
        containers: state.containers.filter((c) => c.id !== id),
        selectedContainer: state.selectedContainer?.id === id ? null : state.selectedContainer,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al eliminar contenedor' });
      throw err;
    }
  },

  selectContainer: (container) => set({ selectedContainer: container }),
  clearError: () => set({ error: null }),
}));

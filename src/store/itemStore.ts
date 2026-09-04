import { create } from 'zustand';
import { ItemRepository } from '../database/repositories/ItemRepository';
import type { Item, CreateItemInput, UpdateItemInput } from '../types/Item';

interface ItemState {
  // Items por contenedor — cacheados por containerId
  itemsByContainer: Record<string, Item[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadItemsByContainer: (containerId: string) => Promise<void>;
  createItem: (data: CreateItemInput) => Promise<Item>;
  updateItem: (id: string, containerId: string, data: UpdateItemInput) => Promise<void>;
  deleteItem: (id: string, containerId: string) => Promise<void>;
  moveItem: (id: string, fromContainerId: string, toContainerId: string) => Promise<void>;
  toggleFavorite: (id: string, containerId: string) => Promise<void>;
  clearError: () => void;
}

export const useItemStore = create<ItemState>((set, get) => ({
  itemsByContainer: {},
  isLoading: false,
  error: null,

  loadItemsByContainer: async (containerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const items = await ItemRepository.findByContainerId(containerId);
      set((state) => ({
        itemsByContainer: { ...state.itemsByContainer, [containerId]: items },
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar ítems',
        isLoading: false,
      });
    }
  },

  createItem: async (data: CreateItemInput) => {
    set({ error: null });
    try {
      const item = await ItemRepository.create(data);
      set((state) => {
        const existing = state.itemsByContainer[data.container_id] ?? [];
        return {
          itemsByContainer: {
            ...state.itemsByContainer,
            [data.container_id]: [item, ...existing],
          },
        };
      });
      return item;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al crear ítem' });
      throw err;
    }
  },

  updateItem: async (id: string, containerId: string, data: UpdateItemInput) => {
    set({ error: null });
    try {
      await ItemRepository.update(id, data);
      const updated = await ItemRepository.findById(id);
      if (updated) {
        set((state) => {
          const existing = state.itemsByContainer[containerId] ?? [];
          return {
            itemsByContainer: {
              ...state.itemsByContainer,
              [containerId]: existing.map((i) => (i.id === id ? updated : i)),
            },
          };
        });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al actualizar ítem' });
      throw err;
    }
  },

  deleteItem: async (id: string, containerId: string) => {
    set({ error: null });
    try {
      await ItemRepository.delete(id);
      set((state) => {
        const existing = state.itemsByContainer[containerId] ?? [];
        return {
          itemsByContainer: {
            ...state.itemsByContainer,
            [containerId]: existing.filter((i) => i.id !== id),
          },
        };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al eliminar ítem' });
      throw err;
    }
  },

  moveItem: async (id: string, fromContainerId: string, toContainerId: string) => {
    set({ error: null });
    try {
      await ItemRepository.move(id, toContainerId);
      set((state) => {
        const fromItems = state.itemsByContainer[fromContainerId] ?? [];
        const movedItem = fromItems.find((i) => i.id === id);
        if (!movedItem) return state;

        const updatedItem: Item = { ...movedItem, container_id: toContainerId };
        const toItems = state.itemsByContainer[toContainerId] ?? [];

        return {
          itemsByContainer: {
            ...state.itemsByContainer,
            [fromContainerId]: fromItems.filter((i) => i.id !== id),
            [toContainerId]: [updatedItem, ...toItems],
          },
        };
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al mover ítem' });
      throw err;
    }
  },

  toggleFavorite: async (id: string, containerId: string) => {
    try {
      await ItemRepository.toggleFavorite(id);
      const updated = await ItemRepository.findById(id);
      if (updated) {
        set((state) => {
          const existing = state.itemsByContainer[containerId] ?? [];
          return {
            itemsByContainer: {
              ...state.itemsByContainer,
              [containerId]: existing.map((i) => (i.id === id ? updated : i)),
            },
          };
        });
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al actualizar favorito' });
    }
  },

  clearError: () => set({ error: null }),
}));

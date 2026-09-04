import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ModalType = 'createContainer' | 'createItem' | 'editContainer' | 'editItem' | 'deleteConfirm' | null;

const THEME_KEY = 'san_alejo_theme';

interface UIState {
  // Modal
  activeModal: ModalType;
  modalPayload: unknown;

  // Bottom sheet
  isBottomSheetOpen: boolean;

  // Búsqueda global
  isSearchActive: boolean;

  // Tab activo
  activeTab: string;

  // Tema
  isDarkMode: boolean;

  // Actions
  openModal: (type: ModalType, payload?: unknown) => void;
  closeModal: () => void;
  setBottomSheet: (open: boolean) => void;
  setSearchActive: (active: boolean) => void;
  setActiveTab: (tab: string) => void;
  toggleTheme: () => Promise<void>;
  loadTheme: () => Promise<void>;
}

export const useUIStore = create<UIState>((set, get) => ({
  activeModal: null,
  modalPayload: null,
  isBottomSheetOpen: false,
  isSearchActive: false,
  activeTab: 'Home',
  isDarkMode: true,

  openModal: (type, payload = null) =>
    set({ activeModal: type, modalPayload: payload }),

  closeModal: () =>
    set({ activeModal: null, modalPayload: null }),

  setBottomSheet: (open) =>
    set({ isBottomSheetOpen: open }),

  setSearchActive: (active) =>
    set({ isSearchActive: active }),

  setActiveTab: (tab) =>
    set({ activeTab: tab }),

  toggleTheme: async () => {
    const next = !get().isDarkMode;
    set({ isDarkMode: next });
    try {
      await AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {
      // silencioso
    }
  },

  loadTheme: async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved) {
        set({ isDarkMode: saved === 'dark' });
      }
    } catch {
      // silencioso
    }
  },
}));

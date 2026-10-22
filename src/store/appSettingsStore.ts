/**
 * appSettingsStore.ts
 *
 * Store Zustand para las preferencias de funciones emergentes.
 * Lee y escribe a través de AppSettingsRepository (tabla app_settings, migración v5).
 *
 * Patrones seguidos:
 *   - Consistente con uiStore.ts, containerStore.ts, etc.
 *   - loadSettings() se llama una vez al iniciar la app (desde AppProvider).
 *   - Cada setter actualiza estado local Y persiste en SQLite atómicamente.
 *   - isLoading cubre solo la carga inicial para no bloquear la UI con
 *     spinners en los toggles.
 */

import { create } from 'zustand';
import {
  AppSettingsRepository,
} from '../database/repositories/AppSettingsRepository';

// ─── Interfaz del estado ──────────────────────────────────────────────────────

interface AppSettingsState {
  // ── Computer Vision (Fase B) ───────────────────────────────────────────────
  /** La función de reconocimiento por foto está habilitada por el usuario. */
  cvEnabled: boolean;
  /** El usuario ha dado consentimiento explícito para enviar fotos al servidor. */
  cvConsentGiven: boolean;

  // ── Beacons BLE (Fase C) ───────────────────────────────────────────────────
  /** La detección de beacons BLE está habilitada por el usuario. */
  bleEnabled: boolean;
  /** El modo simulado de beacons está activo (sin hardware real). */
  bleSimulatedMode: boolean;

  // ── Carga inicial ──────────────────────────────────────────────────────────
  isLoading: boolean;
  error: string | null;

  // ── Acciones ───────────────────────────────────────────────────────────────
  /** Carga todos los ajustes desde SQLite. Llamar una vez al arrancar. */
  loadSettings: () => Promise<void>;

  /** Activa o desactiva Computer Vision. */
  setCvEnabled: (enabled: boolean) => Promise<void>;
  /** Registra o revoca el consentimiento de envío de fotos. */
  setCvConsentGiven: (given: boolean) => Promise<void>;
  /** Activa o desactiva la detección de beacons BLE. */
  setBleEnabled: (enabled: boolean) => Promise<void>;
  /** Activa o desactiva el modo simulado de beacons. */
  setBleSimulatedMode: (simulated: boolean) => Promise<void>;

  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  cvEnabled:        false,
  cvConsentGiven:   false,
  bleEnabled:       false,
  bleSimulatedMode: false,
  isLoading:        false,
  error:            null,

  loadSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const [cvEnabled, cvConsentGiven, bleEnabled, bleSimulatedMode] =
        await Promise.all([
          AppSettingsRepository.getBool('cv_enabled'),
          AppSettingsRepository.getBool('cv_consent_given'),
          AppSettingsRepository.getBool('ble_enabled'),
          AppSettingsRepository.getBool('ble_simulated_mode'),
        ]);
      set({
        cvEnabled,
        cvConsentGiven,
        bleEnabled,
        bleSimulatedMode,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar ajustes',
        isLoading: false,
      });
    }
  },

  setCvEnabled: async (enabled) => {
    set({ cvEnabled: enabled }); // optimista
    try {
      await AppSettingsRepository.setBool('cv_enabled', enabled);
    } catch (err) {
      // Revertir si falla la persistencia
      set({
        cvEnabled: !enabled,
        error: err instanceof Error ? err.message : 'Error al guardar ajuste',
      });
    }
  },

  setCvConsentGiven: async (given) => {
    set({ cvConsentGiven: given });
    try {
      await AppSettingsRepository.setBool('cv_consent_given', given);
    } catch (err) {
      set({
        cvConsentGiven: !given,
        error: err instanceof Error ? err.message : 'Error al guardar consentimiento',
      });
    }
  },

  setBleEnabled: async (enabled) => {
    set({ bleEnabled: enabled });
    try {
      await AppSettingsRepository.setBool('ble_enabled', enabled);
    } catch (err) {
      set({
        bleEnabled: !enabled,
        error: err instanceof Error ? err.message : 'Error al guardar ajuste BLE',
      });
    }
  },

  setBleSimulatedMode: async (simulated) => {
    set({ bleSimulatedMode: simulated });
    try {
      await AppSettingsRepository.setBool('ble_simulated_mode', simulated);
    } catch (err) {
      set({
        bleSimulatedMode: !simulated,
        error: err instanceof Error ? err.message : 'Error al guardar modo simulado',
      });
    }
  },

  clearError: () => set({ error: null }),
}));

/**
 * ecoStore.ts — Store Zustand del módulo Reciclador Inteligente.
 *
 * Responsabilidades:
 *   - Centralizar el estado reactivo de todas las entidades ecológicas
 *   - Orquestar llamadas a EcoRepository (sin lógica de BD propia)
 *   - Gestionar loading/error granulares por sección
 *   - Sincronizar estadísticas, progreso e insights tras cada mutación
 *   - Evaluar y desbloquear logros automáticamente al completar acciones
 *
 * Patrones seguidos:
 *   - Consistente con itemStore.ts y containerStore.ts
 *   - Loading flags granulares (isLoadingStats / isLoadingItems / isLoadingAchievements)
 *     para evitar que una sección bloquee el skeleton de otra
 *   - Actualizaciones locales optimistas en mutaciones para minimizar re-renders
 *   - Un único set() por mutación para evitar renders intermedios
 */

import { create } from 'zustand';
import { EcoRepository } from '../database/repositories/EcoRepository';
import type { EcoInsight } from '../database/repositories/EcoRepository';
import type { Item, EcoAction } from '../types/Item';
import type { EcoAchievement, EcoAchievementType, EcoStats } from '../types/Eco';
import {
  ECO_ACHIEVEMENT_THRESHOLDS,
} from '../types/Eco';
import { nowTimestamp } from '../utils/dateUtils';

// Re-exportar EcoInsight para que las pantallas no importen desde el repositorio
export type { EcoInsight };

// ---------------------------------------------------------------------------
// Interfaz del estado
// ---------------------------------------------------------------------------

interface EcoState {
  // ── Estadísticas y progreso ──────────────────────────────────────────────
  ecoStats:    EcoStats | null;
  /** Ratio rescatados / (rescatados + desechados). Valor entre 0 y 1. */
  ecoProgress: number;

  // ── Insights heurísticos ─────────────────────────────────────────────────
  ecoInsights: EcoInsight[];

  // ── Listas de ítems ──────────────────────────────────────────────────────
  pendingItems:      Item[];
  completedItems:    Item[];
  unclassifiedItems: Item[];
  recyclableItems:   Item[];
  donatableItems:    Item[];
  reusableItems:     Item[];
  favoriteEcoItems:  Item[];
  forgottenItems:    Item[];

  // ── Logros ───────────────────────────────────────────────────────────────
  achievements: EcoAchievement[];

  // ── Estado de carga granular ─────────────────────────────────────────────
  /** Cargando estadísticas / progreso */
  isLoadingStats:         boolean;
  /** Cargando cualquier lista de ítems */
  isLoadingItems:         boolean;
  /** Cargando logros */
  isLoadingAchievements:  boolean;
  /** Pull-to-refresh en curso (no bloquea la UI con skeleton) */
  isRefreshing:           boolean;

  // ── Error ────────────────────────────────────────────────────────────────
  error: string | null;

  // ── Acciones de carga ────────────────────────────────────────────────────
  /** Carga ecoStats y ecoProgress en paralelo. */
  loadEcoStats:           () => Promise<void>;
  /** Carga ítems con eco_status='pending'. */
  loadPendingItems:       () => Promise<void>;
  /** Carga ítems con eco_status='completed'. */
  loadCompletedItems:     () => Promise<void>;
  /**
   * Carga ítems sin clasificar.
   * @param limitDays Si se provee, filtra ítems con updated_at anterior a N días.
   */
  loadUnclassifiedItems:  (limitDays?: number) => Promise<void>;
  /**
   * Carga ítems "olvidados" (sin clasificar, con antigüedad > thresholdDays).
   * @param thresholdDays Por defecto 90 días.
   */
  loadForgottenItems:     (thresholdDays?: number) => Promise<void>;
  /** Carga ítems favoritos con acción ecológica asignada. */
  loadFavoriteEcoItems:   () => Promise<void>;
  /** Carga recyclableItems, donatableItems y reusableItems en paralelo. */
  loadEcoItems:           () => Promise<void>;
  /** Carga insights heurísticos. */
  loadInsights:           () => Promise<void>;
  /** Carga todos los logros desbloqueados. */
  loadAchievements:       () => Promise<void>;

  // ── Acciones de mutación ─────────────────────────────────────────────────
  /**
   * Asigna una acción ecológica a un ítem.
   * Mueve el ítem de unclassifiedItems → pendingItems en estado local.
   * Recarga stats, progreso e insights tras la mutación.
   */
  assignEcoAction:  (itemId: string, action: EcoAction, notes?: string) => Promise<void>;
  /**
   * Marca la acción ecológica de un ítem como completada.
   * Mueve el ítem de pendingItems → completedItems en estado local.
   * Recarga stats, progreso e insights. Evalúa logros automáticamente.
   */
  completeEcoAction:(itemId: string) => Promise<void>;
  /**
   * Omite la acción ecológica de un ítem.
   * Elimina el ítem de unclassifiedItems en estado local.
   */
  skipItem:         (itemId: string) => Promise<void>;

  // ── Carga masiva ─────────────────────────────────────────────────────────
  /**
   * Recarga todos los datos ecológicos en paralelo.
   * Usa isRefreshing en lugar de isLoadingStats para no mostrar skeleton.
   */
  refreshEcoData: () => Promise<void>;

  // ── Utilidades ───────────────────────────────────────────────────────────
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEcoStore = create<EcoState>((set, get) => ({
  // Estado inicial
  ecoStats:             null,
  ecoProgress:          0,
  ecoInsights:          [],
  pendingItems:         [],
  completedItems:       [],
  unclassifiedItems:    [],
  recyclableItems:      [],
  donatableItems:       [],
  reusableItems:        [],
  favoriteEcoItems:     [],
  forgottenItems:       [],
  achievements:         [],
  isLoadingStats:       false,
  isLoadingItems:       false,
  isLoadingAchievements:false,
  isRefreshing:         false,
  error:                null,

  // ── Acciones de carga ──────────────────────────────────────────────────

  loadEcoStats: async () => {
    set({ isLoadingStats: true, error: null });
    try {
      // Stats y progreso en paralelo — una sola pasada a la BD cada uno
      const [ecoStats, ecoProgress] = await Promise.all([
        EcoRepository.getEcoStats(),
        EcoRepository.getEcoProgress(),
      ]);
      set({ ecoStats, ecoProgress, isLoadingStats: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar estadísticas',
        isLoadingStats: false,
      });
    }
  },

  loadPendingItems: async () => {
    set({ isLoadingItems: true, error: null });
    try {
      const pendingItems = await EcoRepository.findPending();
      set({ pendingItems, isLoadingItems: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar pendientes',
        isLoadingItems: false,
      });
    }
  },

  loadCompletedItems: async () => {
    set({ isLoadingItems: true, error: null });
    try {
      const completedItems = await EcoRepository.findCompleted();
      set({ completedItems, isLoadingItems: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar historial',
        isLoadingItems: false,
      });
    }
  },

  loadUnclassifiedItems: async (limitDays?: number) => {
    set({ isLoadingItems: true, error: null });
    try {
      const unclassifiedItems = await EcoRepository.findUnclassified(limitDays);
      set({ unclassifiedItems, isLoadingItems: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar sin clasificar',
        isLoadingItems: false,
      });
    }
  },

  loadForgottenItems: async (thresholdDays = 90) => {
    set({ isLoadingItems: true, error: null });
    try {
      const forgottenItems = await EcoRepository.findForgotten(thresholdDays);
      set({ forgottenItems, isLoadingItems: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar olvidados',
        isLoadingItems: false,
      });
    }
  },

  loadFavoriteEcoItems: async () => {
    set({ isLoadingItems: true, error: null });
    try {
      const favoriteEcoItems = await EcoRepository.findFavoriteEcoItems();
      set({ favoriteEcoItems, isLoadingItems: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar favoritos ecológicos',
        isLoadingItems: false,
      });
    }
  },

  loadEcoItems: async () => {
    set({ isLoadingItems: true, error: null });
    try {
      // Tres queries en paralelo — cada una usa su índice eco correspondiente
      const [recyclableItems, donatableItems, reusableItems] = await Promise.all([
        EcoRepository.findRecyclable(),
        EcoRepository.findDonatable(),
        EcoRepository.findReusable(),
      ]);
      set({ recyclableItems, donatableItems, reusableItems, isLoadingItems: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar ítems ecológicos',
        isLoadingItems: false,
      });
    }
  },

  loadInsights: async () => {
    // Los insights no tienen loading propio — son ligeros y se cargan junto a stats
    try {
      const ecoInsights = await EcoRepository.getInsights();
      set({ ecoInsights });
    } catch (err) {
      // Insights no críticos — no bloquean la UI con error
      set({
        error: err instanceof Error ? err.message : 'Error al cargar insights',
      });
    }
  },

  loadAchievements: async () => {
    set({ isLoadingAchievements: true, error: null });
    try {
      const achievements = await EcoRepository.findAllAchievements();
      set({ achievements, isLoadingAchievements: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al cargar logros',
        isLoadingAchievements: false,
      });
    }
  },

  // ── Acciones de mutación ───────────────────────────────────────────────

  assignEcoAction: async (itemId, action, notes) => {
    // Las mutaciones NO gestionan isLoading — solo almacenan error si falla
    try {
      await EcoRepository.updateEcoAction(itemId, action, notes);

      // Actualización local optimista: mover ítem de unclassified → pending
      // sin esperar a recargar la lista completa desde BD
      const { unclassifiedItems, pendingItems } = get();
      const movedItem = unclassifiedItems.find((i) => i.id === itemId);

      if (movedItem) {
        const updatedItem: Item = {
          ...movedItem,
          eco_action: action,
          eco_notes: notes,
          eco_status: 'pending',
          updated_at: nowTimestamp(),
        };
        // Un solo set() con todos los cambios — evita renders intermedios
        set({
          unclassifiedItems: unclassifiedItems.filter((i) => i.id !== itemId),
          pendingItems: [updatedItem, ...pendingItems],
        });
      }

      // Sincronizar stats, progreso e insights en paralelo tras la mutación
      await _syncStatsAndInsights();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al asignar acción ecológica' });
    }
  },

  completeEcoAction: async (itemId) => {
    try {
      await EcoRepository.completeEcoAction(itemId);

      // Actualización local optimista: mover ítem de pending → completed
      const { pendingItems, completedItems } = get();
      const completedItem = pendingItems.find((i) => i.id === itemId);
      const now = nowTimestamp();

      if (completedItem) {
        const updatedItem: Item = {
          ...completedItem,
          eco_status: 'completed',
          eco_completed_at: now,
          updated_at: now,
        };
        set({
          pendingItems: pendingItems.filter((i) => i.id !== itemId),
          completedItems: [updatedItem, ...completedItems],
        });
      }

      // Sincronizar stats, progreso e insights
      await _syncStatsAndInsights();

      // Evaluar logros con el totalRescued actualizado
      const updatedStats = get().ecoStats;
      if (updatedStats) {
        await _checkAndUnlockAchievements(updatedStats.totalRescued);
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al completar acción ecológica' });
    }
  },

  skipItem: async (itemId) => {
    try {
      await EcoRepository.skipEcoAction(itemId);

      // Actualización local: eliminar de unclassifiedItems
      // No se mueve a ninguna lista — los omitidos no aparecen en la UI principal
      set((state) => ({
        unclassifiedItems: state.unclassifiedItems.filter((i) => i.id !== itemId),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al omitir ítem' });
    }
  },

  // ── Carga masiva ──────────────────────────────────────────────────────

  refreshEcoData: async () => {
    set({ isRefreshing: true, error: null });
    try {
      // Cargar todo en paralelo — isRefreshing no muestra skeleton, solo spinner
      const [
        ecoStats,
        ecoProgress,
        ecoInsights,
        pendingItems,
        unclassifiedItems,
        achievements,
      ] = await Promise.all([
        EcoRepository.getEcoStats(),
        EcoRepository.getEcoProgress(),
        EcoRepository.getInsights(),
        EcoRepository.findPending(),
        EcoRepository.findUnclassified(),
        EcoRepository.findAllAchievements(),
      ]);

      set({
        ecoStats,
        ecoProgress,
        ecoInsights,
        pendingItems,
        unclassifiedItems,
        achievements,
        isRefreshing: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Error al refrescar datos ecológicos',
        isRefreshing: false,
      });
    }
  },

  // ── Utilidades ────────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
}));

// ---------------------------------------------------------------------------
// Helpers privados (fuera del objeto create para no contaminar el estado)
// ---------------------------------------------------------------------------

/**
 * Recarga stats, progreso e insights en paralelo.
 * Se llama tras cada mutación para mantener la UI sincronizada con la BD.
 * Accede al store via useEcoStore.setState para evitar dependencias circulares.
 */
async function _syncStatsAndInsights(): Promise<void> {
  try {
    const [ecoStats, ecoProgress, ecoInsights] = await Promise.all([
      EcoRepository.getEcoStats(),
      EcoRepository.getEcoProgress(),
      EcoRepository.getInsights(),
    ]);
    useEcoStore.setState({ ecoStats, ecoProgress, ecoInsights });
  } catch {
    // Silencioso — los datos locales optimistas ya están aplicados
    // El usuario puede refrescar manualmente si hay inconsistencia
  }
}

/**
 * Evalúa si el usuario ha alcanzado un nuevo umbral de logro y lo desbloquea.
 * Se ejecuta tras completeEcoAction con el totalRescued actualizado.
 * Desbloquea de uno en uno por sesión (el más bajo pendiente primero).
 *
 * @param totalRescued Número actual de ítems rescatados (eco_action != 'discard' y completed)
 */
async function _checkAndUnlockAchievements(totalRescued: number): Promise<void> {
  const { achievements } = useEcoStore.getState();
  const unlockedTypes = new Set(achievements.map((a) => a.type));

  // Iterar en orden ascendente de umbral para desbloquear el más bajo primero
  const sortedThresholds = (
    Object.entries(ECO_ACHIEVEMENT_THRESHOLDS) as [EcoAchievementType, number][]
  ).sort(([, a], [, b]) => a - b);

  for (const [type, threshold] of sortedThresholds) {
    if (totalRescued >= threshold && !unlockedTypes.has(type)) {
      try {
        const saved = await EcoRepository.saveAchievement({
          type,
          unlocked_at: nowTimestamp(),
        });
        // Añadir al inicio de achievements para que EcoHub detecte el nuevo logro
        useEcoStore.setState((state) => ({
          achievements: [saved, ...state.achievements],
        }));
        // Desbloquear solo uno por sesión — el usuario verá el banner y podrá
        // completar más acciones para desbloquear el siguiente
        break;
      } catch {
        // Si falla el guardado del logro, no interrumpir el flujo principal
      }
    }
  }
}

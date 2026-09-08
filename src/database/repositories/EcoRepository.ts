/**
 * EcoRepository.ts — Repositorio de datos del módulo Reciclador Inteligente.
 *
 * Responsabilidades:
 *   - Mutaciones ecológicas sobre la tabla `items` (asignar, completar, omitir)
 *   - Consultas de ítems filtradas por estado/acción ecológica
 *   - Estadísticas agregadas en una sola query SQL
 *   - Persistencia y lectura de logros (`eco_achievements`)
 *   - Insights heurísticos basados en reglas simples (sin IA)
 *
 * Lo que NO hace este repositorio:
 *   - CRUD general de ítems → ItemRepository
 *   - Búsqueda por texto → ItemRepository.search
 *   - Operaciones sobre contenedores → ContainerRepository
 *
 * Reutiliza `rowToItem` de ItemRepository para evitar duplicar el mapeo de filas.
 */

import { getDb } from '../db';
import { generateUUID } from '../../utils/uuid';
import { nowTimestamp } from '../../utils/dateUtils';
import { rowToItem } from './ItemRepository';
import type { Item, EcoAction, EcoStatus } from '../../types/Item';
import type {
  EcoAchievement,
  EcoAchievementType,
  EcoStats,
} from '../../types/Eco';
import { ECO_ACTION_POINTS } from '../../types/Eco';

// ---------------------------------------------------------------------------
// Tipos internos del repositorio
// ---------------------------------------------------------------------------

/** Severidad de un insight ecológico. */
export type EcoInsightSeverity = 'info' | 'warning' | 'tip';

/** Tipo de insight ecológico. */
export type EcoInsightType =
  | 'forgotten_items'       // Ítems sin clasificar con más de 90 días de antigüedad
  | 'unclassified_excess'   // Más de 20 ítems sin clasificar
  | 'top_action'            // Acción ecológica más frecuente del usuario
  | 'recent_streak'         // Ítems completados en los últimos 7 días
  | 'active_container';     // Contenedor con más ítems ecológicos activos

/** Insight ecológico generado por reglas heurísticas. */
export interface EcoInsight {
  type: EcoInsightType;
  severity: EcoInsightSeverity;
  message: string;
  /** Valor numérico asociado al insight (conteo, puntos, etc.) */
  count?: number;
  /** ID de referencia opcional (p.ej. container_id para active_container) */
  referenceId?: string;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/** Mapea una fila de eco_achievements al tipo EcoAchievement. */
function rowToAchievement(row: Record<string, unknown>): EcoAchievement {
  return {
    id: row.id as string,
    type: row.type as EcoAchievementType,
    unlocked_at: Number(row.unlocked_at),
    metadata: (row.metadata as string) ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// EcoRepository
// ---------------------------------------------------------------------------

export const EcoRepository = {

  // ── Mutaciones ─────────────────────────────────────────────────────────────

  /**
   * Asigna una acción ecológica a un ítem.
   * Establece eco_status='pending' y actualiza updated_at.
   * Si el ítem no existe, la operación es no-op (sin error).
   */
  async updateEcoAction(
    itemId: string,
    action: EcoAction,
    notes?: string
  ): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `UPDATE items
       SET eco_action = ?, eco_notes = ?, eco_status = ?, updated_at = ?
       WHERE id = ?;`,
      [action, notes ?? null, 'pending' satisfies EcoStatus, nowTimestamp(), itemId]
    );
  },

  /**
   * Marca la acción ecológica de un ítem como completada.
   * Establece eco_status='completed', eco_completed_at=now y updated_at=now.
   * Si el ítem no existe, la operación es no-op (sin error).
   */
  async completeEcoAction(itemId: string): Promise<void> {
    const db = getDb();
    const now = nowTimestamp();
    await db.runAsync(
      `UPDATE items
       SET eco_status = ?, eco_completed_at = ?, updated_at = ?
       WHERE id = ?;`,
      ['completed' satisfies EcoStatus, now, now, itemId]
    );
  },

  /**
   * Omite la acción ecológica de un ítem.
   * Establece eco_status='skipped' y updated_at=now.
   * Si el ítem no existe, la operación es no-op (sin error).
   */
  async skipEcoAction(itemId: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `UPDATE items
       SET eco_status = ?, updated_at = ?
       WHERE id = ?;`,
      ['skipped' satisfies EcoStatus, nowTimestamp(), itemId]
    );
  },

  // ── Consultas de ítems ─────────────────────────────────────────────────────

  /**
   * Retorna todos los ítems con una acción ecológica específica,
   * ordenados por updated_at descendente.
   * Usa el índice idx_items_eco_action.
   */
  async findByEcoAction(action: EcoAction): Promise<Item[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM items
       WHERE eco_action = ?
       ORDER BY updated_at DESC;`,
      [action]
    );
    return rows.map(rowToItem);
  },

  /**
   * Retorna todos los ítems con eco_status='pending',
   * ordenados por updated_at descendente.
   * Usa el índice idx_items_eco_status.
   */
  async findPending(): Promise<Item[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM items
       WHERE eco_status = 'pending'
       ORDER BY updated_at DESC;`
    );
    return rows.map(rowToItem);
  },

  /**
   * Retorna todos los ítems con eco_status='completed',
   * ordenados por eco_completed_at descendente.
   * Usa el índice idx_items_eco_status.
   */
  async findCompleted(): Promise<Item[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM items
       WHERE eco_status = 'completed'
       ORDER BY eco_completed_at DESC;`
    );
    return rows.map(rowToItem);
  },

  /**
   * Retorna ítems sin clasificar (eco_action IS NULL), ordenados por updated_at ASC
   * (los más antiguos primero, ya que son los candidatos prioritarios a desuso).
   *
   * @param limitDays Si se provee, filtra solo ítems cuyo updated_at sea anterior
   *                  a (ahora - limitDays * 86400 segundos). Útil para EcoClassify
   *                  que carga candidatos con más de 90 días de inactividad.
   *
   * Usa el índice idx_items_eco_action (IS NULL también se beneficia del índice).
   */
  async findUnclassified(limitDays?: number): Promise<Item[]> {
    const db = getDb();

    if (limitDays !== undefined) {
      const cutoff = Date.now() - limitDays * 86_400_000;
      const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM items
         WHERE eco_action IS NULL
           AND updated_at < ?
         ORDER BY updated_at ASC;`,
        [cutoff]
      );
      return rows.map(rowToItem);
    }

    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM items
       WHERE eco_action IS NULL
       ORDER BY updated_at ASC;`
    );
    return rows.map(rowToItem);
  },

  /**
   * Retorna ítems marcados como favoritos que ya tienen una acción ecológica asignada.
   * Útil para mostrar "favoritos ecológicos" en EcoHub.
   * Usa los índices idx_items_is_favorite e idx_items_eco_action.
   */
  async findFavoriteEcoItems(): Promise<Item[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM items
       WHERE is_favorite = 1
         AND eco_action IS NOT NULL
       ORDER BY updated_at DESC;`
    );
    return rows.map(rowToItem);
  },

  /**
   * Retorna ítems reciclables (eco_action='recycle') pendientes de completar.
   * Conveniencia para pantallas que muestran solo reciclables.
   */
  async findRecyclable(): Promise<Item[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM items
       WHERE eco_action = 'recycle'
         AND (eco_status = 'pending' OR eco_status IS NULL)
       ORDER BY updated_at DESC;`
    );
    return rows.map(rowToItem);
  },

  /**
   * Retorna ítems para donar (eco_action='donate') pendientes de completar.
   */
  async findDonatable(): Promise<Item[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM items
       WHERE eco_action = 'donate'
         AND (eco_status = 'pending' OR eco_status IS NULL)
       ORDER BY updated_at DESC;`
    );
    return rows.map(rowToItem);
  },

  /**
   * Retorna ítems reutilizables (eco_action='reuse') pendientes de completar.
   */
  async findReusable(): Promise<Item[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM items
       WHERE eco_action = 'reuse'
         AND (eco_status = 'pending' OR eco_status IS NULL)
       ORDER BY updated_at DESC;`
    );
    return rows.map(rowToItem);
  },

  /**
   * Retorna ítems "olvidados": sin clasificar y con updated_at anterior
   * al umbral de días indicado (por defecto 90 días).
   * Alias semántico de findUnclassified con limitDays obligatorio.
   */
  async findForgotten(thresholdDays = 90): Promise<Item[]> {
    return this.findUnclassified(thresholdDays);
  },

  // ── Estadísticas ───────────────────────────────────────────────────────────

  /**
   * Calcula las estadísticas ecológicas agregadas del usuario en una sola query SQL.
   * Usa SUM(CASE WHEN ...) para evitar múltiples round-trips a la base de datos.
   * Los puntos se calculan con la tabla ECO_ACTION_POINTS.
   */
  async getEcoStats(): Promise<EcoStats> {
    const db = getDb();

    // Una sola query con agregaciones condicionales — O(n) sobre items, una pasada
    const row = await db.getFirstAsync<Record<string, unknown>>(`
      SELECT
        COALESCE(SUM(CASE WHEN eco_status = 'pending'                                   THEN 1 ELSE 0 END), 0) AS totalPending,
        COALESCE(SUM(CASE WHEN eco_status = 'completed'                                 THEN 1 ELSE 0 END), 0) AS totalCompleted,
        COALESCE(SUM(CASE WHEN eco_status = 'skipped'                                   THEN 1 ELSE 0 END), 0) AS totalSkipped,
        COALESCE(SUM(CASE WHEN eco_status = 'completed' AND eco_action = 'discard'      THEN 1 ELSE 0 END), 0) AS totalDiscarded,
        COALESCE(SUM(CASE WHEN eco_status = 'completed' AND eco_action != 'discard'     THEN 1 ELSE 0 END), 0) AS totalRescued,
        COALESCE(SUM(CASE
          WHEN eco_status = 'completed' AND eco_action = 'reuse'   THEN ${ECO_ACTION_POINTS.reuse}
          WHEN eco_status = 'completed' AND eco_action = 'repair'  THEN ${ECO_ACTION_POINTS.repair}
          WHEN eco_status = 'completed' AND eco_action = 'donate'  THEN ${ECO_ACTION_POINTS.donate}
          WHEN eco_status = 'completed' AND eco_action = 'recycle' THEN ${ECO_ACTION_POINTS.recycle}
          WHEN eco_status = 'completed' AND eco_action = 'sell'    THEN ${ECO_ACTION_POINTS.sell}
          WHEN eco_status = 'completed' AND eco_action = 'discard' THEN ${ECO_ACTION_POINTS.discard}
          ELSE 0
        END), 0) AS ecoPoints
      FROM items;
    `);

    return {
      totalPending:   Number(row?.totalPending   ?? 0),
      totalCompleted: Number(row?.totalCompleted ?? 0),
      totalSkipped:   Number(row?.totalSkipped   ?? 0),
      totalDiscarded: Number(row?.totalDiscarded ?? 0),
      totalRescued:   Number(row?.totalRescued   ?? 0),
      ecoPoints:      Number(row?.ecoPoints      ?? 0),
    };
  },

  /**
   * Calcula el progreso ecológico como ratio rescatados / (rescatados + desechados).
   * Retorna un valor entre 0 y 1. Retorna 0 si no hay ítems clasificados.
   * Útil para la barra de progreso en EcoHub.
   */
  async getEcoProgress(): Promise<number> {
    const db = getDb();
    const row = await db.getFirstAsync<{ rescued: number; discarded: number }>(`
      SELECT
        COALESCE(SUM(CASE WHEN eco_status = 'completed' AND eco_action != 'discard' THEN 1 ELSE 0 END), 0) AS rescued,
        COALESCE(SUM(CASE WHEN eco_status = 'completed' AND eco_action = 'discard'  THEN 1 ELSE 0 END), 0) AS discarded
      FROM items;
    `);
    const rescued = Number(row?.rescued ?? 0);
    const discarded = Number(row?.discarded ?? 0);
    const total = rescued + discarded;
    return total > 0 ? rescued / total : 0;
  },

  // ── Logros ─────────────────────────────────────────────────────────────────

  /**
   * Persiste un nuevo logro en eco_achievements.
   * Genera un UUID automáticamente y retorna el registro completo.
   */
  async saveAchievement(
    achievement: Omit<EcoAchievement, 'id'>
  ): Promise<EcoAchievement> {
    const db = getDb();
    const id = generateUUID();
    await db.runAsync(
      `INSERT INTO eco_achievements (id, type, unlocked_at, metadata)
       VALUES (?, ?, ?, ?);`,
      [id, achievement.type, achievement.unlocked_at, achievement.metadata ?? null]
    );
    return { id, ...achievement };
  },

  /**
   * Retorna todos los logros desbloqueados, ordenados por unlocked_at descendente.
   */
  async findAllAchievements(): Promise<EcoAchievement[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM eco_achievements
       ORDER BY unlocked_at DESC;`
    );
    return rows.map(rowToAchievement);
  },

  // ── Insights heurísticos ───────────────────────────────────────────────────

  /**
   * Genera insights ecológicos basados en reglas heurísticas simples.
   * Todas las queries se ejecutan en paralelo para minimizar latencia.
   * Solo se incluyen insights con datos reales (sin falsos positivos).
   *
   * Reglas implementadas:
   *   - forgotten_items:     ítems sin clasificar con > 90 días de antigüedad
   *   - unclassified_excess: más de 20 ítems sin clasificar en total
   *   - top_action:          acción ecológica completada más frecuente
   *   - recent_streak:       ítems completados en los últimos 7 días
   *   - active_container:    contenedor con más ítems ecológicos pendientes
   */
  async getInsights(): Promise<EcoInsight[]> {
    const db = getDb();
    const now = Date.now();
    const cutoff90d = now - 90 * 86_400_000;
    const cutoff7d  = now - 7  * 86_400_000;

    // Ejecutar todas las queries en paralelo
    const [
      forgottenRow,
      unclassifiedRow,
      topActionRow,
      recentStreakRow,
      activeContainerRow,
    ] = await Promise.all([
      // 1. Ítems olvidados (sin clasificar, > 90 días)
      db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM items
         WHERE eco_action IS NULL AND updated_at < ?;`,
        [cutoff90d]
      ),

      // 2. Total de ítems sin clasificar
      db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM items
         WHERE eco_action IS NULL;`
      ),

      // 3. Acción completada más frecuente
      db.getFirstAsync<{ eco_action: string; count: number }>(
        `SELECT eco_action, COUNT(*) AS count FROM items
         WHERE eco_status = 'completed' AND eco_action IS NOT NULL
         GROUP BY eco_action
         ORDER BY count DESC
         LIMIT 1;`
      ),

      // 4. Ítems completados en los últimos 7 días
      db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM items
         WHERE eco_status = 'completed' AND eco_completed_at >= ?;`,
        [cutoff7d]
      ),

      // 5. Contenedor con más ítems ecológicos pendientes
      db.getFirstAsync<{ container_id: string; count: number }>(
        `SELECT container_id, COUNT(*) AS count FROM items
         WHERE eco_status = 'pending'
         GROUP BY container_id
         ORDER BY count DESC
         LIMIT 1;`
      ),
    ]);

    const insights: EcoInsight[] = [];

    // ── Insight: ítems olvidados ──────────────────────────────────────────
    const forgottenCount = Number(forgottenRow?.count ?? 0);
    if (forgottenCount > 0) {
      insights.push({
        type: 'forgotten_items',
        severity: forgottenCount >= 10 ? 'warning' : 'tip',
        message:
          forgottenCount === 1
            ? 'Tienes 1 objeto sin clasificar con más de 90 días de antigüedad.'
            : `Tienes ${forgottenCount} objetos sin clasificar con más de 90 días de antigüedad.`,
        count: forgottenCount,
      });
    }

    // ── Insight: exceso de ítems sin clasificar ───────────────────────────
    const unclassifiedCount = Number(unclassifiedRow?.count ?? 0);
    if (unclassifiedCount > 20) {
      insights.push({
        type: 'unclassified_excess',
        severity: 'warning',
        message: `Tienes ${unclassifiedCount} objetos sin clasificar. Considera revisar tu inventario.`,
        count: unclassifiedCount,
      });
    }

    // ── Insight: acción más frecuente ─────────────────────────────────────
    if (topActionRow?.eco_action && topActionRow.count > 0) {
      const actionLabels: Record<string, string> = {
        recycle: 'reciclar',
        donate: 'donar',
        sell: 'vender',
        reuse: 'reutilizar',
        repair: 'reparar',
        discard: 'desechar',
      };
      const label = actionLabels[topActionRow.eco_action] ?? topActionRow.eco_action;
      insights.push({
        type: 'top_action',
        severity: 'info',
        message: `Tu acción ecológica más frecuente es ${label} (${topActionRow.count} veces).`,
        count: topActionRow.count,
      });
    }

    // ── Insight: racha reciente ───────────────────────────────────────────
    const recentCount = Number(recentStreakRow?.count ?? 0);
    if (recentCount > 0) {
      insights.push({
        type: 'recent_streak',
        severity: 'info',
        message:
          recentCount === 1
            ? 'Completaste 1 acción ecológica esta semana. ¡Sigue así!'
            : `Completaste ${recentCount} acciones ecológicas esta semana. ¡Excelente racha!`,
        count: recentCount,
      });
    }

    // ── Insight: contenedor más activo ────────────────────────────────────
    if (activeContainerRow?.container_id && activeContainerRow.count > 1) {
      insights.push({
        type: 'active_container',
        severity: 'tip',
        message: `Un contenedor tiene ${activeContainerRow.count} objetos ecológicos pendientes. Revísalo pronto.`,
        count: activeContainerRow.count,
        referenceId: activeContainerRow.container_id,
      });
    }

    return insights;
  },
};

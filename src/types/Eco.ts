/**
 * Eco.ts — Tipos, interfaces y constantes del módulo Reciclador Inteligente.
 *
 * Este archivo contiene exclusivamente las entidades y configuración del módulo
 * ecológico que NO forman parte del modelo Item (esas viven en Item.ts).
 * No tiene dependencias circulares: sólo importa desde ./common.
 */

import type { UnixTimestamp } from './common';
import type { EcoAction } from './Item';

// ---------------------------------------------------------------------------
// Tipos de logros
// ---------------------------------------------------------------------------

/** Identificadores de los logros desbloqueables por el usuario. */
export type EcoAchievementType =
  | 'first_rescue'
  | 'guardian_verde'
  | 'eco_heroe'
  | 'maestro_reciclaje'
  | 'leyenda_sostenible'
  | 'campeon_planeta';

// ---------------------------------------------------------------------------
// Interfaces de entidades
// ---------------------------------------------------------------------------

/** Logro ecológico desbloqueado por el usuario. */
export interface EcoAchievement {
  id: string;
  type: EcoAchievementType;
  unlocked_at: UnixTimestamp;
  metadata?: string;
}

/**
 * Estadísticas ecológicas agregadas del usuario.
 *
 * - `totalRescued`:   ítems con eco_action !== 'discard' y eco_status === 'completed'
 * - `totalDiscarded`: ítems con eco_action === 'discard' y eco_status === 'completed'
 * - `ecoPoints`:      suma ponderada de puntos de todas las acciones completadas
 */
export interface EcoStats {
  totalPending: number;
  totalCompleted: number;
  totalSkipped: number;
  totalDiscarded: number;
  totalRescued: number;
  ecoPoints: number;
}

// ---------------------------------------------------------------------------
// Constantes de configuración del módulo
// ---------------------------------------------------------------------------

/** Etiquetas en español para cada acción ecológica. */
export const ECO_ACTION_LABELS: Record<EcoAction, string> = {
  recycle: 'Reciclar',
  donate: 'Donar',
  sell: 'Vender',
  reuse: 'Reutilizar',
  repair: 'Reparar',
  discard: 'Desechar',
};

/** Nombres de íconos Ionicons para cada acción ecológica. */
export const ECO_ACTION_ICONS: Record<EcoAction, string> = {
  recycle: 'leaf-outline',
  donate: 'heart-outline',
  sell: 'pricetag-outline',
  reuse: 'refresh-outline',
  repair: 'construct-outline',
  discard: 'trash-outline',
};

/**
 * Puntos ecológicos otorgados al completar cada acción.
 * Orden descendente de impacto ambiental positivo.
 */
export const ECO_ACTION_POINTS: Record<EcoAction, number> = {
  reuse: 10,
  repair: 10,
  donate: 8,
  recycle: 6,
  sell: 5,
  discard: 1,
};

/**
 * Umbral de `totalRescued` necesario para desbloquear cada logro.
 * Un logro se desbloquea cuando totalRescued >= threshold y aún no está en achievements.
 */
export const ECO_ACHIEVEMENT_THRESHOLDS: Record<EcoAchievementType, number> = {
  first_rescue: 1,
  guardian_verde: 5,
  eco_heroe: 10,
  maestro_reciclaje: 25,
  leyenda_sostenible: 50,
  campeon_planeta: 100,
};

/** Nombre y descripción legibles de cada logro, para mostrar en la UI. */
export const ECO_ACHIEVEMENT_LABELS: Record<
  EcoAchievementType,
  { name: string; description: string }
> = {
  first_rescue: {
    name: 'Primer Rescate',
    description: 'Completaste tu primera acción ecológica.',
  },
  guardian_verde: {
    name: 'Guardián Verde',
    description: 'Rescataste 5 objetos del desecho.',
  },
  eco_heroe: {
    name: 'Eco Héroe',
    description: 'Rescataste 10 objetos del desecho.',
  },
  maestro_reciclaje: {
    name: 'Maestro del Reciclaje',
    description: 'Rescataste 25 objetos del desecho.',
  },
  leyenda_sostenible: {
    name: 'Leyenda Sostenible',
    description: 'Rescataste 50 objetos del desecho.',
  },
  campeon_planeta: {
    name: 'Campeón del Planeta',
    description: 'Rescataste 100 objetos del desecho.',
  },
};

/** Array ordenado de todas las acciones ecológicas disponibles (útil para iterar en UI). */
export const ECO_ACTIONS: EcoAction[] = [
  'recycle',
  'donate',
  'sell',
  'reuse',
  'repair',
  'discard',
];

import type { UnixTimestamp } from './common';

// ---------------------------------------------------------------------------
// Tipos ecológicos — módulo Reciclador Inteligente
// ---------------------------------------------------------------------------

/** Acción ecológica que el usuario puede asignar a un ítem en desuso. */
export type EcoAction = 'recycle' | 'donate' | 'sell' | 'reuse' | 'repair' | 'discard';

/** Estado del ciclo de vida de la acción ecológica de un ítem. */
export type EcoStatus = 'pending' | 'completed' | 'skipped';

// ---------------------------------------------------------------------------
// Entidades principales
// ---------------------------------------------------------------------------

export interface Item {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  container_id: string;
  cover_image_uri?: string;
  is_favorite: boolean;
  created_at: UnixTimestamp;
  updated_at: UnixTimestamp;
  // Campos ecológicos opcionales (NULL en ítems sin clasificar)
  eco_action?: EcoAction;
  eco_notes?: string;
  eco_completed_at?: UnixTimestamp;
  eco_status?: EcoStatus;
}

export interface CreateItemInput {
  name: string;
  description?: string;
  quantity?: number;
  container_id: string;
  cover_image_uri?: string;
  tag_ids?: string[];
  // Campos ecológicos opcionales al crear
  eco_action?: EcoAction | null;
  eco_status?: EcoStatus | null;
}

export interface UpdateItemInput {
  name?: string;
  description?: string;
  quantity?: number;
  cover_image_uri?: string;
  is_favorite?: boolean;
  // Campos ecológicos — aceptan null para borrar el valor
  eco_action?: EcoAction | null;
  eco_notes?: string | null;
  eco_completed_at?: UnixTimestamp | null;
  eco_status?: EcoStatus | null;
}

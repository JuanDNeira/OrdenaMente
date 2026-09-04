import type { UnixTimestamp } from './common';

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
}

export interface CreateItemInput {
  name: string;
  description?: string;
  quantity?: number;
  container_id: string;
  cover_image_uri?: string;
  tag_ids?: string[];
}

export interface UpdateItemInput {
  name?: string;
  description?: string;
  quantity?: number;
  cover_image_uri?: string;
  is_favorite?: boolean;
}

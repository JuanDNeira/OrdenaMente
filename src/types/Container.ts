import type { UnixTimestamp, ContainerType } from './common';

export interface Container {
  id: string;
  name: string;
  description?: string;
  type: ContainerType;
  location_id?: string;
  parent_container_id?: string;
  cover_image_uri?: string;
  color_tag?: string;
  is_favorite: boolean;
  created_at: UnixTimestamp;
  updated_at: UnixTimestamp;
  last_accessed_at?: UnixTimestamp;
  // Computed field — populated by some queries
  item_count?: number;
}

export interface CreateContainerInput {
  name: string;
  description?: string;
  type: ContainerType;
  location_id?: string;
  parent_container_id?: string;
  cover_image_uri?: string;
  color_tag?: string;
}

export interface UpdateContainerInput {
  name?: string;
  description?: string;
  type?: ContainerType;
  location_id?: string;
  parent_container_id?: string;
  cover_image_uri?: string;
  color_tag?: string;
  is_favorite?: boolean;
}

import type { UnixTimestamp } from './common';

export interface Location {
  id: string;
  name: string;
  icon?: string;
  created_at: UnixTimestamp;
}

export interface CreateLocationInput {
  name: string;
  icon?: string;
}

export interface UpdateLocationInput {
  name?: string;
  icon?: string;
}

import { getDb } from '../db';
import { generateUUID } from '../../utils/uuid';
import { nowTimestamp } from '../../utils/dateUtils';
import type { Location, CreateLocationInput, UpdateLocationInput } from '../../types/Location';

export class LocationNotFoundError extends Error {
  constructor(id: string) {
    super(`Location not found: ${id}`);
    this.name = 'LocationNotFoundError';
  }
}

function rowToLocation(row: Record<string, unknown>): Location {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: (row.icon as string) ?? undefined,
    // Coerce to number — expo-sqlite may return INTEGER columns as strings
    created_at: Number(row.created_at),
  };
}

export const LocationRepository = {
  async findAll(): Promise<Location[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM locations ORDER BY name ASC;'
    );
    return rows.map(rowToLocation);
  },

  async findById(id: string): Promise<Location | null> {
    const db = getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM locations WHERE id = ?;',
      [id]
    );
    return row ? rowToLocation(row) : null;
  },

  async create(data: CreateLocationInput): Promise<Location> {
    const db = getDb();
    const id = generateUUID();
    const now = nowTimestamp();
    await db.runAsync(
      'INSERT INTO locations (id, name, icon, created_at) VALUES (?, ?, ?, ?);',
      [id, data.name, data.icon ?? null, now]
    );
    const created = await this.findById(id);
    if (!created) throw new LocationNotFoundError(id);
    return created;
  },

  async update(id: string, data: UpdateLocationInput): Promise<void> {
    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }

    if (fields.length === 0) return;
    values.push(id);

    await db.runAsync(
      `UPDATE locations SET ${fields.join(', ')} WHERE id = ?;`,
      values as (string | number | null)[]
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    // Nullify location_id on all containers assigned to this location
    await db.runAsync(
      'UPDATE containers SET location_id = NULL, updated_at = ? WHERE location_id = ?;',
      [nowTimestamp(), id]
    );
    await db.runAsync('DELETE FROM locations WHERE id = ?;', [id]);
  },
};

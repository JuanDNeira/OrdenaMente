import { getDb } from '../db';
import { generateUUID } from '../../utils/uuid';
import { nowTimestamp } from '../../utils/dateUtils';
import type { Item, EcoAction, EcoStatus, CreateItemInput, UpdateItemInput } from '../../types/Item';

export class ItemNotFoundError extends Error {
  constructor(id: string) {
    super(`Item not found: ${id}`);
    this.name = 'ItemNotFoundError';
  }
}

export function rowToItem(row: Record<string, unknown>): Item {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? undefined,
    quantity: Number(row.quantity),
    container_id: row.container_id as string,
    cover_image_uri: (row.cover_image_uri as string) ?? undefined,
    is_favorite: Number(row.is_favorite ?? 0) === 1,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    // Campos ecológicos — NULL en BD se convierte en undefined en TypeScript
    eco_action: (row.eco_action as EcoAction) ?? undefined,
    eco_notes: (row.eco_notes as string) ?? undefined,
    eco_completed_at: row.eco_completed_at != null ? Number(row.eco_completed_at) : undefined,
    eco_status: (row.eco_status as EcoStatus) ?? undefined,
  };
}

export const ItemRepository = {
  async findByContainerId(containerId: string): Promise<Item[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM items WHERE container_id = ? ORDER BY is_favorite DESC, created_at DESC;',
      [containerId]
    );
    return rows.map(rowToItem);
  },

  async findById(id: string): Promise<Item | null> {
    const db = getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM items WHERE id = ?;',
      [id]
    );
    return row ? rowToItem(row) : null;
  },

  async create(data: CreateItemInput): Promise<Item> {
    const db = getDb();
    const id = generateUUID();
    const now = nowTimestamp();
    const quantity = data.quantity ?? 1;

    await db.runAsync(
      `INSERT INTO items (id, name, description, quantity, container_id, cover_image_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.name,
        data.description ?? null,
        quantity,
        data.container_id,
        data.cover_image_uri ?? null,
        now,
        now,
      ]
    );

    if (data.tag_ids && data.tag_ids.length > 0) {
      for (const tagId of data.tag_ids) {
        await db.runAsync(
          'INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?);',
          [id, tagId]
        );
      }
    }

    const created = await this.findById(id);
    if (!created) throw new ItemNotFoundError(id);
    return created;
  },

  async update(id: string, data: UpdateItemInput): Promise<void> {
    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity); }
    if (data.cover_image_uri !== undefined) { fields.push('cover_image_uri = ?'); values.push(data.cover_image_uri); }
    if (data.is_favorite !== undefined) { fields.push('is_favorite = ?'); values.push(data.is_favorite ? 1 : 0); }

    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(nowTimestamp());
    values.push(id);

    await db.runAsync(
      `UPDATE items SET ${fields.join(', ')} WHERE id = ?;`,
      values as (string | number | null)[]
    );
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const db = getDb();
    const row = await db.getFirstAsync<{ is_favorite: number }>(
      'SELECT is_favorite FROM items WHERE id = ?;',
      [id]
    );
    const newValue = row?.is_favorite === 1 ? 0 : 1;
    await db.runAsync(
      'UPDATE items SET is_favorite = ?, updated_at = ? WHERE id = ?;',
      [newValue, nowTimestamp(), id]
    );
    return newValue === 1;
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.runAsync('DELETE FROM items WHERE id = ?;', [id]);
  },

  async move(id: string, newContainerId: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'UPDATE items SET container_id = ?, updated_at = ? WHERE id = ?;',
      [newContainerId, nowTimestamp(), id]
    );
  },

  async search(query: string): Promise<Item[]> {
    const db = getDb();
    const like = `%${query}%`;
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM items
       WHERE name LIKE ? OR description LIKE ?
       ORDER BY updated_at DESC
       LIMIT 50;`,
      [like, like]
    );
    return rows.map(rowToItem);
  },

  async getTotalCount(): Promise<number> {
    const db = getDb();
    const result = await db.getFirstAsync<{ total: unknown }>(
      'SELECT COALESCE(SUM(quantity), 0) AS total FROM items;'
    );
    return Number(result?.total ?? 0);
  },
};

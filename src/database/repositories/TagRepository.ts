import { getDb } from '../db';
import { generateUUID } from '../../utils/uuid';
import { nowTimestamp } from '../../utils/dateUtils';
import type { Tag, CreateTagInput, UpdateTagInput } from '../../types/Tag';

export class DuplicateTagNameError extends Error {
  constructor(name: string) {
    super(`Tag name already exists: "${name}"`);
    this.name = 'DuplicateTagNameError';
  }
}

function rowToTag(row: Record<string, unknown>): Tag {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
  };
}

export const TagRepository = {
  async findAll(): Promise<Tag[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM tags ORDER BY name ASC;'
    );
    return rows.map(rowToTag);
  },

  async findById(id: string): Promise<Tag | null> {
    const db = getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM tags WHERE id = ?;',
      [id]
    );
    return row ? rowToTag(row) : null;
  },

  async findByContainerId(containerId: string): Promise<Tag[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT t.* FROM tags t
       INNER JOIN container_tags ct ON ct.tag_id = t.id
       WHERE ct.container_id = ?
       ORDER BY t.name ASC;`,
      [containerId]
    );
    return rows.map(rowToTag);
  },

  async findByItemId(itemId: string): Promise<Tag[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT t.* FROM tags t
       INNER JOIN item_tags it ON it.tag_id = t.id
       WHERE it.item_id = ?
       ORDER BY t.name ASC;`,
      [itemId]
    );
    return rows.map(rowToTag);
  },

  async create(data: CreateTagInput): Promise<Tag> {
    const db = getDb();
    // Check for duplicate name
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM tags WHERE name = ? LIMIT 1;',
      [data.name]
    );
    if (existing) throw new DuplicateTagNameError(data.name);

    const id = generateUUID();
    await db.runAsync(
      'INSERT INTO tags (id, name, color) VALUES (?, ?, ?);',
      [id, data.name, data.color]
    );
    const created = await this.findById(id);
    if (!created) throw new Error('Tag creation failed');
    return created;
  },

  async update(id: string, data: UpdateTagInput): Promise<void> {
    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) {
      // Check duplicate name (excluding self)
      const existing = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM tags WHERE name = ? AND id != ? LIMIT 1;',
        [data.name, id]
      );
      if (existing) throw new DuplicateTagNameError(data.name);
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }

    if (fields.length === 0) return;
    values.push(id);
    await db.runAsync(
      `UPDATE tags SET ${fields.join(', ')} WHERE id = ?;`,
      values as (string | number | null)[]
    );
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.runAsync('DELETE FROM tags WHERE id = ?;', [id]);
  },

  async assignToContainer(containerId: string, tagId: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'INSERT OR IGNORE INTO container_tags (container_id, tag_id) VALUES (?, ?);',
      [containerId, tagId]
    );
  },

  async removeFromContainer(containerId: string, tagId: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'DELETE FROM container_tags WHERE container_id = ? AND tag_id = ?;',
      [containerId, tagId]
    );
  },

  async assignToItem(itemId: string, tagId: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?);',
      [itemId, tagId]
    );
  },

  async removeFromItem(itemId: string, tagId: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'DELETE FROM item_tags WHERE item_id = ? AND tag_id = ?;',
      [itemId, tagId]
    );
  },

  async getUsageCounts(): Promise<Record<string, number>> {
    const db = getDb();
    const rows = await db.getAllAsync<{ tag_id: string; cnt: number }>(
      `SELECT tag_id, COUNT(*) as cnt FROM (
         SELECT tag_id FROM container_tags
         UNION ALL
         SELECT tag_id FROM item_tags
       ) GROUP BY tag_id;`
    );
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.tag_id] = row.cnt;
    }
    return result;
  },
};

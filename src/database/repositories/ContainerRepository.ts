import { getDb } from '../db';
import { generateUUID } from '../../utils/uuid';
import { nowTimestamp } from '../../utils/dateUtils';
import type { Container, CreateContainerInput, UpdateContainerInput } from '../../types/Container';
import type { ContainerType } from '../../types/common';

export class ContainerNotFoundError extends Error {
  constructor(id: string) {
    super(`Container not found: ${id}`);
    this.name = 'ContainerNotFoundError';
  }
}

function rowToContainer(row: Record<string, unknown>): Container {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? undefined,
    type: row.type as ContainerType,
    location_id: (row.location_id as string) ?? undefined,
    parent_container_id: (row.parent_container_id as string) ?? undefined,
    cover_image_uri: (row.cover_image_uri as string) ?? undefined,
    color_tag: (row.color_tag as string) ?? undefined,
    is_favorite: Number(row.is_favorite ?? 0) === 1,
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    last_accessed_at: row.last_accessed_at != null ? Number(row.last_accessed_at) : undefined,
    item_count: row.item_count != null ? Number(row.item_count) : undefined,
  };
}

export const ContainerRepository = {
  async findAll(): Promise<Container[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM containers ORDER BY updated_at DESC;'
    );
    return rows.map(rowToContainer);
  },

  async findRoots(): Promise<Container[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT c.*,
         (SELECT COALESCE(SUM(i.quantity), 0)
          FROM items i
          WHERE i.container_id = c.id) AS item_count
       FROM containers c
       WHERE c.parent_container_id IS NULL
       ORDER BY c.is_favorite DESC, c.updated_at DESC;`
    );
    return rows.map(rowToContainer);
  },

  async findFavorites(): Promise<Container[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT c.*,
         (SELECT COALESCE(SUM(i.quantity), 0)
          FROM items i
          WHERE i.container_id = c.id) AS item_count
       FROM containers c
       WHERE c.is_favorite = 1
       ORDER BY c.updated_at DESC;`
    );
    return rows.map(rowToContainer);
  },

  async findById(id: string): Promise<Container | null> {
    const db = getDb();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      'SELECT * FROM containers WHERE id = ?;',
      [id]
    );
    return row ? rowToContainer(row) : null;
  },

  async findByParentId(parentId: string): Promise<Container[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM containers WHERE parent_container_id = ? ORDER BY updated_at DESC;',
      [parentId]
    );
    return rows.map(rowToContainer);
  },

  async findByLocationId(locationId: string): Promise<Container[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM containers WHERE location_id = ? AND parent_container_id IS NULL ORDER BY updated_at DESC;',
      [locationId]
    );
    return rows.map(rowToContainer);
  },

  async findByTagIds(tagIds: string[]): Promise<Container[]> {
    if (tagIds.length === 0) return [];
    const db = getDb();
    const placeholders = tagIds.map(() => '?').join(',');
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT c.* FROM containers c
       WHERE c.parent_container_id IS NULL
         AND (
           SELECT COUNT(DISTINCT ct.tag_id)
           FROM container_tags ct
           WHERE ct.container_id = c.id AND ct.tag_id IN (${placeholders})
         ) = ?
       ORDER BY c.updated_at DESC;`,
      [...tagIds, tagIds.length]
    );
    return rows.map(rowToContainer);
  },

  async create(data: CreateContainerInput): Promise<Container> {
    const db = getDb();
    const id = generateUUID();
    const now = nowTimestamp();
    await db.runAsync(
      `INSERT INTO containers
         (id, name, description, type, location_id, parent_container_id, cover_image_uri, color_tag, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        data.name,
        data.description ?? null,
        data.type,
        data.location_id ?? null,
        data.parent_container_id ?? null,
        data.cover_image_uri ?? null,
        data.color_tag ?? null,
        now,
        now,
      ]
    );
    const created = await this.findById(id);
    if (!created) throw new ContainerNotFoundError(id);
    return created;
  },

  async update(id: string, data: UpdateContainerInput): Promise<void> {
    const db = getDb();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.type !== undefined) { fields.push('type = ?'); values.push(data.type); }
    if (data.location_id !== undefined) { fields.push('location_id = ?'); values.push(data.location_id); }
    if (data.parent_container_id !== undefined) { fields.push('parent_container_id = ?'); values.push(data.parent_container_id); }
    if (data.cover_image_uri !== undefined) { fields.push('cover_image_uri = ?'); values.push(data.cover_image_uri); }
    if (data.color_tag !== undefined) { fields.push('color_tag = ?'); values.push(data.color_tag); }
    if (data.is_favorite !== undefined) { fields.push('is_favorite = ?'); values.push(data.is_favorite ? 1 : 0); }

    if (fields.length === 0) return;
    fields.push('updated_at = ?');
    values.push(nowTimestamp());
    values.push(id);

    await db.runAsync(
      `UPDATE containers SET ${fields.join(', ')} WHERE id = ?;`,
      values as (string | number | null)[]
    );
  },

  async toggleFavorite(id: string): Promise<boolean> {
    const db = getDb();
    const row = await db.getFirstAsync<{ is_favorite: number }>(
      'SELECT is_favorite FROM containers WHERE id = ?;',
      [id]
    );
    const newValue = row?.is_favorite === 1 ? 0 : 1;
    await db.runAsync(
      'UPDATE containers SET is_favorite = ?, updated_at = ? WHERE id = ?;',
      [newValue, nowTimestamp(), id]
    );
    return newValue === 1;
  },

  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.runAsync('DELETE FROM containers WHERE id = ?;', [id]);
  },

  async touchAccessTime(id: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      'UPDATE containers SET last_accessed_at = ? WHERE id = ?;',
      [nowTimestamp(), id]
    );
  },

  async countItems(id: string): Promise<number> {
    const db = getDb();
    const result = await db.getFirstAsync<{ total: unknown }>(
      `WITH RECURSIVE subtree(id) AS (
         SELECT id FROM containers WHERE id = ?
         UNION ALL
         SELECT c.id FROM containers c
         INNER JOIN subtree s ON c.parent_container_id = s.id
       )
       SELECT COALESCE(SUM(i.quantity), 0) AS total
       FROM items i
       WHERE i.container_id IN (SELECT id FROM subtree);`,
      [id]
    );
    return Number(result?.total ?? 0);
  },

  async search(query: string): Promise<Container[]> {
    const db = getDb();
    const like = `%${query}%`;
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM containers
       WHERE name LIKE ? OR description LIKE ?
       ORDER BY updated_at DESC
       LIMIT 50;`,
      [like, like]
    );
    return rows.map(rowToContainer);
  },

  async getStatsByType(): Promise<Record<ContainerType, number>> {
    const db = getDb();
    const rows = await db.getAllAsync<{ type: ContainerType; count: number }>(
      'SELECT type, COUNT(*) as count FROM containers GROUP BY type;'
    );
    const stats: Partial<Record<ContainerType, number>> = {};
    for (const row of rows) {
      stats[row.type] = row.count;
    }
    return stats as Record<ContainerType, number>;
  },

  async getDailyItemCounts(days: number): Promise<{ date: string; count: number }[]> {
    const db = getDb();
    const since = Date.now() - days * 86_400_000;
    const rows = await db.getAllAsync<{ date: string; count: number }>(
      `SELECT
         date(created_at / 1000, 'unixepoch') AS date,
         COUNT(*) AS count
       FROM items
       WHERE created_at >= ?
       GROUP BY date
       ORDER BY date ASC;`,
      [since]
    );
    return rows;
  },

  async getTopFilledContainers(
    limit: number
  ): Promise<{ container: Container; count: number }[]> {
    const db = getDb();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT c.*, COALESCE(SUM(i.quantity), 0) AS item_count
       FROM containers c
       LEFT JOIN items i ON i.container_id = c.id
       WHERE c.parent_container_id IS NULL
       GROUP BY c.id
       ORDER BY item_count DESC
       LIMIT ?;`,
      [limit]
    );
    return rows.map((row) => ({
      container: rowToContainer(row),
      count: row.item_count as number,
    }));
  },

  async getStorageInfo(): Promise<{ containerCount: number; itemCount: number; tagCount: number; locationCount: number }> {
    const db = getDb();
    const [c, i, t, l] = await Promise.all([
      db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM containers;'),
      db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM items;'),
      db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM tags;'),
      db.getFirstAsync<{ n: number }>('SELECT COUNT(*) as n FROM locations;'),
    ]);
    return {
      containerCount: Number(c?.n ?? 0),
      itemCount: Number(i?.n ?? 0),
      tagCount: Number(t?.n ?? 0),
      locationCount: Number(l?.n ?? 0),
    };
  },

  async deleteAllData(): Promise<void> {
    const db = getDb();
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM item_tags;');
      await db.execAsync('DELETE FROM container_tags;');
      await db.execAsync('DELETE FROM items;');
      await db.execAsync('DELETE FROM containers;');
      await db.execAsync('DELETE FROM tags;');
      // Keep locations and seed location intact
    });
  },
};

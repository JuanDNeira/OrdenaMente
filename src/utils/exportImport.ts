/**
 * San Alejo — Export / Import utility
 * Serializes the full database to JSON and restores from backup.
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb } from '../database/db';
import { generateUUID } from './uuid';
import { nowTimestamp } from './dateUtils';

export interface BackupData {
  version: number;
  exported_at: number;
  locations: Record<string, unknown>[];
  tags: Record<string, unknown>[];
  containers: Record<string, unknown>[];
  items: Record<string, unknown>[];
  container_tags: Record<string, unknown>[];
  item_tags: Record<string, unknown>[];
}

const BACKUP_VERSION = 1;

// ─── Export ───────────────────────────────────────────────────────────────────
export async function exportDatabase(): Promise<string> {
  const db = getDb();

  const [locations, tags, containers, items, containerTags, itemTags] = await Promise.all([
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM locations;'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM tags;'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM containers;'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM items;'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM container_tags;'),
    db.getAllAsync<Record<string, unknown>>('SELECT * FROM item_tags;'),
  ]);

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exported_at: nowTimestamp(),
    locations,
    tags,
    containers,
    items,
    container_tags: containerTags,
    item_tags: itemTags,
  };

  const json = JSON.stringify(backup, null, 2);
  const filename = `san-alejo-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const fileUri = `${FileSystem.cacheDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return fileUri;
}

// ─── Share ────────────────────────────────────────────────────────────────────
export async function shareBackup(): Promise<void> {
  const fileUri = await exportDatabase();
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Compartir no está disponible en este dispositivo.');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Compartir respaldo de OrdenaMente',
  });
}

// ─── Import ───────────────────────────────────────────────────────────────────
export async function importDatabase(fileUri: string): Promise<{ imported: number }> {
  const content = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let backup: BackupData;
  try {
    backup = JSON.parse(content) as BackupData;
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }

  if (!backup.version || !backup.containers || !backup.items) {
    throw new Error('El archivo no es un respaldo válido de OrdenaMente.');
  }

  const db = getDb();

  await db.withTransactionAsync(async () => {
    // Clear existing data (keep migrations table)
    await db.execAsync('DELETE FROM item_tags;');
    await db.execAsync('DELETE FROM container_tags;');
    await db.execAsync('DELETE FROM items;');
    await db.execAsync('DELETE FROM containers;');
    await db.execAsync('DELETE FROM tags;');
    await db.execAsync('DELETE FROM locations;');

    // Restore locations
    for (const loc of backup.locations) {
      await db.runAsync(
        'INSERT OR IGNORE INTO locations (id, name, icon, created_at) VALUES (?, ?, ?, ?);',
        [loc.id as string, loc.name as string, (loc.icon as string) ?? null, Number(loc.created_at)]
      );
    }

    // Restore tags
    for (const tag of backup.tags) {
      await db.runAsync(
        'INSERT OR IGNORE INTO tags (id, name, color) VALUES (?, ?, ?);',
        [tag.id as string, tag.name as string, tag.color as string]
      );
    }

    // Restore containers
    for (const c of backup.containers) {
      await db.runAsync(
        `INSERT OR IGNORE INTO containers
           (id, name, description, type, location_id, parent_container_id,
            cover_image_uri, color_tag, is_favorite, created_at, updated_at, last_accessed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          c.id as string,
          c.name as string,
          (c.description as string) ?? null,
          c.type as string,
          (c.location_id as string) ?? null,
          (c.parent_container_id as string) ?? null,
          (c.cover_image_uri as string) ?? null,
          (c.color_tag as string) ?? null,
          Number(c.is_favorite ?? 0),
          Number(c.created_at),
          Number(c.updated_at),
          c.last_accessed_at != null ? Number(c.last_accessed_at) : null,
        ]
      );
    }

    // Restore items
    for (const item of backup.items) {
      await db.runAsync(
        `INSERT OR IGNORE INTO items
           (id, name, description, quantity, container_id, cover_image_uri, is_favorite, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          item.id as string,
          item.name as string,
          (item.description as string) ?? null,
          Number(item.quantity ?? 1),
          item.container_id as string,
          (item.cover_image_uri as string) ?? null,
          Number(item.is_favorite ?? 0),
          Number(item.created_at),
          Number(item.updated_at),
        ]
      );
    }

    // Restore relations
    for (const ct of backup.container_tags) {
      await db.runAsync(
        'INSERT OR IGNORE INTO container_tags (container_id, tag_id) VALUES (?, ?);',
        [ct.container_id as string, ct.tag_id as string]
      );
    }
    for (const it of backup.item_tags) {
      await db.runAsync(
        'INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?);',
        [it.item_id as string, it.tag_id as string]
      );
    }
  });

  return {
    imported: backup.containers.length + backup.items.length,
  };
}

// ─── Storage info ─────────────────────────────────────────────────────────────
export async function getStorageInfo() {
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
}

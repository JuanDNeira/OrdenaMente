/**
 * OrdenaMente — Export / Import utility
 *
 * Serializa la base de datos completa a JSON y restaura desde respaldo.
 *
 * Orden de insercion garantizado (respeta FK):
 *   locations -> tags -> containers (topologico) -> items
 *   -> container_tags -> item_tags -> eco_achievements
 *
 * Orden de borrado (inverso):
 *   item_tags -> container_tags -> eco_achievements
 *   -> items -> containers -> tags -> locations
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getDb } from '../database/db';
import { nowTimestamp } from './dateUtils';

// ---- Tipos ------------------------------------------------------------------

export interface BackupData {
  version: number;
  exported_at: number;
  locations: Record<string, unknown>[];
  tags: Record<string, unknown>[];
  containers: Record<string, unknown>[];
  items: Record<string, unknown>[];
  container_tags: Record<string, unknown>[];
  item_tags: Record<string, unknown>[];
  eco_achievements: Record<string, unknown>[];
}

const BACKUP_VERSION = 2;

// ---- Helpers internos -------------------------------------------------------

/**
 * Ordena contenedores topologicamente para que los padres siempre se inserten
 * antes que sus hijos. Evita FOREIGN KEY constraint en parent_container_id.
 * Algoritmo BFS desde raices (parent_container_id IS NULL).
 */
function sortContainersTopologically(
  containers: Record<string, unknown>[]
): Record<string, unknown>[] {
  const sorted: Record<string, unknown>[] = [];
  const visited = new Set<string>();

  const queue: Record<string, unknown>[] = containers.filter(
    (c) => !c.parent_container_id
  );

  while (queue.length > 0) {
    const current = queue.shift()!;
    const id = current.id as string;
    if (visited.has(id)) continue;
    visited.add(id);
    sorted.push(current);

    for (const c of containers) {
      if (c.parent_container_id === id && !visited.has(c.id as string)) {
        queue.push(c);
      }
    }
  }

  for (const c of containers) {
    if (!visited.has(c.id as string)) {
      console.warn('[Import] Contenedor huerfano o con ciclo: ' + String(c.id));
      sorted.push(c);
    }
  }

  return sorted;
}

/**
 * Valida y normaliza el backup. Lanza Error si faltan campos obligatorios.
 * Arrays opcionales se normalizan a [] si no existen.
 */
function normalizeBackup(raw: unknown): BackupData {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('El archivo no es un respaldo valido de OrdenaMente.');
  }

  const b = raw as Record<string, unknown>;

  if (!b.version) {
    throw new Error('El respaldo no tiene numero de version.');
  }
  if (!Array.isArray(b.containers)) {
    throw new Error('El respaldo no contiene la tabla de contenedores.');
  }
  if (!Array.isArray(b.items)) {
    throw new Error('El respaldo no contiene la tabla de items.');
  }

  return {
    version: Number(b.version),
    exported_at: Number(b.exported_at ?? 0),
    locations: Array.isArray(b.locations) ? b.locations : [],
    tags: Array.isArray(b.tags) ? b.tags : [],
    containers: b.containers,
    items: b.items,
    container_tags: Array.isArray(b.container_tags) ? b.container_tags : [],
    item_tags: Array.isArray(b.item_tags) ? b.item_tags : [],
    eco_achievements: Array.isArray(b.eco_achievements) ? b.eco_achievements : [],
  };
}

/**
 * Filtra relaciones FK invalidas en container_tags e item_tags.
 * Retorna solo los registros con referencias validas.
 */
function validateRelations(backup: BackupData): {
  validContainerTags: Record<string, unknown>[];
  validItemTags: Record<string, unknown>[];
  warnings: string[];
} {
  const containerIds = new Set(backup.containers.map((c) => c.id as string));
  const itemIds = new Set(backup.items.map((i) => i.id as string));
  const tagIds = new Set(backup.tags.map((t) => t.id as string));
  const warnings: string[] = [];

  const validContainerTags = backup.container_tags.filter((ct) => {
    const cid = ct.container_id as string;
    const tid = ct.tag_id as string;
    if (!containerIds.has(cid) || !tagIds.has(tid)) {
      warnings.push('container_tags: referencia invalida container=' + cid + ' tag=' + tid);
      return false;
    }
    return true;
  });

  const validItemTags = backup.item_tags.filter((it) => {
    const iid = it.item_id as string;
    const tid = it.tag_id as string;
    if (!itemIds.has(iid) || !tagIds.has(tid)) {
      warnings.push('item_tags: referencia invalida item=' + iid + ' tag=' + tid);
      return false;
    }
    return true;
  });

  return { validContainerTags, validItemTags, warnings };
}

// ---- Export -----------------------------------------------------------------

export async function exportDatabase(): Promise<string> {
  const db = getDb();

  const [locations, tags, containers, items, containerTags, itemTags, ecoAchievements] =
    await Promise.all([
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM locations;'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM tags;'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM containers;'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM items;'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM container_tags;'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM item_tags;'),
      db.getAllAsync<Record<string, unknown>>('SELECT * FROM eco_achievements;').catch(() => []),
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
    eco_achievements: ecoAchievements,
  };

  const json = JSON.stringify(backup, null, 2);
  const filename = 'san-alejo-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  const fileUri = FileSystem.cacheDirectory + filename;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: 'utf8' as FileSystem.EncodingType,
  });

  return fileUri;
}

// ---- Share ------------------------------------------------------------------

export async function shareBackup(): Promise<void> {
  const fileUri = await exportDatabase();
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Compartir no esta disponible en este dispositivo.');
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Compartir respaldo de OrdenaMente',
  });
}

// ---- Import -----------------------------------------------------------------

export interface ImportResult {
  imported: number;
  locations: number;
  tags: number;
  containers: number;
  items: number;
  ecoAchievements: number;
  warnings: string[];
}

export async function importDatabase(fileUri: string): Promise<ImportResult> {
  // 1. Leer archivo
  let content: string;
  try {
    content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'utf8' as FileSystem.EncodingType,
    });
  } catch {
    throw new Error('No se pudo leer el archivo de respaldo.');
  }

  // 2. Parsear JSON
  let rawBackup: unknown;
  try {
    rawBackup = JSON.parse(content);
  } catch {
    throw new Error('El archivo no es un JSON valido.');
  }

  // 3. Normalizar y validar estructura
  let backup: BackupData;
  try {
    backup = normalizeBackup(rawBackup);
  } catch (e) {
    throw new Error(
      e instanceof Error ? e.message : 'El archivo no es un respaldo valido de OrdenaMente.'
    );
  }

  // 4. Validar relaciones FK en junction tables
  const { validContainerTags, validItemTags, warnings } = validateRelations(backup);

  // 5. Ordenar contenedores topologicamente (padres antes que hijos)
  const sortedContainers = sortContainersTopologically(backup.containers);

  const db = getDb();

  // 6. Pre-validar que cada item.container_id exista en el backup
  const insertedContainerIds = new Set(backup.containers.map((c) => c.id as string));
  const orphanMessages: string[] = [];
  const validItems = backup.items.filter((item) => {
    const cid = item.container_id as string;
    if (!cid || !insertedContainerIds.has(cid)) {
      const msg =
        '[Import][Item] HUERFANO: "' + String(item.name) +
        '" (id=' + String(item.id) +
        ') -> container_id="' + cid + '" NO existe en el backup';
      orphanMessages.push(msg);
      return false;
    }
    return true;
  });

  if (orphanMessages.length > 0) {
    for (const msg of orphanMessages) console.warn(msg);
    console.warn('[Import] ' + orphanMessages.length + ' item(s) omitidos por container_id invalido.');
  }

  // 7. Ejecutar todo dentro de una transaccion exclusiva atomica.
  //
  // withExclusiveTransactionAsync crea una conexion SQLite DEDICADA y pasa
  // el objeto `tx` al callback. Todas las queries usan `tx`, no `db`.
  // Esto garantiza que PRAGMA foreign_keys = ON se aplica en la misma
  // conexion que ejecuta los INSERTs, sin interferencia del pool.
  //
  // expo-sqlite emite BEGIN despues de crear la conexion pero antes de
  // llamar al callback. El PRAGMA foreign_keys es el primer statement
  // del callback, lo que en SQLite equivale a configurarlo en la conexion
  // antes de cualquier operacion de datos.
  try {
    await db.withExclusiveTransactionAsync(async (tx) => {
      // Activar FK en esta conexion dedicada
      await tx.execAsync('PRAGMA foreign_keys = ON;');

      // Limpieza en orden inverso a las FK
      console.log('[Import] Limpiando datos existentes...');
      await tx.execAsync('DELETE FROM item_tags;');
      await tx.execAsync('DELETE FROM container_tags;');
      try {
        await tx.execAsync('DELETE FROM eco_achievements;');
      } catch {
        console.warn('[Import] eco_achievements no existe aun, se omite limpieza.');
      }
      await tx.execAsync('DELETE FROM items;');
      await tx.execAsync('DELETE FROM containers;');
      await tx.execAsync('DELETE FROM tags;');
      await tx.execAsync('DELETE FROM locations;');

      // 1. Locations
      console.log('[Import] Insertando ' + backup.locations.length + ' ubicaciones...');
      for (const loc of backup.locations) {
        if (!loc.id || !loc.name) {
          console.warn('[Import] Ubicacion sin id o name, se omite.');
          continue;
        }
        console.log('[Import][Location] id="' + String(loc.id) + '" name="' + String(loc.name) + '"');
        await tx.runAsync(
          'INSERT OR IGNORE INTO locations (id, name, icon, created_at) VALUES (?, ?, ?, ?);',
          [
            loc.id as string,
            loc.name as string,
            (loc.icon as string) ?? null,
            Number(loc.created_at ?? nowTimestamp()),
          ]
        );
      }

      // 2. Tags
      console.log('[Import] Insertando ' + backup.tags.length + ' etiquetas...');
      for (const tag of backup.tags) {
        if (!tag.id || !tag.name || !tag.color) {
          console.warn('[Import] Tag sin id, name o color, se omite.');
          continue;
        }
        await tx.runAsync(
          'INSERT OR IGNORE INTO tags (id, name, color) VALUES (?, ?, ?);',
          [tag.id as string, tag.name as string, tag.color as string]
        );
      }

      // 3. Containers (orden topologico)
      console.log('[Import] Insertando ' + sortedContainers.length + ' contenedores...');
      for (const c of sortedContainers) {
        if (!c.id || !c.name || !c.type) {
          console.warn('[Import] Contenedor invalido, se omite: ' + String(c.id));
          continue;
        }
        console.log(
          '[Import][Container] id="' + String(c.id) + '" name="' + String(c.name) +
          '" location_id="' + String(c.location_id ?? 'null') +
          '" parent_container_id="' + String(c.parent_container_id ?? 'null') + '"'
        );
        await tx.runAsync(
          'INSERT OR IGNORE INTO containers' +
          ' (id, name, description, type, location_id, parent_container_id,' +
          '  cover_image_uri, color_tag, is_favorite, created_at, updated_at, last_accessed_at)' +
          ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
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
            Number(c.created_at ?? nowTimestamp()),
            Number(c.updated_at ?? nowTimestamp()),
            c.last_accessed_at != null ? Number(c.last_accessed_at) : null,
          ]
        );
      }

      // 4. Items
      console.log('[Import] Insertando ' + validItems.length + ' items (' + orphanMessages.length + ' omitidos)...');
      for (const item of validItems) {
        if (!item.id || !item.name || !item.container_id) {
          console.warn('[Import][Item] Sin id/name/container_id, se omite: ' + String(item.id));
          continue;
        }
        console.log(
          '[Import][Item] id="' + String(item.id) + '" name="' + String(item.name) +
          '" container_id="' + String(item.container_id) + '"'
        );
        await tx.runAsync(
          'INSERT OR IGNORE INTO items' +
          ' (id, name, description, quantity, container_id, cover_image_uri,' +
          '  is_favorite, eco_action, eco_notes, eco_completed_at, eco_status,' +
          '  created_at, updated_at)' +
          ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);',
          [
            item.id as string,
            item.name as string,
            (item.description as string) ?? null,
            Number(item.quantity ?? 1),
            item.container_id as string,
            (item.cover_image_uri as string) ?? null,
            Number(item.is_favorite ?? 0),
            (item.eco_action as string) ?? null,
            (item.eco_notes as string) ?? null,
            item.eco_completed_at != null ? Number(item.eco_completed_at) : null,
            (item.eco_status as string) ?? null,
            Number(item.created_at ?? nowTimestamp()),
            Number(item.updated_at ?? nowTimestamp()),
          ]
        );
      }

      // 5. Container tags
      console.log('[Import] Insertando ' + validContainerTags.length + ' relaciones contenedor-etiqueta...');
      for (const ct of validContainerTags) {
        await tx.runAsync(
          'INSERT OR IGNORE INTO container_tags (container_id, tag_id) VALUES (?, ?);',
          [ct.container_id as string, ct.tag_id as string]
        );
      }

      // 6. Item tags
      console.log('[Import] Insertando ' + validItemTags.length + ' relaciones item-etiqueta...');
      for (const it of validItemTags) {
        await tx.runAsync(
          'INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?);',
          [it.item_id as string, it.tag_id as string]
        );
      }

      // 7. Eco achievements
      if (backup.eco_achievements.length > 0) {
        console.log('[Import] Insertando ' + backup.eco_achievements.length + ' logros ecologicos...');
        for (const ach of backup.eco_achievements) {
          if (!ach.id || !ach.type || !ach.unlocked_at) {
            console.warn('[Import] Logro invalido, se omite.');
            continue;
          }
          try {
            await tx.runAsync(
              'INSERT OR IGNORE INTO eco_achievements (id, type, unlocked_at, metadata) VALUES (?, ?, ?, ?);',
              [
                ach.id as string,
                ach.type as string,
                Number(ach.unlocked_at),
                (ach.metadata as string) ?? null,
              ]
            );
          } catch {
            console.warn('[Import] No se pudo insertar logro (tabla puede no existir aun).');
          }
        }
      }

      console.log('[Import] Transaccion completada y confirmada.');
    });
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    console.error('[Import] Error en transaccion: ' + raw);

    if (raw.includes('FOREIGN KEY')) {
      throw new Error(
        'El respaldo contiene relaciones invalidas entre registros. ' +
        'Verifica que el archivo no este corrupto.'
      );
    }
    if (raw.includes('UNIQUE constraint')) {
      throw new Error(
        'El respaldo contiene registros duplicados. ' +
        'Verifica que el archivo sea un respaldo valido de OrdenaMente.'
      );
    }
    if (raw.includes('NOT NULL constraint')) {
      throw new Error(
        'El respaldo tiene campos obligatorios vacios. ' +
        'El archivo puede estar incompleto o corrupto.'
      );
    }
    if (raw.includes('no column named')) {
      throw new Error(
        'El respaldo fue creado con una version mas nueva de la app. ' +
        'Actualiza la aplicacion e intenta de nuevo.'
      );
    }

    throw new Error('No se pudo importar el archivo. Verifica que sea un respaldo valido.');
  }

  const allWarnings = [...warnings, ...orphanMessages];
  if (allWarnings.length > 0) {
    console.warn('[Import] Advertencias totales: ' + allWarnings.length);
  }

  return {
    imported: backup.containers.length + validItems.length,
    locations: backup.locations.length,
    tags: backup.tags.length,
    containers: backup.containers.length,
    items: validItems.length,
    ecoAchievements: backup.eco_achievements.length,
    warnings: allWarnings,
  };
}

// ---- Storage info -----------------------------------------------------------

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

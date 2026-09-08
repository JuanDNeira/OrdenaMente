import * as SQLite from 'expo-sqlite';
import { ALL_SCHEMA_STATEMENTS } from './schema';
import { runMigrations } from './migrations';
import { generateUUID } from '../utils/uuid';
import { nowTimestamp } from '../utils/dateUtils';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!_db) {
    throw new Error('Database not initialized. Call initializeDb() first.');
  }
  return _db;
}

export async function initializeDb(): Promise<void> {
  if (_db) return;

  _db = await SQLite.openDatabaseAsync('san-alejo.db');

  // Enable WAL mode and foreign keys
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync('PRAGMA foreign_keys = ON;');

  // Create all tables
  for (const statement of ALL_SCHEMA_STATEMENTS) {
    await _db.execAsync(statement);
  }

  // Run pending migrations
  await runMigrations(_db);

  // Seed default location if not present
  await seedDefaultLocation(_db);
}

async function seedDefaultLocation(db: SQLite.SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM locations WHERE name = 'Sin ubicación' LIMIT 1;"
  );
  if (!existing) {
    await db.runAsync(
      'INSERT INTO locations (id, name, icon, created_at) VALUES (?, ?, ?, ?);',
      [generateUUID(), 'Sin ubicación', 'home-outline', nowTimestamp()]
    );
  }
}

export async function closeDb(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
}

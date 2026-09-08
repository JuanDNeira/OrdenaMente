import type { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
}

// Version 1 is the initial schema — handled by initializeDb() in db.ts.
export const migrations: Migration[] = [
  {
    // v2: add is_favorite to containers and items
    version: 2,
    up: async (db) => {
      await db.execAsync(
        'ALTER TABLE containers ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;'
      );
      await db.execAsync(
        'ALTER TABLE items ADD COLUMN is_favorite INTEGER NOT NULL DEFAULT 0;'
      );
    },
  },
  {
    // v4: ecological fields on items + eco_achievements table + eco indexes
    version: 4,
    up: async (db) => {
      await db.withTransactionAsync(async () => {
        // ── Campos ecológicos en items ──────────────────────────────────────
        // ALTER TABLE ADD COLUMN nunca modifica filas existentes; los registros
        // previos quedan con NULL en estos campos, lo que es válido por diseño.
        await db.execAsync(
          "ALTER TABLE items ADD COLUMN eco_action TEXT DEFAULT NULL " +
          "CHECK(eco_action IN ('recycle','donate','sell','reuse','repair','discard') OR eco_action IS NULL);"
        );
        await db.execAsync(
          'ALTER TABLE items ADD COLUMN eco_notes TEXT DEFAULT NULL;'
        );
        await db.execAsync(
          'ALTER TABLE items ADD COLUMN eco_completed_at INTEGER DEFAULT NULL;'
        );
        await db.execAsync(
          "ALTER TABLE items ADD COLUMN eco_status TEXT DEFAULT NULL " +
          "CHECK(eco_status IN ('pending','completed','skipped') OR eco_status IS NULL);"
        );

        // ── Tabla de logros ecológicos ──────────────────────────────────────
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS eco_achievements (
            id          TEXT PRIMARY KEY,
            type        TEXT NOT NULL CHECK(type IN (
                          'first_rescue','guardian_verde','eco_heroe',
                          'maestro_reciclaje','leyenda_sostenible','campeon_planeta'
                        )),
            unlocked_at INTEGER NOT NULL,
            metadata    TEXT
          );
        `);

        // ── Índices para búsquedas ecológicas frecuentes ────────────────────
        // idx_items_eco_action: findByEcoAction(), filtros en SearchScreen,
        //   y también beneficia findUnclassified (eco_action IS NULL)
        await db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_items_eco_action ON items(eco_action);'
        );
        // idx_items_eco_status: findPending(), findCompleted(), getEcoStats()
        await db.execAsync(
          'CREATE INDEX IF NOT EXISTS idx_items_eco_status ON items(eco_status);'
        );
      });
    },
  },
  {
    // v3: performance indexes for frequent queries
    version: 3,
    up: async (db) => {
      // Containers: favorites, location, parent, updated_at sort
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_containers_is_favorite ON containers(is_favorite);'
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_containers_location_id ON containers(location_id);'
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_containers_parent_id ON containers(parent_container_id);'
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_containers_updated_at ON containers(updated_at DESC);'
      );
      // Items: container lookup, favorites, search
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_items_container_id ON items(container_id);'
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_items_is_favorite ON items(is_favorite);'
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);'
      );
      // Tags: name search
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);'
      );
      // Junction tables
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_container_tags_tag_id ON container_tags(tag_id);'
      );
      await db.execAsync(
        'CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags(tag_id);'
      );
    },
  },
];

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version    INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM _migrations ORDER BY version ASC;'
  );
  const appliedVersions = new Set(applied.map((r) => r.version));

  for (const migration of migrations) {
    if (!appliedVersions.has(migration.version)) {
      await migration.up(db);
      await db.runAsync(
        'INSERT INTO _migrations (version, applied_at) VALUES (?, ?);',
        [migration.version, Date.now()]
      );
    }
  }
}

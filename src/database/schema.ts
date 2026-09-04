export const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS _migrations (
    version    INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
  );
`;

export const CREATE_LOCATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS locations (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    icon       TEXT,
    created_at INTEGER NOT NULL
  );
`;

export const CREATE_CONTAINERS_TABLE = `
  CREATE TABLE IF NOT EXISTS containers (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    description          TEXT,
    type                 TEXT NOT NULL CHECK(type IN ('box','suitcase','drawer','shelf','bag','other')),
    location_id          TEXT REFERENCES locations(id) ON DELETE SET NULL,
    parent_container_id  TEXT REFERENCES containers(id) ON DELETE CASCADE,
    cover_image_uri      TEXT,
    color_tag            TEXT,
    created_at           INTEGER NOT NULL,
    updated_at           INTEGER NOT NULL,
    last_accessed_at     INTEGER
  );
`;

export const CREATE_ITEMS_TABLE = `
  CREATE TABLE IF NOT EXISTS items (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    description      TEXT,
    quantity         INTEGER NOT NULL DEFAULT 1,
    container_id     TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    cover_image_uri  TEXT,
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER NOT NULL
  );
`;

export const CREATE_TAGS_TABLE = `
  CREATE TABLE IF NOT EXISTS tags (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
  );
`;

export const CREATE_CONTAINER_TAGS_TABLE = `
  CREATE TABLE IF NOT EXISTS container_tags (
    container_id TEXT NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
    tag_id       TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (container_id, tag_id)
  );
`;

export const CREATE_ITEM_TAGS_TABLE = `
  CREATE TABLE IF NOT EXISTS item_tags (
    item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
  );
`;

export const ALL_SCHEMA_STATEMENTS = [
  CREATE_MIGRATIONS_TABLE,
  CREATE_LOCATIONS_TABLE,
  CREATE_CONTAINERS_TABLE,
  CREATE_ITEMS_TABLE,
  CREATE_TAGS_TABLE,
  CREATE_CONTAINER_TAGS_TABLE,
  CREATE_ITEM_TAGS_TABLE,
];

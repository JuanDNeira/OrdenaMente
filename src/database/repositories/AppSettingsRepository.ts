/**
 * AppSettingsRepository.ts
 *
 * Repositorio de la tabla `app_settings` (migración v5).
 * Almacena preferencias de funciones emergentes como pares clave/valor TEXT.
 *
 * Convenciones:
 *   - Los valores booleanos se guardan como '0' o '1'.
 *   - get() devuelve null si la clave no existe; usa getOrDefault() para
 *     obtener un valor de respaldo sin condicionales en el llamador.
 *   - set() usa INSERT OR REPLACE para ser idempotente.
 */

import { getDb } from '../db';
import { nowTimestamp } from '../../utils/dateUtils';

// ─── Claves de ajustes conocidas ──────────────────────────────────────────────
// Ampliar aquí cuando las fases B, C y E añadan nuevas claves.
export type AppSettingKey =
  | 'cv_enabled'           // Computer Vision habilitada (Fase B)
  | 'cv_consent_given'     // Consentimiento del usuario para enviar fotos
  | 'ble_enabled'          // Beacons BLE habilitados (Fase C)
  | 'ble_simulated_mode';  // Modo simulado de beacons activo (Fase C)

// Valores por defecto tipados — deben coincidir con los INSERT de la migración v5
const DEFAULTS: Record<AppSettingKey, string> = {
  cv_enabled:          '0',
  cv_consent_given:    '0',
  ble_enabled:         '0',
  ble_simulated_mode:  '0',
};

export const AppSettingsRepository = {
  /**
   * Devuelve el valor crudo de un ajuste, o null si no existe en la tabla.
   */
  async get(key: AppSettingKey): Promise<string | null> {
    const db = getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?;',
      [key]
    );
    return row?.value ?? null;
  },

  /**
   * Devuelve el valor del ajuste, o el valor por defecto definido en DEFAULTS
   * si la clave no existe en la tabla.
   */
  async getOrDefault(key: AppSettingKey): Promise<string> {
    const value = await this.get(key);
    return value ?? DEFAULTS[key];
  },

  /**
   * Lee un ajuste booleano ('0'|'1') y lo devuelve como boolean.
   * Si la clave no existe, devuelve false (equivalente al valor por defecto '0').
   */
  async getBool(key: AppSettingKey): Promise<boolean> {
    const value = await this.getOrDefault(key);
    return value === '1';
  },

  /**
   * Escribe o actualiza un ajuste (INSERT OR REPLACE).
   */
  async set(key: AppSettingKey, value: string): Promise<void> {
    const db = getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?);`,
      [key, value, nowTimestamp()]
    );
  },

  /**
   * Escribe un ajuste booleano como '0' o '1'.
   */
  async setBool(key: AppSettingKey, value: boolean): Promise<void> {
    await this.set(key, value ? '1' : '0');
  },

  /**
   * Lee todos los ajustes de la tabla como un objeto plano.
   * Útil para cargar el estado inicial del store.
   */
  async getAll(): Promise<Partial<Record<AppSettingKey, string>>> {
    const db = getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM app_settings;'
    );
    const result: Partial<Record<AppSettingKey, string>> = {};
    for (const row of rows) {
      result[row.key as AppSettingKey] = row.value;
    }
    return result;
  },
};

/**
 * learnedNames.ts — Memoria local que aprende de las correcciones del usuario.
 *
 * El modelo no puede reconocer objetos que no estaban en su entrenamiento
 * (tenedor, cargador…). Pero el usuario sí sabe cómo se llaman: cuando guarda
 * un ítem con foto, recordamos qué etiquetas del modelo vio y qué nombre eligió.
 * La próxima vez que aparezcan etiquetas parecidas, ese nombre se sugiere primero.
 *
 * Todo se guarda en el dispositivo (AsyncStorage). No se envía nada fuera.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'vision_learned_v1';
const TOP_LABELS_USED = 4;       // cuántas etiquetas del modelo se asocian al nombre
const MIN_LABEL_SCORE = 0.04;    // ignorar etiquetas casi irrelevantes
const MAX_LABELS_STORED = 400;   // límite para no crecer indefinidamente
const MAX_NAMES_PER_LABEL = 8;

/** etiqueta del modelo → { nombre elegido → veces } */
type Store = Record<string, Record<string, number>>;

export interface RawLabel {
  label: string;
  score: number;
}

async function readStore(): Promise<Store> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? (JSON.parse(json) as Store) : {};
  } catch {
    return {};
  }
}

async function writeStore(store: Store): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // La memoria es opcional: un fallo aquí nunca debe afectar al usuario.
  }
}

function topLabels(raw: RawLabel[]): RawLabel[] {
  return [...raw]
    .filter((r) => r.score >= MIN_LABEL_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_LABELS_USED);
}

/**
 * Registra que, ante estas etiquetas del modelo, el usuario eligió `name`.
 * Llamar al guardar un ítem con foto analizada.
 */
export async function learnFromChoice(raw: RawLabel[], name: string): Promise<void> {
  const clean = name.trim();
  if (!clean || raw.length === 0) return;

  const store = await readStore();
  for (const { label } of topLabels(raw)) {
    const names = (store[label] ??= {});
    names[clean] = (names[clean] ?? 0) + 1;

    // Conservar solo los nombres más frecuentes de esa etiqueta
    const entries = Object.entries(names).sort((a, b) => b[1] - a[1]);
    store[label] = Object.fromEntries(entries.slice(0, MAX_NAMES_PER_LABEL));
  }

  const labels = Object.keys(store);
  if (labels.length > MAX_LABELS_STORED) {
    // Descartar las etiquetas con menos aprendizaje acumulado
    const total = (l: string) => Object.values(store[l]).reduce((a, b) => a + b, 0);
    labels.sort((a, b) => total(a) - total(b));
    for (const l of labels.slice(0, labels.length - MAX_LABELS_STORED)) delete store[l];
  }
  await writeStore(store);
}

/**
 * Nombres que el usuario ya usó ante etiquetas parecidas, del más probable al
 * menos probable. Devuelve [] si no hay historial relevante.
 */
export async function getLearnedNames(raw: RawLabel[], limit = 2): Promise<string[]> {
  if (raw.length === 0) return [];
  const store = await readStore();
  const scores = new Map<string, number>();

  for (const { label, score } of topLabels(raw)) {
    const names = store[label];
    if (!names) continue;
    for (const [name, count] of Object.entries(names)) {
      scores.set(name, (scores.get(name) ?? 0) + score * Math.min(count, 5));
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name]) => name);
}

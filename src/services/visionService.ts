/**
 * visionService.ts — Reconocimiento local de objetos con ML Kit Image Labeling.
 *
 * Motor: @infinitered/react-native-mlkit-image-labeling@^5.0.0
 * Modelo: MobileNet V3 Small (.tflite, ~3 MB, Apache 2.0)
 *         → assets/models/mobilenet_v3.tflite
 *
 * Características:
 *   - 100 % on-device: ninguna imagen sale del dispositivo.
 *   - Sin API key, sin cuota, sin costo.
 *   - Funciona offline una vez instalado el build.
 *   - El modelo se carga una sola vez (singleton) al primer análisis.
 *   - Si el modelo no está disponible, devuelve null (degradación limpia).
 *
 * ─── REQUISITO DE COMPILACIÓN ────────────────────────────────────────────────
 * Este servicio usa un módulo nativo (Expo Module). Necesita development build;
 * no funciona en Expo Go.
 * Ver instrucciones de descarga del modelo en: assets/models/README.md
 *
 * ─── DEPENDENCIA DE FASE E ───────────────────────────────────────────────────
 * PROXY_URL queda como placeholder vacío para la Fase E (sync en nube).
 * En esa fase, si se decide enviar análisis al backend, se activa aquí.
 * Por ahora permanece vacío y el análisis siempre es local.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import RNMLKitImageLabeler from '@infinitered/react-native-mlkit-image-labeling';
import { conceptsForLabel, CONCEPT_WEIGHTS } from './objectCatalog';

// ─── Placeholder para Fase E (no se usa actualmente) ─────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const PROXY_URL = '';

// ─── Configuración del modelo ─────────────────────────────────────────────────

const MODEL_NAME = 'mobilenet_v3_small';
const MAX_RESULTS = 15;
const CONFIDENCE_THRESHOLD = 0.02; // umbral muy bajo: la agregación filtra el ruido
const MODEL_ASSET = require('../../assets/models/mobilenet_v3.tflite');

// ─── Estado del singleton ─────────────────────────────────────────────────────

let modelReady = false;
let modelLoadPromise: Promise<boolean> | null = null;

// ─── Tipos públicos ───────────────────────────────────────────────────────────

/** Una etiqueta reconocida por ML Kit. */
export interface VisionLabel {
  /** Descripción en inglés (ej: "Spatula", "Kitchen utensil"). */
  description: string;
  /** Confianza de 0 a 1. */
  score: number;
  /** No usado en ML Kit local; mantenido por compatibilidad con ecoMapping. */
  mid?: string;
}

/** Resultado completo del análisis. */
export interface VisionResult {
  /** Etiquetas ordenadas por score descendente. */
  labels: VisionLabel[];
  /** Nombre sugerido (primera etiqueta con score > 0.5, traducida al español). */
  suggestedName: string;
  /** Alias de labels — mantenido para compatibilidad con ecoMapping.ts. */
  rawLabels: VisionLabel[];
  /** Etiquetas originales del modelo (inglés), solo para la memoria de aprendizaje. */
  raw: Array<{ label: string; score: number }>;
}

// ─── Traducción y agrupación ──────────────────────────────────────────────────
// Las etiquetas de ImageNet (inglés) se convierten en CONCEPTOS en español
// mediante objectCatalog.ts. Lo que no esté en el catálogo se descarta:
// la app es 100 % en español y nunca debe mostrar una etiqueta en inglés.

/** Compatibilidad: las etiquetas ya salen en español, así que no hay nada que traducir. */
export function translateLabel(description: string): string {
  return description;
}

/** Pesos de cada vista al promediar (completa, cuadrada, zoom al centro). */
const VIEW_WEIGHTS = [0.3, 0.4, 0.3];

interface RawScore {
  label: string;
  score: number;
}

/**
 * Prepara hasta 3 vistas de la misma foto. El modelo trabaja con imágenes
 * cuadradas: una foto alargada (p. ej. un tenedor) se deformaría, así que se
 * añaden un recorte cuadrado centrado y otro más cercano al objeto.
 * Todas se reducen para acelerar el análisis.
 */
async function buildViews(imageUri: string): Promise<string[]> {
  const views: string[] = [imageUri];
  try {
    const base = await ImageManipulator.manipulateAsync(imageUri, [], {
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const { width, height } = base;
    const side = Math.min(width, height);
    const square = {
      originX: Math.round((width - side) / 2),
      originY: Math.round((height - side) / 2),
      width: side,
      height: side,
    };
    const zoomSide = Math.round(side * 0.6);
    const zoom = {
      originX: Math.round((width - zoomSide) / 2),
      originY: Math.round((height - zoomSide) / 2),
      width: zoomSide,
      height: zoomSide,
    };

    for (const crop of [square, zoom]) {
      const out = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop }, { resize: { width: 320 } }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 0.9 }
      );
      views.push(out.uri);
    }
  } catch (err) {
    if (__DEV__) console.warn('[VisionService] No se pudieron generar recortes:', err);
  }
  return views;
}

/** Garantiza el prefijo file:// (Android usa URL(path).openStream()). */
function toFileUrl(uri: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(uri) ? uri : `file://${uri}`;
}

/** Combina las pasadas del modelo en un único puntaje por etiqueta. */
function mergeViews(perView: RawScore[][]): RawScore[] {
  const weights = perView.length === VIEW_WEIGHTS.length
    ? VIEW_WEIGHTS
    : perView.map(() => 1 / perView.length);
  const total = weights.reduce((a, b) => a + b, 0);
  const acc = new Map<string, number>();
  perView.forEach((labels, i) => {
    for (const { label, score } of labels) {
      acc.set(label, (acc.get(label) ?? 0) + (score * weights[i]) / total);
    }
  });
  return [...acc.entries()]
    .map(([label, score]) => ({ label, score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Suma la evidencia de todas las etiquetas por concepto en español.
 * "cleaver" + "letter opener" + "hatchet" → "Cuchillo" gana por acumulación.
 */
export function aggregateConcepts(raw: RawScore[]): VisionLabel[] {
  const scores = new Map<string, number>();
  for (const { label, score } of raw) {
    if (label.toLowerCase() === 'background') continue;
    conceptsForLabel(label).forEach((concept, idx) => {
      scores.set(concept, (scores.get(concept) ?? 0) + score * CONCEPT_WEIGHTS[idx]);
    });
  }
  return [...scores.entries()]
    .map(([description, score]) => ({ description, score: Math.min(1, score) }))
    .filter((l) => l.score >= 0.03)
    .sort((a, b) => b.score - a.score);
}

// ─── Carga del modelo (singleton) ─────────────────────────────────────────────

/**
 * Carga el modelo MobileNet V3 desde assets al directorio de documentos
 * del dispositivo y lo registra en el módulo ML Kit.
 * Se ejecuta solo una vez; las llamadas posteriores reutilizan la promesa.
 */
async function ensureModelLoaded(): Promise<boolean> {
  if (modelReady) return true;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    try {
      // 1. Resolver el asset y asegurarse de que esté disponible localmente
      const [asset] = await Asset.loadAsync(MODEL_ASSET);

      if (!asset.localUri) {
        throw new Error('El asset del modelo no tiene localUri tras loadAsync.');
      }

      // 2. Copiar al directorio de documentos para obtener una ruta absoluta
      //    El módulo Kotlin necesita file:// path sin query strings ni hashes
      const destFile = new File(Paths.document, `${MODEL_NAME}.tflite`);

      if (!destFile.exists) {
        const sourceFile = new File(asset.localUri);
        sourceFile.copy(destFile);
      }

      // 3. Registrar el modelo — destFile.uri es tipo file:///...
      await RNMLKitImageLabeler.loadModel({
        modelName: MODEL_NAME,
        modelPath: destFile.uri,
        options: {
          maxResultCount: MAX_RESULTS,
          confidenceThreshold: CONFIDENCE_THRESHOLD,
        },
      });

      modelReady = true;
      return true;
    } catch (err) {
      modelLoadPromise = null;
      if (__DEV__) {
        console.warn('[VisionService] No se pudo cargar el modelo ML Kit:', err);
      }
      return false;
    }
  })();

  return modelLoadPromise;
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Analiza una imagen localmente y devuelve etiquetas + nombre sugerido.
 *
 * @param imageUri  URI local de la imagen (file://…)
 * @returns VisionResult con sugerencias, o null si el análisis falló.
 *
 * Nunca lanza excepción al llamador — los fallos devuelven null.
 * El ítem puede guardarse sin necesidad de que el análisis tenga éxito.
 */
export async function analyzeImage(
  imageUri: string
): Promise<VisionResult | null> {
  try {
    const loaded = await ensureModelLoaded();
    if (!loaded) return null;

    // Varias vistas de la misma foto; si una falla, se sigue con las demás
    const views = await buildViews(imageUri);
    const perView: RawScore[][] = [];
    for (const view of views) {
      try {
        const res = await RNMLKitImageLabeler.classifyImage(MODEL_NAME, toFileUrl(view));
        perView.push((res ?? []).map((r) => ({ label: r.text, score: r.confidence })));
      } catch (err) {
        if (__DEV__) console.warn('[VisionService] Vista fallida:', err);
      }
    }
    if (perView.length === 0) return null;

    const raw = mergeViews(perView);
    const labels = aggregateConcepts(raw);
    if (__DEV__) {
      console.log(
        '[VisionService] ImageNet:',
        raw.slice(0, 5).map((r) => `${r.label} ${(r.score * 100).toFixed(0)}%`).join(', '),
        '→ Conceptos:',
        labels.slice(0, 3).map((l) => `${l.description} ${(l.score * 100).toFixed(0)}%`).join(', ')
      );
    }

    // Sin conceptos de hogar reconocibles: labels queda vacío (la UI avisa y no
    // sugiere nada absurdo), pero se devuelve `raw` para que la memoria pueda
    // aprender el nombre que el usuario escriba.
    return {
      labels,
      suggestedName: labels[0]?.description ?? '',
      rawLabels: labels,
      raw: raw.slice(0, 12),
    };
  } catch (err) {
    if (__DEV__) {
      console.warn('[VisionService] analyzeImage falló:', err);
    }
    return null;
  }
}

/**
 * Devuelve true si el módulo ML Kit está disponible.
 * En Expo Go siempre devuelve false (módulo nativo no disponible).
 * En development/production build devuelve true una vez instalado el modelo.
 */
export function isVisionAvailable(): boolean {
  // El módulo existe en el bundle si el build lo incluyó.
  // requireNativeModule lanzaría un error al importar si no estuviera disponible,
  // así que aquí simplemente devolvemos true para builds nativos.
  // El modelo puede no estar cargado aún, pero ensureModelLoaded lo manejará.
  try {
    // Verificar que el módulo nativo está registrado
    return typeof RNMLKitImageLabeler.classifyImage === 'function';
  } catch {
    return false;
  }
}

/**
 * Pre-carga el modelo en segundo plano.
 * Llamar opcionalmente desde AppProvider para que el primer análisis
 * sea más rápido. No bloquea el arranque de la app.
 */
export function preloadModel(): void {
  ensureModelLoaded().catch(() => {
    // silencioso — el análisis lazy lo reintentará
  });
}

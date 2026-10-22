/**
 * ecoMapping.ts — Mapeo de etiquetas de Computer Vision → EcoAction sugerida.
 *
 * Lógica:
 *   1. Para cada etiqueta reconocida (en inglés, tal como las devuelve Cloud Vision)
 *      se busca una regla de mapeo por palabra clave (substring, case-insensitive).
 *   2. Se aplica la primera regla cuya clave aparezca en CUALQUIERA de las etiquetas
 *      con score > MIN_SCORE, ponderando por score.
 *   3. Si ninguna regla coincide, se devuelve 'reuse' como acción por defecto
 *      (reutilizar es siempre mejor que desechar cuando no hay certeza).
 *
 * El mapeo intencionalmente NO es perfecto: es una sugerencia que el usuario
 * siempre puede corregir. Preferimos sugerir en exceso a no sugerir nada.
 *
 * Tests: ver __tests__/ecoMapping.test.ts
 */

import type { EcoAction } from '../types/Item';
import type { VisionLabel } from '../services/visionService';
import { ecoActionForConcept, isKnownConcept } from '../services/objectCatalog';

// ─── Configuración ────────────────────────────────────────────────────────────

/** Score mínimo para que una etiqueta influya en el mapeo. */
const MIN_SCORE = 0.55;

// ─── Reglas de mapeo ──────────────────────────────────────────────────────────

/**
 * Cada regla: lista de palabras clave (inglés, minúsculas) → EcoAction.
 * El orden importa: se evalúa de arriba a abajo y se toma la primera coincidencia.
 *
 * Criterio de ordenación:
 *   - Primero las más específicas (electrónica rota → reparar)
 *   - Luego las más generales (ropa → donar)
 *   - Al final el fallback implícito en suggestEcoAction()
 */
const ECO_RULES: Array<{ keywords: string[]; action: EcoAction }> = [
  // ── Utensilios de cocina: van PRIMERO para que "can opener" (abrelatas) no
  //    se confunda con "can" (lata) y termine sugiriendo reciclar.
  {
    keywords: [
      'opener', 'spoon', 'fork', 'knife', 'ladle', 'spatula', 'whisk',
      'tongs', 'peeler', 'grater', 'colander', 'strainer', 'utensil',
      'cutlery', 'chopstick', 'hook', 'hanger',
    ],
    action: 'reuse',
  },
  // ── Reciclar: materiales que tienen proceso de reciclaje definido ──────────
  {
    keywords: [
      'plastic bottle', 'bottle', 'can', 'aluminum', 'glass',
      'paper', 'cardboard', 'newspaper', 'magazine', 'carton',
      'packaging', 'wrapper',
    ],
    action: 'recycle',
  },
  // ── Reparar: electrónica y objetos con valor funcional evidente ───────────
  {
    keywords: [
      'mobile phone', 'smartphone', 'laptop', 'computer', 'tablet',
      'camera', 'headphones', 'electronic', 'device', 'gadget',
      'appliance', 'machine', 'tool', 'bicycle', 'vehicle',
      'watch', 'clock',
    ],
    action: 'repair',
  },
  // ── Vender: artículos con valor de reventa claro ──────────────────────────
  {
    keywords: [
      'furniture', 'chair', 'table', 'sofa', 'desk',
      'television', 'speaker', 'instrument', 'musical',
      'video game', 'console', 'collector',
    ],
    action: 'sell',
  },
  // ── Donar: ropa, juguetes, libros y artículos de primera necesidad ─────────
  {
    keywords: [
      'clothing', 'shirt', 'pants', 'dress', 'shoe', 'coat',
      'jacket', 'sneakers', 'fashion', 'textile', 'fabric',
      'toy', 'doll', 'game', 'puzzle', 'book', 'novel',
      'bag', 'backpack', 'luggage',
    ],
    action: 'donate',
  },
  // ── Reutilizar: contenedores, accesorios y artículos de hogar en buen estado
  {
    keywords: [
      'box', 'container', 'jar', 'tote', 'basket',
      'cup', 'mug', 'pot', 'pan', 'kitchenware',
      'lamp', 'light', 'decoration', 'frame', 'plant',
      'umbrella', 'glasses', 'sunglasses',
    ],
    action: 'reuse',
  },
  // ── Desechar: materiales de difícil reciclaje o peligrosos ────────────────
  {
    keywords: [
      'battery', 'chemical', 'paint', 'toxic', 'waste',
      'broken glass', 'diaper', 'medical',
    ],
    action: 'discard',
  },
];

// ─── Lógica principal ─────────────────────────────────────────────────────────

/**
 * Busca `keyword` como palabra completa (admite plural simple: s / es).
 * Antes se usaba includes(), y "can" coincidía dentro de "scanner",
 * "pecan" o "can opener", generando sugerencias absurdas.
 */
function containsWord(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${escaped}(s|es)?($|[^a-z])`).test(text);
}

/**
 * Sugiere una EcoAction a partir de las etiquetas de Cloud Vision.
 *
 * @param labels  Etiquetas tal como vienen de VisionResult.rawLabels
 * @returns EcoAction sugerida, o null si no hay etiquetas válidas.
 *
 * Devuelve null (no 'reuse') cuando labels está vacío, para que la UI
 * sepa que no hay sugerencia y no muestre un chip preseleccionado.
 */
export function suggestEcoAction(labels: VisionLabel[]): EcoAction | null {
  // 1) Conceptos en español del catálogo: la primera etiqueta con acción conocida;
  //    si el concepto es del catálogo pero sin regla propia, reutilizar.
  for (const l of labels) {
    const action = ecoActionForConcept(l.description);
    if (action) return action;
  }
  if (labels.length > 0 && isKnownConcept(labels[0].description)) return 'reuse';

  // 2) Compatibilidad: etiquetas en inglés con reglas por palabra clave
  const filtered = labels.filter((l) => l.score >= MIN_SCORE);
  if (filtered.length === 0) return null;

  // Construir un string de búsqueda ponderado:
  // concatenar todas las descripciones (en minúsculas) para buscar coincidencias
  const searchText = filtered
    .map((l) => l.description.toLowerCase())
    .join(' | ');

  for (const rule of ECO_RULES) {
    const matches = rule.keywords.some((kw) => containsWord(searchText, kw));
    if (matches) {
      return rule.action;
    }
  }

  // Fallback: si reconocemos algo pero no hay regla específica, sugerir reutilizar
  return 'reuse';
}

/**
 * Devuelve una frase explicativa corta para mostrar junto a la sugerencia eco.
 * Ayuda al usuario a entender por qué se sugiere esa acción.
 */
export function getEcoSuggestionReason(
  action: EcoAction,
  topLabel: string
): string {
  const label = topLabel.toLowerCase();

  switch (action) {
    case 'recycle':
      return `"${topLabel}" suele ser reciclable. Verifícalo en tu punto de reciclaje local.`;
    case 'repair':
      return `Los dispositivos como "${topLabel}" tienen larga vida útil si se reparan.`;
    case 'sell':
      return `"${topLabel}" puede tener valor de reventa en plataformas de segunda mano.`;
    case 'donate':
      return `La ropa, libros y juguetes como "${label}" son muy bienvenidos en donaciones.`;
    case 'reuse':
      return `"${topLabel}" puede reutilizarse en casa de forma creativa antes de desecharse.`;
    case 'discard':
      return `"${topLabel}" puede requerir un punto de recolección especial para desecharse.`;
  }
}

/**
 * Devuelve el nombre de la categoría/etiqueta más relevante para mostrar en la UI.
 * Usa la primera etiqueta con score > 0.7 o la primera disponible.
 */
export function getTopLabelName(labels: VisionLabel[]): string {
  const top = labels.find((l) => l.score > 0.7) ?? labels[0];
  return top?.description ?? '';
}
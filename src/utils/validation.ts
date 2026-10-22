export function validateName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return 'El nombre no puede estar vacío.';
  }
  if (name.trim().length > 100) {
    return 'El nombre no puede superar los 100 caracteres.';
  }
  return null;
}

export function validateContainerName(name: string): string | null {
  return validateName(name);
}

export function validateItemName(name: string): string | null {
  return validateName(name);
}

export function validateQuantity(quantity: number): string | null {
  if (!Number.isInteger(quantity)) {
    return 'La cantidad debe ser un número entero.';
  }
  if (quantity < 0) {
    return 'La cantidad no puede ser negativa.';
  }
  return null;
}

export function validateLocationName(name: string): string | null {
  return validateName(name);
}

export function validateTagName(name: string): string | null {
  return validateName(name);
}

// ─── Validadores para Computer Vision (Fase B) ────────────────────────────────

/**
 * Valida que una URI de imagen local sea utilizable para el análisis CV.
 * No verifica que el archivo exista en disco (eso lo hace expo-file-system).
 */
export function validateImageUri(uri: string | undefined): string | null {
  if (!uri || uri.trim().length === 0) {
    return 'No se ha seleccionado ninguna imagen.';
  }
  // Acepta rutas file://, content:// (Android) y ph:// (iOS Photos)
  const validPrefixes = ['file://', 'content://', 'ph://'];
  const hasValidPrefix = validPrefixes.some((p) => uri.startsWith(p));
  if (!hasValidPrefix) {
    return 'El formato de la imagen no es válido.';
  }
  return null;
}

/**
 * Valida que un nombre de ítem sugerido por CV sea aceptable antes de
 * pre-rellenarlo en el formulario.
 * Más permisivo que validateItemName: acepta nombres más cortos,
 * pero rechaza strings vacíos o con solo espacios.
 */
export function validateCvSuggestedName(name: string | undefined): string | null {
  if (!name || name.trim().length === 0) return 'Sugerencia de nombre vacía.';
  if (name.trim().length > 100) return 'Nombre sugerido demasiado largo.';
  return null;
}

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

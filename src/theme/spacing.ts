/**
 * San Alejo — Sistema de espaciado
 * Base: 4px — escala consistente y predecible
 */

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

export const BorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const IconSize = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
  '2xl': 40,
} as const;

// Tamaños de componentes estándar
export const ComponentSize = {
  buttonHeight: 52,
  buttonHeightSm: 40,
  inputHeight: 52,
  tabBarHeight: 64,
  headerHeight: 56,
  cardMinHeight: 120,
  avatarSm: 32,
  avatarMd: 48,
  avatarLg: 64,
} as const;

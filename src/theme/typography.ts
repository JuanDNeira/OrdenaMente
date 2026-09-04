/**
 * San Alejo — Sistema tipográfico
 * Fuente: Inter (ya cargada en AppProvider)
 * Escala modular basada en 4px
 *
 * NOTA: lineHeight y letterSpacing usan valores enteros redondeados
 * para compatibilidad con la nueva arquitectura de React Native en Android.
 */

export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

// LineHeight values — exported for direct use when needed
export const LineHeight = {
  tight: 16,
  snug: 20,
  normal: 24,
  relaxed: 28,
  loose: 32,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,
  '5xl': 48,
} as const;

// letterSpacing: solo enteros o 0 — la nueva arch de RN no acepta decimales en Android
export const LetterSpacing = {
  tight: -1,
  normal: 0,
  wide: 1,
  wider: 1,
  widest: 2,
} as const;

// Estilos tipográficos predefinidos
// lineHeight: Math.round() para garantizar enteros — evita crash en nueva arch Android
export const TextStyles = {
  // Títulos
  displayLarge: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    letterSpacing: LetterSpacing.tight,
    lineHeight: 48,
  },
  displayMedium: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    letterSpacing: LetterSpacing.tight,
    lineHeight: 40,
  },
  headingLarge: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    letterSpacing: LetterSpacing.tight,
    lineHeight: 36,
  },
  headingMedium: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xl,
    letterSpacing: LetterSpacing.tight,
    lineHeight: 32,
  },
  headingSmall: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    letterSpacing: LetterSpacing.normal,
    lineHeight: 28,
  },
  // Cuerpo
  bodyLarge: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    letterSpacing: LetterSpacing.normal,
    lineHeight: 26,
  },
  bodyMedium: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    letterSpacing: LetterSpacing.normal,
    lineHeight: 22,
  },
  bodySmall: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    letterSpacing: LetterSpacing.normal,
    lineHeight: 20,
  },
  // Labels
  labelLarge: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    letterSpacing: LetterSpacing.wide,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    letterSpacing: LetterSpacing.wide,
    lineHeight: 18,
  },
  labelSmall: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    letterSpacing: LetterSpacing.wider,
    lineHeight: 16,
  },
  // Caption
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    letterSpacing: LetterSpacing.normal,
    lineHeight: 16,
  },
} as const;

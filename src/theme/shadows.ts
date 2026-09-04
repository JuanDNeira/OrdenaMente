/**
 * San Alejo — Sistema de sombras
 * Nueva arquitectura RN: se evita Platform.select con spread
 * para no inyectar undefined en props de estilo en Android.
 */

import { Platform } from 'react-native';

// En Android solo usamos elevation (número entero).
// En iOS usamos shadowColor/shadowOpacity/shadowRadius/shadowOffset.
// Nunca mezclamos ambos en el mismo objeto — eso causa el cast error.

const IS_IOS = Platform.OS === 'ios';

function shadow(elevation: number, iosRadius: number, iosOffsetY: number) {
  if (IS_IOS) {
    return {
      shadowColor: '#000000',
      shadowOpacity: 0.4,
      shadowRadius: iosRadius,
      shadowOffset: { width: 0, height: iosOffsetY },
    };
  }
  return { elevation };
}

function shadowColored(color: string, elevation: number, iosRadius: number, iosOffsetY: number) {
  if (IS_IOS) {
    return {
      shadowColor: color,
      shadowOpacity: 0.4,
      shadowRadius: iosRadius,
      shadowOffset: { width: 0, height: iosOffsetY },
    };
  }
  return { elevation };
}

export const Shadows = {
  none: {},
  sm: shadow(2, 4, 2),
  md: shadow(4, 8, 4),
  lg: shadow(8, 16, 8),
  xl: shadow(12, 24, 12),
  primaryGlow: shadowColored('#6C63FF', 8, 20, 4),
  accentGlow: shadowColored('#00D4AA', 6, 16, 4),
  cardShadow: shadow(6, 12, 6),
  tabBar: shadow(16, 20, 0),
};

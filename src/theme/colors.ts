/**
 * San Alejo — Paleta de colores premium
 * Inspiración: Netflix, Apple, interfaces cinematográficas
 * Tema oscuro como principal, preparado para tema claro futuro
 */

export const Colors = {
  // ─── Fondos ───────────────────────────────────────────────────────────────
  background: '#0A0A0F',        // Negro profundo con tinte azul
  backgroundSecondary: '#111118', // Fondo de tarjetas y secciones
  backgroundTertiary: '#1A1A24', // Fondo de inputs y elementos elevados
  surface: '#16161F',           // Superficie de tarjetas
  surfaceElevated: '#1E1E2A',   // Tarjetas elevadas / modales

  // ─── Glassmorphism ────────────────────────────────────────────────────────
  glass: '#1E1E2A',
  glassBorder: '#2A2A3A',
  glassDark: '#0D0D14',

  // ─── Acento principal ─────────────────────────────────────────────────────
  primary: '#6C63FF',           // Violeta premium
  primaryLight: '#8B85FF',
  primaryDark: '#4F48CC',
  primaryGlow: '#2A2566',       // Fondo del ícono activo del tab Home/Panel

  // ─── Acento secundario ────────────────────────────────────────────────────
  secondary: '#FF6584',         // Rosa coral
  secondaryLight: '#FF8FA3',
  secondaryDark: '#CC4F69',

  // ─── Acento terciario ─────────────────────────────────────────────────────
  accent: '#00D4AA',            // Verde menta / teal — color primario del módulo Eco
  accentLight: '#33DDBB',
  accentDark: '#00A882',
  accentGlow: '#003D30',        // Fondo del ícono activo del tab Eco

  // ─── Texto ────────────────────────────────────────────────────────────────
  textPrimary: '#F0F0F8',       // Blanco suave — texto principal
  textSecondary: '#9090A8',     // Gris medio — texto secundario
  textTertiary: '#5A5A72',      // Gris oscuro — texto deshabilitado / hints
  textInverse: '#0A0A0F',       // Para texto sobre fondos claros

  // ─── Bordes ───────────────────────────────────────────────────────────────
  border: '#2A2A3A',
  borderStrong: '#3A3A4A',
  borderFocus: '#6C63FF',

  // ─── Estados ──────────────────────────────────────────────────────────────
  success: '#34D399',
  successLight: '#0D3D2A',
  warning: '#FBBF24',
  warningLight: '#3D2E0A',
  error: '#F87171',
  errorLight: '#3D1515',
  info: '#60A5FA',
  infoLight: '#0D2040',

  // ─── Overlay ──────────────────────────────────────────────────────────────
  overlay: '#000000',
  overlayLight: '#000000',

  // ─── Gradientes (arrays para LinearGradient) ──────────────────────────────
  gradients: {
    primary: ['#6C63FF', '#4F48CC'] as const,
    primaryGlow: ['#6C63FF', '#4F48CC'] as const,
    dark: ['#0A0A0F', '#111118'] as const,
    card: ['#16161F', '#1A1A24'] as const,
    surface: ['#1E1E2A', '#16161F'] as const,
    accent: ['#00D4AA', '#6C63FF'] as const,
    sunset: ['#FF6584', '#6C63FF'] as const,
    transparent: ['#000000', '#000000'] as const,
  },

  // ─── Tags de contenedores ─────────────────────────────────────────────────
  containerTags: [
    '#6C63FF', // violeta
    '#FF6584', // rosa
    '#00D4AA', // teal
    '#FBBF24', // ámbar
    '#60A5FA', // azul
    '#F472B6', // fucsia
    '#34D399', // verde
    '#FB923C', // naranja
  ],

  // ─── Transparente ─────────────────────────────────────────────────────────
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof Colors;

/**
 * VisionSuggestionBanner.tsx
 *
 * Banner que aparece en CreateItemScreen tras analizar una imagen con CV.
 * Muestra nombre sugerido, acción ecológica sugerida y razón de la sugerencia.
 * El usuario toca directamente el nombre correcto o pulsa "Usar sugerencias".
 *
 * Estados:
 *   analyzing  — spinner mientras Cloud Vision procesa
 *   result     — muestra sugerencias aceptables/descartables
 *   error      — análisis falló; invita a continuar sin sugerencia
 *   hidden     — no renderiza nada (CV deshabilitada o sin imagen)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import {
  Colors,
  Spacing,
  BorderRadius,
  FontFamily,
  FontSize,
} from '../../theme';
import { ECO_ACTION_LABELS, ECO_ACTION_ICONS } from '../../types/Eco';
import type { EcoAction } from '../../types/Item';

// ─── Props ────────────────────────────────────────────────────────────────────

export type VisionBannerState = 'hidden' | 'analyzing' | 'result' | 'error';

export interface VisionSuggestion {
  /** Nombre de ítem sugerido por CV (ya traducido al español). */
  suggestedName: string;
  /** Acción ecológica sugerida por ecoMapping, puede ser null. */
  suggestedEcoAction: EcoAction | null;
  /** Frase explicativa del porqué de la acción eco. */
  ecoReason: string;
  /** Etiqueta de mayor score (para mostrar contexto). */
  topLabel: string;
  /** Confianza de la etiqueta principal (0-1). */
  confidence: number;
  /** Nombres alternativos (ya traducidos, sin repetir) para que el usuario elija. */
  alternatives: string[];
  /** Subconjunto de `alternatives` que vienen de la memoria del usuario. */
  learned: string[];
  /** Acción eco (y su motivo) para cada nombre propuesto. */
  ecoByName: Record<string, { action: EcoAction | null; reason: string }>;
}

interface VisionSuggestionBannerProps {
  state: VisionBannerState;
  suggestion?: VisionSuggestion;
  /** Llamado cuando el usuario acepta el nombre sugerido. */
  onAcceptName: (name: string) => void;
  /** Llamado cuando el usuario acepta la acción eco sugerida. */
  onAcceptEcoAction: (action: EcoAction) => void;
  /** Llamado cuando el usuario descarta el banner completo. */
  onDismiss: () => void;
}

// ─── Banner principal ─────────────────────────────────────────────────────────

export function VisionSuggestionBanner({
  state,
  suggestion,
  onAcceptName,
  onAcceptEcoAction,
  onDismiss,
}: VisionSuggestionBannerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  const [selectedName, setSelectedName] = React.useState<string | null>(null);
  const [ecoAccepted, setEcoAccepted] = React.useState(false);

  // Animar entrada cuando cambia a estado visible
  useEffect(() => {
    if (state === 'hidden') {
      opacity.setValue(0);
      translateY.setValue(8);
      setSelectedName(null);
      setEcoAccepted(false);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [state, opacity, translateY]);

  if (state === 'hidden') return null;

  // ── Estado: analizando ────────────────────────────────────────────────────
  if (state === 'analyzing') {
    return (
      <Animated.View
        style={[styles.container, styles.analyzingContainer, { opacity, transform: [{ translateY }] }]}
        accessibilityLiveRegion="polite"
        accessibilityLabel="Analizando imagen"
      >
        <ActivityIndicator size="small" color={Colors.primary} />
        <Text style={styles.analyzingText}>Analizando imagen…</Text>
      </Animated.View>
    );
  }

  // ── Estado: error ─────────────────────────────────────────────────────────
  if (state === 'error') {
    return (
      <Animated.View
        style={[styles.container, styles.errorContainer, { opacity, transform: [{ translateY }] }]}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.errorRow}>
          <Ionicons name="cloud-offline-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.errorText}>
            No pude reconocer este objeto con claridad. Escribe el nombre tú mismo: la próxima vez lo recordaré.
          </Text>
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Cerrar aviso de error"
          >
            <Ionicons name="close" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  // ── Estado: resultado ─────────────────────────────────────────────────────
  if (state === 'result' && suggestion) {
    const ecoIconName =
      suggestion.suggestedEcoAction
        ? (ECO_ACTION_ICONS[suggestion.suggestedEcoAction] as React.ComponentProps<typeof Ionicons>['name'])
        : 'leaf-outline';
    const ecoLabel =
      suggestion.suggestedEcoAction
        ? ECO_ACTION_LABELS[suggestion.suggestedEcoAction]
        : '';

    const confidencePercent = Math.round(suggestion.confidence * 100);
    const lowConfidence = suggestion.confidence < 0.5;
    const names = suggestion.alternatives.length > 0
      ? suggestion.alternatives
      : [suggestion.suggestedName];
    // La acción eco sigue al nombre seleccionado (o al primero si aún no eligió)
    const activeName = selectedName ?? names[0];
    const ecoInfo = suggestion.ecoByName[activeName];
    const eco = ecoInfo ? ecoInfo.action : suggestion.suggestedEcoAction;
    const ecoReasonText = ecoInfo ? ecoInfo.reason : suggestion.ecoReason;
    const allApplied = selectedName !== null && (!eco || ecoAccepted);

    const pickName = (name: string) => {
      // Si cambia la acción eco sugerida, hay que volver a confirmarla
      if (suggestion.ecoByName[name]?.action !== eco) setEcoAccepted(false);
      setSelectedName(name);
      onAcceptName(name);
    };
    const applyEco = () => {
      if (!eco) return;
      setEcoAccepted(true);
      onAcceptEcoAction(eco);
    };
    const applyAll = () => {
      if (selectedName === null) pickName(names[0]);
      if (eco && !ecoAccepted) applyEco();
    };

    return (
      <Animated.View
        style={[styles.container, { opacity, transform: [{ translateY }] }]}
        accessibilityLiveRegion="polite"
        accessibilityLabel="Sugerencias de reconocimiento de imagen"
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="sparkles" size={14} color={Colors.primary} />
            <Text style={styles.headerTitle}>Sugerencias de IA</Text>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>{confidencePercent}%</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onDismiss}
            activeOpacity={0.7}
            style={styles.dismissBtn}
            accessibilityRole="button"
            accessibilityLabel="Ignorar sugerencias"
          >
            <Text style={styles.dismissText}>Ahora no</Text>
          </TouchableOpacity>
        </View>

        {lowConfidence && (
          <Text style={styles.lowConfidence}>
            No estoy muy seguro. Elige la opción correcta o escribe el nombre tú mismo.
          </Text>
        )}

        {/* Nombre: el usuario toca directamente la opción correcta */}
        <Text style={styles.sectionLabel}>¿Qué objeto es? Toca el nombre correcto</Text>
        <View style={styles.pillsRow}>
          {names.map((name) => {
            const active = selectedName === name;
            return (
              <TouchableOpacity
                key={name}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => pickName(name)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Usar el nombre ${name}`}
              >
                {active && <Ionicons name="checkmark" size={14} color={Colors.primary} />}
                {!active && suggestion.learned.includes(name) && (
                  <Ionicons name="bookmark" size={12} color={Colors.accent} />
                )}
                <Text style={[styles.pillText, active && styles.pillTextActive]}>{name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {suggestion.learned.length > 0 && (
          <Text style={styles.hint}>
            Los nombres con marcador son de tus fotos anteriores.
          </Text>
        )}

        {/* Acción eco: tarjeta completa tocable con botón con texto */}
        {eco && (
          <>
            <Text style={styles.sectionLabel}>Acción ecológica sugerida</Text>
            <TouchableOpacity
              style={[styles.ecoCard, ecoAccepted && styles.ecoCardActive]}
              onPress={applyEco}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Usar acción eco ${ECO_ACTION_LABELS[eco]}`}
            >
              <Ionicons
                name={ECO_ACTION_ICONS[eco] as React.ComponentProps<typeof Ionicons>['name']}
                size={20}
                color={Colors.accent}
              />
              <View style={styles.ecoInfo}>
                <Text style={styles.ecoTitle}>{ECO_ACTION_LABELS[eco]}</Text>
                <Text style={styles.ecoReason} numberOfLines={2}>{ecoReasonText}</Text>
              </View>
              <View style={[styles.useBtn, ecoAccepted && styles.useBtnDone]}>
                <Text style={[styles.useBtnText, ecoAccepted && styles.useBtnTextDone]}>
                  {ecoAccepted ? 'Aplicada' : 'Usar'}
                </Text>
              </View>
            </TouchableOpacity>
            <Text style={styles.hint}>Puedes cambiarla después en la sección Acción eco.</Text>
          </>
        )}

        {/* Botón principal: aplica todo de una vez */}
        <TouchableOpacity
          style={[styles.primaryBtn, allApplied && styles.primaryBtnDone]}
          onPress={allApplied ? onDismiss : applyAll}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={allApplied ? 'Cerrar sugerencias' : 'Usar sugerencias'}
        >
          <Ionicons
            name={allApplied ? 'checkmark-circle' : 'sparkles'}
            size={16}
            color={allApplied ? Colors.primary : Colors.background}
          />
          <Text style={[styles.primaryBtnText, allApplied && styles.primaryBtnTextDone]}>
            {allApplied ? 'Listo, cerrar' : 'Usar sugerencias'}
          </Text>
        </TouchableOpacity>

        {/* Aviso de privacidad */}
        <View style={styles.privacyRow}>
          <Ionicons name="phone-portrait-outline" size={11} color={Colors.textTertiary} />
          <Text style={styles.privacyText}>
            Análisis realizado en tu dispositivo. Ninguna imagen se envía fuera.
          </Text>
        </View>
      </Animated.View>
    );
  }

  return null;
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing[4],
    padding: Spacing[3],
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: `${Colors.primary}44`,
    backgroundColor: Colors.surface,
  },
  analyzingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    justifyContent: 'center',
    paddingVertical: Spacing[3],
    borderColor: Colors.border,
  },
  analyzingText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  errorContainer: {
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundTertiary,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  errorText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  confidenceBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryGlow,
  },
  confidenceText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  dismissBtn: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
  },
  dismissText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  lowConfidence: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing[3],
  },
  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing[2],
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginBottom: Spacing[3],
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    minHeight: 40,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundTertiary,
  },
  pillActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  pillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  pillTextActive: {
    color: Colors.primary,
  },
  ecoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[3],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundTertiary,
  },
  ecoCardActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
  },
  ecoInfo: {
    flex: 1,
  },
  ecoTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  ecoReason: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  useBtn: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accent,
  },
  useBtnDone: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  useBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.background,
  },
  useBtnTextDone: {
    color: Colors.accent,
  },
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: Spacing[1],
    marginBottom: Spacing[3],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    marginTop: Spacing[2],
    marginBottom: Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  primaryBtnDone: {
    backgroundColor: Colors.primaryGlow,
  },
  primaryBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.background,
  },
  primaryBtnTextDone: {
    color: Colors.primary,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    marginTop: Spacing[1],
  },
  privacyText: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textTertiary,
    flex: 1,
  },
});
/**
 * EcoItemDetailScreen — Detalle y edición de acción ecológica de un ítem.
 * Task 8 — implementación visual completa.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text, PremiumInput } from '../components/ui';
import { Colors, Spacing, BorderRadius, FontFamily, FontSize, Shadows, ComponentSize } from '../theme';
import { useEcoStore } from '../store/ecoStore';
import { ItemRepository } from '../database/repositories/ItemRepository';
import { useAppNavigation } from '../navigation/NavigationContext';
import {
  ECO_ACTION_LABELS,
  ECO_ACTION_ICONS,
  ECO_ACTIONS,
} from '../types/Eco';
import type { EcoAction } from '../types/Item';
import type { Item } from '../types/Item';
import { formatDate } from '../utils/dateUtils';

// ─── Placeholder contextual por acción ───────────────────────────────────────

function getNotesPlaceholder(action: EcoAction | undefined): string {
  switch (action) {
    case 'sell':   return 'Precio estimado (EUR)';
    case 'donate': return 'Punto de donación';
    case 'repair': return 'Descripción de la reparación';
    default:       return 'Notas adicionales';
  }
}

// ─── ActionChip ───────────────────────────────────────────────────────────────

interface ActionChipProps {
  action: EcoAction;
  isSelected: boolean;
  isDisabled: boolean;
  onPress: (action: EcoAction) => void;
}

const ActionChip = React.memo(function ActionChip({
  action,
  isSelected,
  isDisabled,
  onPress,
}: ActionChipProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const label = ECO_ACTION_LABELS[action];
  const iconName = ECO_ACTION_ICONS[action] as React.ComponentProps<typeof Ionicons>['name'];

  const handlePressIn = useCallback(() => {
    if (isDisabled) return;
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  }, [isDisabled, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (isDisabled) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 60,
      bounciness: 10,
    }).start();
  }, [isDisabled, scaleAnim]);

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    Haptics.selectionAsync();
    onPress(action);
  }, [isDisabled, action, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
    >
      <Animated.View
        style={[
          chipStyles.chip,
          isSelected && chipStyles.chipSelected,
          isDisabled && chipStyles.chipDisabled,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons
          name={iconName}
          size={16}
          color={isSelected ? Colors.accent : Colors.textTertiary}
        />
        <Text style={[chipStyles.label, isSelected && chipStyles.labelSelected]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.accentGlow,
    borderColor: Colors.accent,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  labelSelected: {
    color: Colors.accent,
  },
});

// ─── EcoItemDetailScreen ──────────────────────────────────────────────────────

export default function EcoItemDetailScreen() {
  const { goBack, navigate, params } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const { assignEcoAction, completeEcoAction } = useEcoStore();

  const itemId = params?.itemId ?? '';

  // ── Estado local ──────────────────────────────────────────────────────────
  const [item, setItem] = useState<Item | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<EcoAction | undefined>();
  const [notes, setNotes] = useState('');
  const [saveConfirm, setSaveConfirm] = useState(false);

  // ── Animaciones ───────────────────────────────────────────────────────────
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(20)).current;
  const iconScaleAnim = useRef(new Animated.Value(1)).current;

  // ── Carga del ítem ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!itemId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    ItemRepository.findById(itemId).then((found) => {
      if (!found) {
        setNotFound(true);
      } else {
        setItem(found);
        setSelectedAction(found.eco_action);
        setNotes(found.eco_notes ?? '');

        // Animación de entrada
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
        ]).start();
      }
      setIsLoading(false);
    });
  }, [itemId, fadeAnim, slideAnim]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectAction = useCallback((action: EcoAction) => {
    setSelectedAction(action);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedAction) return;
    await assignEcoAction(itemId, selectedAction, notes);

    // Actualizar estado local del ítem
    setItem((prev) =>
      prev
        ? { ...prev, eco_action: selectedAction, eco_notes: notes, eco_status: 'pending' }
        : prev
    );

    // Feedback visual: cambiar color del botón a success por 1.5s
    setSaveConfirm(true);
    setTimeout(() => setSaveConfirm(false), 1500);
  }, [itemId, selectedAction, notes, assignEcoAction]);

  const handleComplete = useCallback(async () => {
    await completeEcoAction(itemId);

    // Actualizar estado local
    setItem((prev) =>
      prev
        ? { ...prev, eco_status: 'completed', eco_completed_at: Date.now() }
        : prev
    );

    // Animación de pulso en el ícono de acción
    Animated.sequence([
      Animated.timing(iconScaleAnim, { toValue: 1.4, duration: 200, useNativeDriver: true }),
      Animated.timing(iconScaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }),
      Animated.timing(iconScaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
      Animated.timing(iconScaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, [itemId, completeEcoAction, iconScaleAnim]);

  const isCompleted = item?.eco_status === 'completed';
  const isReadOnly  = isCompleted;

  // ── Estado de error ───────────────────────────────────────────────────────
  if (!isLoading && notFound) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Acción ecológica</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.errorState}>
          <View style={styles.errorIconCircle}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          </View>
          <Text style={styles.errorTitle}>Ítem no encontrado</Text>
          <Text style={styles.errorSubtitle}>
            No se pudo cargar la información del ítem solicitado.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => navigate('EcoHub')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Volver a Eco"
          >
            <Ionicons name="leaf-outline" size={16} color={Colors.textInverse} />
            <Text style={styles.errorButtonText}>Volver a Eco</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Skeleton de carga ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={goBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Acción ecológica</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingState}>
          <Ionicons name="leaf-outline" size={32} color={Colors.accent} />
        </View>
      </View>
    );
  }

  // ── Ícono de acción principal ─────────────────────────────────────────────
  const actionIconName = selectedAction
    ? (ECO_ACTION_ICONS[selectedAction] as React.ComponentProps<typeof Ionicons>['name'])
    : 'help-circle-outline';
  const actionIconColor = selectedAction ? Colors.accent : Colors.textTertiary;

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {item?.name ?? 'Acción ecológica'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing[8] },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          {/* ── Imagen de portada ─────────────────────────────────────── */}
          {item?.cover_image_uri ? (
            <Image
              source={{ uri: item.cover_image_uri }}
              style={styles.coverImage}
              resizeMode="cover"
              accessibilityLabel={`Imagen de ${item.name}`}
            />
          ) : null}

          {/* ── Info del ítem ─────────────────────────────────────────── */}
          <View style={styles.itemInfo}>
            <View style={styles.itemIconRow}>
              <Animated.View
                style={[
                  styles.actionIconCircle,
                  { transform: [{ scale: iconScaleAnim }] },
                ]}
              >
                <Ionicons name={actionIconName} size={28} color={actionIconColor} />
              </Animated.View>
              <View style={styles.itemTextGroup}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item?.name}
                </Text>
                {item?.description ? (
                  <Text style={styles.itemDescription} numberOfLines={3}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Fecha de completado (solo lectura) */}
            {isCompleted && item?.eco_completed_at ? (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.completedText}>
                  Completado el {formatDate(item.eco_completed_at)}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ── Selector de acción (6 chips) ──────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Acción ecológica</Text>
            <View style={styles.chipsGrid}>
              {ECO_ACTIONS.map((action) => (
                <ActionChip
                  key={action}
                  action={action}
                  isSelected={selectedAction === action}
                  isDisabled={isReadOnly}
                  onPress={handleSelectAction}
                />
              ))}
            </View>
          </View>

          {/* ── Notas (PremiumInput) ──────────────────────────────────── */}
          <View style={styles.section}>
            <PremiumInput
              label={getNotesPlaceholder(selectedAction)}
              value={notes}
              onChangeText={setNotes}
              icon="create-outline"
              multiline
              numberOfLines={3}
              editable={!isReadOnly}
              accessibilityLabel="Notas de la acción ecológica"
            />
          </View>

          {/* ── Botón Guardar ─────────────────────────────────────────── */}
          {!isReadOnly && (
            <TouchableOpacity
              style={[
                styles.saveButton,
                saveConfirm && styles.saveButtonConfirm,
                !selectedAction && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={!selectedAction}
              accessibilityRole="button"
              accessibilityLabel="Guardar cambios"
            >
              <Ionicons
                name={saveConfirm ? 'checkmark-circle' : 'save-outline'}
                size={18}
                color={Colors.textInverse}
              />
              <Text style={styles.saveButtonText}>
                {saveConfirm ? 'Guardado' : 'Guardar cambios'}
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Separador ─────────────────────────────────────────────── */}
          {!isReadOnly && item?.eco_status !== 'completed' && (
            <View style={styles.separator} />
          )}

          {/* ── Botón Marcar como completado ──────────────────────────── */}
          {!isCompleted && (
            <TouchableOpacity
              style={styles.completeButton}
              onPress={handleComplete}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Marcar como completado"
            >
              <Ionicons name="checkmark-done-outline" size={18} color={Colors.accent} />
              <Text style={styles.completeButtonText}>Marcar como completado</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundTertiary,
  },
  headerTitle: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginHorizontal: Spacing[2],
  },
  headerSpacer: { width: 40 },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },

  // Cover image
  coverImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing[4],
    backgroundColor: Colors.backgroundTertiary,
  },

  // Item info
  itemInfo: {
    marginBottom: Spacing[5],
    gap: Spacing[3],
  },
  itemIconRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: `${Colors.accent}33`,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...Shadows.sm,
  },
  itemTextGroup: {
    flex: 1,
    gap: Spacing[1],
  },
  itemName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  itemDescription: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.successLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: `${Colors.success}44`,
    alignSelf: 'flex-start',
  },
  completedText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.success,
  },

  // Sections
  section: {
    marginBottom: Spacing[5],
  },
  sectionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing[3],
    letterSpacing: 0.5,
  },

  // Chips grid
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },

  // Save button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    height: ComponentSize.buttonHeight,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.accent,
    marginBottom: Spacing[3],
    ...Shadows.accentGlow,
  },
  saveButtonConfirm: {
    backgroundColor: Colors.success,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textInverse,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[4],
  },

  // Complete button
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    height: ComponentSize.buttonHeight,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    marginBottom: Spacing[3],
  },
  completeButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.accent,
  },

  // Error state
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    gap: Spacing[4],
  },
  errorIconCircle: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: `${Colors.error}33`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  errorTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.accent,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing[2],
    ...Shadows.accentGlow,
  },
  errorButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textInverse,
  },

  // Loading state
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

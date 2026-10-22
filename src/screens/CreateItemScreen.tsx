/**
 * CreateItemScreen.tsx
 *
 * Cambios Fase B — Computer Vision:
 *   - Botón "Analizar con IA" aparece cuando CV está habilitado Y hay imagen.
 *   - Al pulsar: pide consentimiento si es la primera vez, luego llama a
 *     analyzeImage(). Mientras analiza muestra VisionSuggestionBanner en estado
 *     'analyzing'. Al terminar: 'result' (con sugerencias) o 'error' (fallo).
 *   - Aceptar nombre: pre-rellena el campo nombre y lo marca como aceptado.
 *   - Aceptar eco: selecciona la acción ecológica y expande la sección eco.
 *   - Degradación: si CV falla, el ítem se guarda igual; el banner muestra 'error'.
 *   - Si CV está deshabilitado en Settings, el botón no aparece (cero intrusividad).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Text,
  Button,
  PremiumInput,
  SectionHeader,
  TagBadge,
  ImagePickerButton,
  VisionSuggestionBanner,
} from '../components/ui';
import type { VisionBannerState, VisionSuggestion } from '../components/ui';
import { Colors, Spacing, BorderRadius, FontFamily, FontSize } from '../theme';
import { useItemStore } from '../store/itemStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { TagRepository } from '../database/repositories/TagRepository';
import { useAppNavigation } from '../navigation/NavigationContext';
import { validateItemName, validateQuantity } from '../utils/validation';
import { analyzeImage, isVisionAvailable } from '../services/visionService';
import { ecoActionForConcept } from '../services/objectCatalog';
import { getLearnedNames, learnFromChoice } from '../services/learnedNames';
import type { RawLabel } from '../services/learnedNames';
import {
  suggestEcoAction,
  getEcoSuggestionReason,
  getTopLabelName,
} from '../utils/ecoMapping';
import type { Tag } from '../types/Tag';
import { ECO_ACTION_LABELS, ECO_ACTION_ICONS, ECO_ACTIONS } from '../types/Eco';
import type { EcoAction } from '../types/Item';

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  quantity: string;
  cover_image_uri: string | undefined;
  selectedTagIds: string[];
}

interface FormErrors {
  name?: string;
  quantity?: string;
}

// ─── CreateItemScreen ─────────────────────────────────────────────────────────

export default function CreateItemScreen() {
  const { goBack, params } = useAppNavigation();
  const containerId = params?.containerId ?? '';
  const { createItem, isLoading } = useItemStore();
  const { cvEnabled, cvConsentGiven, setCvConsentGiven } = useAppSettingsStore();
  const insets = useSafeAreaInsets();

  // ── Formulario ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    quantity: '1',
    cover_image_uri: undefined,
    selectedTagIds: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [ecoExpanded, setEcoExpanded] = useState(false);
  const [selectedEcoAction, setSelectedEcoAction] = useState<EcoAction | undefined>();

  // ── Computer Vision ───────────────────────────────────────────────────────
  const [visionState, setVisionState] = useState<VisionBannerState>('hidden');
  const [visionSuggestion, setVisionSuggestion] = useState<VisionSuggestion | undefined>();
  // Evita lanzar el análisis dos veces para la misma URI
  const lastAnalyzedUri = useRef<string | null>(null);
  // Etiquetas originales del modelo de la última foto analizada (para aprender al guardar)
  const lastRawLabels = useRef<RawLabel[]>([]);
  // Animación del botón "Analizar"
  const analyzeButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    TagRepository.findAll().then(setTags).catch(() => {});
  }, []);

  // ─── Helpers de formulario ────────────────────────────────────────────────

  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      if (key === 'name') setErrors((prev) => ({ ...prev, name: undefined }));
      if (key === 'quantity') setErrors((prev) => ({ ...prev, quantity: undefined }));
    },
    []
  );

  const toggleTag = useCallback((tagId: string) => {
    Haptics.selectionAsync();
    setForm((prev) => ({
      ...prev,
      selectedTagIds: prev.selectedTagIds.includes(tagId)
        ? prev.selectedTagIds.filter((id) => id !== tagId)
        : [...prev.selectedTagIds, tagId],
    }));
  }, []);

  const adjustQuantity = (delta: number) => {
    const current = parseInt(form.quantity, 10) || 1;
    const next = Math.max(1, current + delta);
    updateField('quantity', String(next));
    Haptics.selectionAsync();
  };

  // ─── Computer Vision ──────────────────────────────────────────────────────

  /** Acción eco (y motivo) para cada nombre propuesto. */
  const buildEcoByName = (
    names: string[],
    fallback: EcoAction | null
  ): Record<string, { action: EcoAction | null; reason: string }> => {
    const out: Record<string, { action: EcoAction | null; reason: string }> = {};
    for (const n of names) {
      const action = ecoActionForConcept(n) ?? fallback;
      out[n] = { action, reason: action ? getEcoSuggestionReason(action, n) : '' };
    }
    return out;
  };

  /**
   * Ejecuta el análisis ML Kit local sobre la imagen.
   * Definida con useCallback para que handleAnalyzeImage la capture correctamente.
   */
  const runAnalysis = useCallback(async (imageUri: string) => {
    lastAnalyzedUri.current = imageUri;
    setVisionState('analyzing');
    setVisionSuggestion(undefined);

    const result = await analyzeImage(imageUri);
    lastRawLabels.current = result?.raw ?? [];

    if (!result || result.labels.length === 0) {
      // Puede que el modelo no conozca el objeto; igual aprenderá el nombre que escribas
      const learnedOnly = result ? await getLearnedNames(result.raw, 3) : [];
      if (learnedOnly.length === 0) {
        setVisionState('error');
        return;
      }
      const ecoByName = buildEcoByName(learnedOnly, null);
      setVisionSuggestion({
        suggestedName: learnedOnly[0],
        suggestedEcoAction: ecoByName[learnedOnly[0]].action,
        ecoReason: ecoByName[learnedOnly[0]].reason,
        topLabel: learnedOnly[0],
        confidence: 0.5,
        alternatives: learnedOnly,
        learned: learnedOnly,
        ecoByName,
      });
      setVisionState('result');
      return;
    }

    // Nombres aprendidos de tus fotos anteriores primero, luego los conceptos del modelo
    const learned = await getLearnedNames(result.raw, 2);
    const alternatives = Array.from(
      new Set([...learned, ...result.labels.map((l) => l.description)])
    ).slice(0, 3);
    const fallbackEco = suggestEcoAction(result.rawLabels);
    const ecoByName = buildEcoByName(alternatives, fallbackEco);
    const first = alternatives[0];

    setVisionSuggestion({
      suggestedName: first,
      suggestedEcoAction: ecoByName[first].action,
      ecoReason: ecoByName[first].reason,
      topLabel: first,
      confidence: result.labels[0]?.score ?? 0,
      alternatives,
      learned,
      ecoByName,
    });
    setVisionState('result');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  /**
   * Punto de entrada del botón "Reconocer con IA".
   * La primera vez muestra un breve diálogo informativo (no de consentimiento
   * de privacidad, porque el análisis es local), luego lanza el análisis.
   */
  const handleAnalyzeImage = useCallback(async () => {
    if (!form.cover_image_uri) return;
    if (lastAnalyzedUri.current === form.cover_image_uri) return;

    // Animación del botón
    Animated.sequence([
      Animated.timing(analyzeButtonScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(analyzeButtonScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Primera vez: informar al usuario que el análisis es local
    if (!cvConsentGiven) {
      Alert.alert(
        'Reconocimiento local',
        'El análisis se realiza directamente en tu dispositivo.\n\nNinguna imagen se envía a servidores externos. Puedes desactivar esta función en Ajustes.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Entendido',
            onPress: async () => {
              await setCvConsentGiven(true);
              await runAnalysis(form.cover_image_uri!);
            },
          },
        ]
      );
      return;
    }

    await runAnalysis(form.cover_image_uri);
  }, [form.cover_image_uri, cvConsentGiven, setCvConsentGiven, analyzeButtonScale, runAnalysis]);

  /** Acepta el nombre sugerido: pre-rellena el campo solo si está vacío o sin modificar. */
  const handleAcceptName = useCallback(
    (name: string) => {
      updateField('name', name);
      Haptics.selectionAsync();
    },
    [updateField]
  );

  /** Acepta la acción eco sugerida: la selecciona y expande la sección. */
  const handleAcceptEcoAction = useCallback((action: EcoAction) => {
    setSelectedEcoAction(action);
    setEcoExpanded(true);
    Haptics.selectionAsync();
  }, []);

  const handleDismissBanner = useCallback(() => {
    setVisionState('hidden');
    setVisionSuggestion(undefined);
  }, []);

  // Cuando cambia la imagen, resetear el banner y el análisis anterior
  const handleImageSelected = useCallback(
    (uri: string) => {
      updateField('cover_image_uri', uri);
      lastAnalyzedUri.current = null;
      setVisionState('hidden');
      setVisionSuggestion(undefined);
    },
    [updateField]
  );

  const handleImageRemoved = useCallback(() => {
    updateField('cover_image_uri', undefined);
    lastAnalyzedUri.current = null;
    setVisionState('hidden');
    setVisionSuggestion(undefined);
  }, [updateField]);

  // ─── Validación y envío ───────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    const nameError = validateItemName(form.name);
    if (nameError) newErrors.name = nameError;

    const qty = parseInt(form.quantity, 10);
    if (isNaN(qty)) {
      newErrors.quantity = 'Ingresa un número válido.';
    } else {
      const qtyError = validateQuantity(qty);
      if (qtyError) newErrors.quantity = qtyError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      await createItem({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        quantity: parseInt(form.quantity, 10) || 1,
        container_id: containerId,
        cover_image_uri: form.cover_image_uri,
        tag_ids: form.selectedTagIds.length > 0 ? form.selectedTagIds : undefined,
        eco_action: selectedEcoAction ?? null,
        eco_status: selectedEcoAction ? 'pending' : null,
      });
      // Memoria local: recuerda qué nombre elegiste para lo que vio el modelo
      if (lastAnalyzedUri.current && lastRawLabels.current.length > 0) {
        void learnFromChoice(lastRawLabels.current, form.name);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goBack();
    } catch {
      Alert.alert('Error', 'No se pudo crear el ítem. Intenta de nuevo.');
    }
  };

  // ─── Condición para mostrar el botón de análisis ──────────────────────────
  const showAnalyzeButton =
    cvEnabled &&
    isVisionAvailable() &&
    !!form.cover_image_uri &&
    visionState !== 'analyzing';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Spacing[4]) }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={goBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        >
          <Ionicons name="close" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <Text variant="headingSmall" color={Colors.textPrimary}>
          Nuevo ítem
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Preview banner */}
      <LinearGradient
        colors={[`${Colors.accent}22`, Colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.previewBanner}
      >
        <ImagePickerButton
          uri={form.cover_image_uri}
          onImageSelected={handleImageSelected}
          onImageRemoved={handleImageRemoved}
          size="md"
          label="Foto"
        />
        <View style={styles.previewInfo}>
          <Text variant="headingMedium" color={Colors.textPrimary} numberOfLines={1}>
            {form.name || 'Sin nombre'}
          </Text>
          <Text variant="bodySmall" color={Colors.textTertiary}>
            Cantidad: {form.quantity || '1'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader title="Información del ítem" accent={Colors.accent} />

        <PremiumInput
          label="Nombre del ítem"
          value={form.name}
          onChangeText={(v) => updateField('name', v)}
          error={errors.name}
          icon="pricetag-outline"
          maxLength={100}
          returnKeyType="next"
          autoFocus
        />

        {/* ── Botón "Analizar con IA" ──────────────────────────────────── */}
        {showAnalyzeButton && (
          <Animated.View style={{ transform: [{ scale: analyzeButtonScale }] }}>
            <TouchableOpacity
              style={styles.analyzeButton}
              onPress={handleAnalyzeImage}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Analizar imagen con inteligencia artificial"
              accessibilityHint="Sugiere nombre y acción ecológica basándose en la foto"
            >
              <Ionicons name="sparkles" size={15} color={Colors.primary} />
              <Text style={styles.analyzeButtonLabel}>Reconocer objeto con IA</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.primary} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Banner de sugerencias de CV ──────────────────────────────── */}
        <VisionSuggestionBanner
          state={visionState}
          suggestion={visionSuggestion}
          onAcceptName={handleAcceptName}
          onAcceptEcoAction={handleAcceptEcoAction}
          onDismiss={handleDismissBanner}
        />

        <PremiumInput
          label="Descripción (opcional)"
          value={form.description}
          onChangeText={(v) => updateField('description', v)}
          icon="document-text-outline"
          multiline
          numberOfLines={3}
          maxLength={300}
        />

        {/* Cantidad */}
        <SectionHeader title="Cantidad" accent={Colors.accent} style={styles.sectionSpacing} />
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => adjustQuantity(-1)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reducir cantidad"
          >
            <Ionicons name="remove" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.quantityInputWrapper}>
            <PremiumInput
              label="Cantidad"
              value={form.quantity}
              onChangeText={(v) => updateField('quantity', v.replace(/[^0-9]/g, ''))}
              error={errors.quantity}
              keyboardType="number-pad"
              containerStyle={styles.quantityInput}
              returnKeyType="done"
            />
          </View>

          <TouchableOpacity
            style={[styles.quantityButton, styles.quantityButtonAdd]}
            onPress={() => adjustQuantity(1)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Aumentar cantidad"
          >
            <Ionicons name="add" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <SectionHeader title="Etiquetas" accent={Colors.accent} style={styles.sectionSpacing} />
            <View style={styles.tagsGrid}>
              {tags.map((tag) => (
                <TagBadge
                  key={tag.id}
                  label={tag.name}
                  color={tag.color}
                  selected={form.selectedTagIds.includes(tag.id)}
                  onPress={() => toggleTag(tag.id)}
                />
              ))}
            </View>
          </>
        )}

        {/* ── Sección eco colapsable ──────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.ecoToggle,
            selectedEcoAction && styles.ecoToggleActive,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            setEcoExpanded((v) => !v);
          }}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Acción ecológica opcional"
          accessibilityState={{ expanded: ecoExpanded }}
        >
          <Ionicons
            name="leaf-outline"
            size={16}
            color={selectedEcoAction ? Colors.accent : Colors.textTertiary}
          />
          <Text
            style={[
              styles.ecoToggleLabel,
              { color: selectedEcoAction ? Colors.accent : Colors.textTertiary },
            ]}
          >
            {selectedEcoAction
              ? `Acción eco: ${ECO_ACTION_LABELS[selectedEcoAction]}`
              : 'Acción ecológica (opcional)'}
          </Text>
          <Ionicons
            name={ecoExpanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Colors.textTertiary}
          />
        </TouchableOpacity>

        {ecoExpanded && (
          <View style={styles.ecoGrid}>
            {ECO_ACTIONS.map((action) => {
              const isSelected = selectedEcoAction === action;
              const iconName = ECO_ACTION_ICONS[action] as React.ComponentProps<
                typeof Ionicons
              >['name'];
              return (
                <TouchableOpacity
                  key={action}
                  style={[styles.ecoChip, isSelected && styles.ecoChipActive]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedEcoAction(isSelected ? undefined : action);
                  }}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={ECO_ACTION_LABELS[action]}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Ionicons
                    name={iconName}
                    size={14}
                    color={isSelected ? Colors.accent : Colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.ecoChipLabel,
                      { color: isSelected ? Colors.accent : Colors.textTertiary },
                    ]}
                  >
                    {ECO_ACTION_LABELS[action]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          label="Cancelar"
          onPress={goBack}
          variant="ghost"
          size="md"
          style={styles.cancelButton}
        />
        <Button
          label="Agregar ítem"
          onPress={handleSubmit}
          variant="primary"
          size="md"
          loading={isLoading}
          style={styles.submitButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: { width: 44 },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
  },
  previewInfo: {
    flex: 1,
    marginLeft: Spacing[4],
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[4],
  },
  sectionSpacing: { marginTop: Spacing[5] },
  // ── Botón analizar ──────────────────────────────────────────────────────
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginTop: Spacing[2],
    marginBottom: Spacing[1],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.primary}55`,
    backgroundColor: Colors.primaryGlow,
  },
  analyzeButtonLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  // ── Cantidad ────────────────────────────────────────────────────────────
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
  },
  quantityButton: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonAdd: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  quantityInputWrapper: { flex: 1 },
  quantityInput: { marginBottom: 0 },
  // ── Tags ────────────────────────────────────────────────────────────────
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bottomSpacer: { height: Spacing[4] },
  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    paddingBottom: Spacing[8],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
    gap: Spacing[3],
  },
  cancelButton: { flex: 1 },
  submitButton: { flex: 2 },
  // ── Eco section ─────────────────────────────────────────────────────────
  ecoToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    marginTop: Spacing[4],
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.accent}33`,
  },
  ecoToggleActive: {
    backgroundColor: Colors.accentGlow,
    borderColor: `${Colors.accent}66`,
  },
  ecoToggleLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
  },
  ecoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginTop: Spacing[3],
  },
  ecoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ecoChipActive: {
    backgroundColor: Colors.accentGlow,
    borderColor: Colors.accent,
  },
  ecoChipLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
});
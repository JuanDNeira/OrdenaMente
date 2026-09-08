import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
} from '../components/ui';
import { Colors, Spacing, BorderRadius, FontFamily, FontSize } from '../theme';
import { useItemStore } from '../store/itemStore';
import { TagRepository } from '../database/repositories/TagRepository';
import { useAppNavigation } from '../navigation/NavigationContext';
import { validateItemName, validateQuantity } from '../utils/validation';
import type { Tag } from '../types/Tag';
import { ECO_ACTION_LABELS, ECO_ACTION_ICONS, ECO_ACTIONS } from '../types/Eco';
import type { EcoAction } from '../types/Item';

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

export default function CreateItemScreen() {
  const { goBack, params } = useAppNavigation();
  const containerId = params?.containerId ?? '';
  const { createItem, isLoading } = useItemStore();
  const insets = useSafeAreaInsets();

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

  useEffect(() => {
    TagRepository.findAll().then(setTags).catch(() => {});
  }, []);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'name') setErrors((prev) => ({ ...prev, name: undefined }));
    if (key === 'quantity') setErrors((prev) => ({ ...prev, quantity: undefined }));
  }, []);

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goBack();
    } catch {
      Alert.alert('Error', 'No se pudo crear el ítem. Intenta de nuevo.');
    }
  };

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
          onImageSelected={(uri) => updateField('cover_image_uri', uri)}
          onImageRemoved={() => updateField('cover_image_uri', undefined)}
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

        {/* ── Sección eco colapsable ──────────────────────────────── */}
        <TouchableOpacity
          style={styles.ecoToggle}
          onPress={() => {
            Haptics.selectionAsync();
            setEcoExpanded((v) => !v);
          }}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Acción ecológica opcional"
          accessibilityState={{ expanded: ecoExpanded }}
        >
          <Ionicons name="leaf-outline" size={16} color={Colors.accent} />
          <Text style={styles.ecoToggleLabel}>Acción ecológica (opcional)</Text>
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
              const iconName = ECO_ACTION_ICONS[action] as React.ComponentProps<typeof Ionicons>['name'];
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
                  <Text style={[styles.ecoChipLabel, { color: isSelected ? Colors.accent : Colors.textTertiary }]}>
                    {ECO_ACTION_LABELS[action]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

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
  headerRight: {
    width: 44,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
  },
  previewIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    backgroundColor: `${Colors.accent}22`,
    borderWidth: 1.5,
    borderColor: `${Colors.accent}55`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[4],
  },
  previewInfo: {
    flex: 1,
    marginLeft: Spacing[4],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[4],
  },
  sectionSpacing: {
    marginTop: Spacing[5],
  },
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
    marginTop: 0,
  },
  quantityButtonAdd: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  quantityInputWrapper: {
    flex: 1,
  },
  quantityInput: {
    marginBottom: 0,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bottomSpacer: {
    height: Spacing[4],
  },
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
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
  // ── Eco section ──────────────────────────────────────────────────────────
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
  ecoToggleLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.accent,
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

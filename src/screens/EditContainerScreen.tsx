import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
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
  TypeSelector,
  ColorPicker,
  TagBadge,
} from '../components/ui';
import { Colors, Spacing, BorderRadius } from '../theme';
import { useContainerStore } from '../store/containerStore';
import { TagRepository } from '../database/repositories/TagRepository';
import { LocationRepository } from '../database/repositories/LocationRepository';
import { useAppNavigation } from '../navigation/NavigationContext';
import { validateContainerName } from '../utils/validation';
import type { ContainerType } from '../types/common';
import { CONTAINER_TYPE_ICONS } from '../types/common';
import type { Tag } from '../types/Tag';
import type { Location } from '../types/Location';

interface FormState {
  name: string;
  type: ContainerType;
  color_tag: string | undefined;
  location_id: string | undefined;
  selectedTagIds: string[];
}

interface FormErrors {
  name?: string;
}

export default function EditContainerScreen() {
  const { goBack, params } = useAppNavigation();
  const containerId = params?.containerId ?? '';
  const { updateContainer, deleteContainer, loadContainerById, selectedContainer } = useContainerStore();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<FormState>({
    name: '',
    type: 'box',
    color_tag: Colors.containerTags[0],
    location_id: undefined,
    selectedTagIds: [],
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [tags, setTags] = useState<Tag[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!containerId) return;
    Promise.all([
      loadContainerById(containerId),
      TagRepository.findAll(),
      LocationRepository.findAll(),
      TagRepository.findByContainerId(containerId),
    ]).then(([, allTags, allLocations, containerTags]) => {
      setTags(allTags);
      setLocations(allLocations);
      setIsInitialized(true);
      // Pre-fill form with container tags
      setForm((prev) => ({
        ...prev,
        selectedTagIds: containerTags.map((t) => t.id),
      }));
    }).catch(() => setIsInitialized(true));
  }, [containerId, loadContainerById]);

    // Sync form when container loads
  useEffect(() => {
    if (selectedContainer?.id === containerId && isInitialized) {
      setForm((prev) => ({
        ...prev,
        name: selectedContainer.name,
        type: selectedContainer.type,
        color_tag: selectedContainer.color_tag ?? Colors.containerTags[0],
        location_id: selectedContainer.location_id,
      }));
    }
  }, [selectedContainer, containerId, isInitialized]);

  const updateField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'name') setErrors((prev) => ({ ...prev, name: undefined }));
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

  const validate = (): boolean => {
    const nameError = validateContainerName(form.name);
    if (nameError) {
      setErrors({ name: nameError });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await updateContainer(containerId, {
        name: form.name.trim(),
        type: form.type,
        color_tag: form.color_tag,
        location_id: form.location_id,
      });

      // Sync tags: remove all then re-assign
      const currentTags = await TagRepository.findByContainerId(containerId);
      for (const tag of currentTags) {
        await TagRepository.removeFromContainer(containerId, tag.id);
      }
      for (const tagId of form.selectedTagIds) {
        await TagRepository.assignToContainer(containerId, tagId);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      goBack();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar el contenedor.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar contenedor',
      `¿Eliminar "${form.name}"? Se eliminarán todos sus ítems y sub-contenedores.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteContainer(containerId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              goBack();
              goBack(); // go back past detail screen too
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el contenedor.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const selectedColor = form.color_tag ?? Colors.primary;

  if (!isInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

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
          Editar contenedor
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
          disabled={isDeleting}
          accessibilityRole="button"
          accessibilityLabel="Eliminar contenedor"
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          )}
        </TouchableOpacity>
      </View>

      {/* Preview banner */}
      <View style={styles.previewBanner}>
        <LinearGradient
          colors={[`${selectedColor}33`, Colors.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.previewGradient}
        >
          <View style={[styles.previewIconWrapper, { backgroundColor: `${selectedColor}22`, borderColor: `${selectedColor}55` }]}>
            <Ionicons name="cube-outline" size={28} color={selectedColor} />
          </View>
          <View style={styles.previewInfo}>
            <Text variant="headingMedium" color={Colors.textPrimary} numberOfLines={1}>
              {form.name || 'Sin nombre'}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionHeader title="Información" accent={selectedColor} />

        <PremiumInput
          label="Nombre del contenedor"
          value={form.name}
          onChangeText={(v) => updateField('name', v)}
          error={errors.name}
          icon="cube-outline"
          maxLength={100}
          returnKeyType="next"
        />

        <SectionHeader title="Tipo de contenedor" accent={selectedColor} style={styles.sectionSpacing} />
        <TypeSelector value={form.type} onChange={(t) => updateField('type', t)} />

        <SectionHeader title="Color identificador" accent={selectedColor} style={styles.sectionSpacing} />
        <ColorPicker value={form.color_tag} onChange={(c) => updateField('color_tag', c)} />

        {locations.length > 0 && (
          <>
            <SectionHeader title="Ubicación" accent={selectedColor} style={styles.sectionSpacing} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.locationScroll}
            >
              {locations.map((loc) => {
                const isSelected = form.location_id === loc.id;
                return (
                  <TouchableOpacity
                    key={loc.id}
                    onPress={() => updateField('location_id', isSelected ? undefined : loc.id)}
                    activeOpacity={0.75}
                    style={[
                      styles.locationChip,
                      isSelected && { borderColor: selectedColor, backgroundColor: `${selectedColor}22` },
                    ]}
                  >
                    <Ionicons
                      name={(loc.icon ?? 'location-outline') as React.ComponentProps<typeof Ionicons>['name']}
                      size={14}
                      color={isSelected ? selectedColor : Colors.textTertiary}
                      style={styles.locationIcon}
                    />
                    <Text variant="labelSmall" color={isSelected ? selectedColor : Colors.textSecondary}>
                      {loc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        )}

        {tags.length > 0 && (
          <>
            <SectionHeader title="Etiquetas" accent={selectedColor} style={styles.sectionSpacing} />
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
          label="Guardar cambios"
          onPress={handleSubmit}
          variant="primary"
          size="md"
          loading={isSaving}
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
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
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
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewBanner: {
    overflow: 'hidden',
  },
  previewGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
  },
  previewIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[4],
  },
  previewInfo: {
    flex: 1,
    marginLeft: 0,
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
  locationScroll: {
    paddingBottom: Spacing[1],
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundTertiary,
    marginRight: Spacing[2],
  },
  locationIcon: {
    marginRight: 6,
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
});

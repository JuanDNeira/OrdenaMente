import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Animated,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text, Button, EmptyState } from '../components/ui';
import { Colors, Spacing, BorderRadius, FontFamily, FontSize, Shadows } from '../theme';
import { TagRepository, DuplicateTagNameError } from '../database/repositories/TagRepository';
import { useAppNavigation } from '../navigation/NavigationContext';
import type { Tag } from '../types/Tag';

// ─── Preset tag colors ────────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#6C63FF', '#FF6584', '#00D4AA', '#FBBF24',
  '#60A5FA', '#F472B6', '#34D399', '#FB923C',
  '#A78BFA', '#F87171', '#4ADE80', '#38BDF8',
  '#E879F9', '#FCD34D', '#6EE7B7', '#93C5FD',
];

// ─── Tag row ──────────────────────────────────────────────────────────────────
const TagRow = React.memo(function TagRow({
  tag,
  usageCount,
  index,
  onEdit,
  onDelete,
}: {
  tag: Tag;
  usageCount: number;
  index: number;
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, delay: index * 35, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, delay: index * 35, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={[styles.tagRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.tagColorDot, { backgroundColor: tag.color }]} />
      <View style={[styles.tagPreview, { backgroundColor: `${tag.color}18`, borderColor: `${tag.color}44` }]}>
        <View style={[styles.tagPreviewDot, { backgroundColor: tag.color }]} />
        <Text style={[styles.tagPreviewLabel, { color: tag.color }]}>{tag.name}</Text>
        {usageCount > 0 && (
          <View style={[styles.usageBadge, { backgroundColor: `${tag.color}33` }]}>
            <Text style={[styles.usageText, { color: tag.color }]}>{usageCount}</Text>
          </View>
        )}
      </View>
      <View style={styles.tagActions}>
        <TouchableOpacity
          style={styles.tagActionBtn}
          onPress={() => { Haptics.selectionAsync(); onEdit(tag); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Editar tag ${tag.name}`}
        >
          <Ionicons name="pencil-outline" size={16} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tagActionBtn, styles.tagDeleteBtn]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDelete(tag); }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Eliminar tag ${tag.name}`}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

// ─── Tag editor modal ─────────────────────────────────────────────────────────
function TagEditorModal({
  visible,
  tag,
  onSave,
  onClose,
}: {
  visible: boolean;
  tag: Tag | null;
  onSave: (name: string, color: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(tag?.name ?? '');
      setColor(tag?.color ?? PRESET_COLORS[0]);
      setError(null);
    }
  }, [visible, tag]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('El nombre es requerido.'); return; }
    if (trimmed.length > 30) { setError('Máximo 30 caracteres.'); return; }
    setIsSaving(true);
    try {
      await onSave(trimmed, color);
      onClose();
    } catch (e) {
      if (e instanceof DuplicateTagNameError) {
        setError('Ya existe un tag con ese nombre.');
      } else {
        setError('No se pudo guardar el tag.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text variant="headingSmall" color={Colors.textPrimary}>
              {tag ? 'Editar tag' : 'Nuevo tag'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Preview */}
          <View style={styles.modalPreview}>
            <View style={[styles.tagPreview, { backgroundColor: `${color}18`, borderColor: `${color}55` }]}>
              <View style={[styles.tagPreviewDot, { backgroundColor: color }]} />
              <Text style={[styles.tagPreviewLabel, { color }]}>{name || 'Vista previa'}</Text>
            </View>
          </View>

          {/* Name input */}
          <View style={[styles.nameInputWrapper, error ? styles.nameInputError : null]}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={(v) => { setName(v); setError(null); }}
              placeholder="Nombre del tag"
              placeholderTextColor={Colors.textTertiary}
              selectionColor={Colors.primary}
              maxLength={30}
              autoFocus
              accessibilityLabel="Nombre del tag"
            />
          </View>
          {error && (
            <Text variant="caption" color={Colors.error} style={styles.errorText}>
              {error}
            </Text>
          )}

          {/* Color picker */}
          <Text variant="labelSmall" color={Colors.textTertiary} style={styles.colorLabel}>
            COLOR
          </Text>
          <View style={styles.colorGrid} accessibilityRole="radiogroup">
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  color === c && styles.colorSwatchSelected,
                ]}
                onPress={() => { setColor(c); Haptics.selectionAsync(); }}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityLabel={`Color ${c}`}
                accessibilityState={{ selected: color === c }}
              >
                {color === c && (
                  <Ionicons name="checkmark" size={14} color={Colors.textPrimary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalFooter}>
            <Button label="Cancelar" onPress={onClose} variant="ghost" size="md" style={styles.modalCancelBtn} />
            <Button label={tag ? 'Guardar' : 'Crear'} onPress={handleSave} variant="primary" size="md" loading={isSaving} style={styles.modalSaveBtn} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── TagsScreen ───────────────────────────────────────────────────────────────
export default function TagsScreen() {
  const { goBack } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [tags, setTags] = useState<Tag[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const [all, counts] = await Promise.all([
        TagRepository.findAll(),
        TagRepository.getUsageCounts(),
      ]);
      setTags(all);
      setUsageCounts(counts);
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadTags(); }, [loadTags]);

  const handleOpenCreate = () => {
    setEditingTag(null);
    setModalVisible(true);
    Haptics.selectionAsync();
  };

  const handleOpenEdit = (tag: Tag) => {
    setEditingTag(tag);
    setModalVisible(true);
  };

  const handleSave = async (name: string, color: string) => {
    if (editingTag) {
      await TagRepository.update(editingTag.id, { name, color });
    } else {
      await TagRepository.create({ name, color });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await loadTags();
  };

  const handleDelete = (tag: Tag) => {
    Alert.alert(
      'Eliminar tag',
      `¿Eliminar "${tag.name}"? Se quitará de todos los contenedores e ítems.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await TagRepository.delete(tag.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await loadTags();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el tag.');
            }
          },
        },
      ]
    );
  };

  const filteredTags = searchQuery.trim()
    ? tags.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : tags;

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
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text variant="labelSmall" color={Colors.textTertiary} style={styles.headerLabel}>
            GESTIÓN DE
          </Text>
          <Text variant="headingSmall" color={Colors.textPrimary}>Etiquetas</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleOpenCreate}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Nueva etiqueta"
        >
          <Ionicons name="add" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={16} color={Colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Buscar tags..."
          placeholderTextColor={Colors.textTertiary}
          selectionColor={Colors.primary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      {tags.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow }]}>
            <Text variant="labelSmall" color={Colors.primary}>{tags.length} tags</Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && filteredTags.length === 0 && (
          <EmptyState
            icon="pricetag-outline"
            title={searchQuery ? 'Sin resultados' : 'Sin etiquetas'}
            description={searchQuery ? `No hay tags con "${searchQuery}"` : 'Crea tu primera etiqueta para organizar contenedores e ítems.'}
            actionLabel={searchQuery ? undefined : 'Crear etiqueta'}
            onAction={searchQuery ? undefined : handleOpenCreate}
          />
        )}

        {filteredTags.map((tag, index) => (
          <TagRow
            key={tag.id}
            tag={tag}
            usageCount={usageCounts[tag.id] ?? 0}
            index={index}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <TagEditorModal
        visible={modalVisible}
        tag={editingTag}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />
    </View>
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
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    letterSpacing: 2,
    marginBottom: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    paddingHorizontal: Spacing[3],
    height: 44,
  },
  searchIcon: {
    marginRight: Spacing[2],
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
  },
  statChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[8],
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  tagColorDot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    marginRight: Spacing[3],
  },
  tagPreview: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing[3],
  },
  tagPreviewDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    marginRight: 6,
  },
  tagPreviewLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
  },
  usageBadge: {
    marginLeft: Spacing[2],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  usageText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  tagActions: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  tagActionBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagDeleteBtn: {
    backgroundColor: Colors.errorLight,
    borderColor: Colors.error,
  },
  bottomSpacer: {
    height: Spacing[8],
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.backgroundSecondary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[5],
    paddingBottom: Spacing[8],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[4],
  },
  modalPreview: {
    alignItems: 'flex-start',
    marginBottom: Spacing[4],
  },
  nameInputWrapper: {
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[4],
    height: 52,
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  nameInputError: {
    borderColor: Colors.error,
  },
  nameInput: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  errorText: {
    marginBottom: Spacing[3],
    marginLeft: Spacing[1],
  },
  colorLabel: {
    letterSpacing: 2,
    marginBottom: Spacing[3],
    marginTop: Spacing[2],
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginBottom: Spacing[5],
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2.5,
    borderColor: Colors.textPrimary,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing[3],
  },
  modalCancelBtn: {
    flex: 1,
  },
  modalSaveBtn: {
    flex: 2,
  },
});

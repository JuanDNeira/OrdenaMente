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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text, Button, EmptyState } from '../components/ui';
import { Colors, Spacing, BorderRadius, FontFamily, FontSize, Shadows } from '../theme';
import { LocationRepository } from '../database/repositories/LocationRepository';
import { ContainerRepository } from '../database/repositories/ContainerRepository';
import { useAppNavigation } from '../navigation/NavigationContext';
import type { Location } from '../types/Location';
import type { Container } from '../types/Container';
import { CONTAINER_TYPE_ICONS, CONTAINER_TYPE_LABELS } from '../types/common';

// ─── Icon options for locations ───────────────────────────────────────────────
const LOCATION_ICONS: React.ComponentProps<typeof Ionicons>['name'][] = [
  'home-outline', 'business-outline', 'car-outline', 'bed-outline',
  'library-outline', 'storefront-outline', 'briefcase-outline', 'school-outline',
  'fitness-outline', 'restaurant-outline', 'medical-outline', 'construct-outline',
  'archive-outline', 'cube-outline', 'layers-outline', 'grid-outline',
];

// ─── Location editor modal ────────────────────────────────────────────────────
function LocationEditorModal({
  visible,
  location,
  onSave,
  onClose,
}: {
  visible: boolean;
  location: Location | null;
  onSave: (name: string, icon: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>('home-outline');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(location?.name ?? '');
      setIcon(location?.icon ?? 'home-outline');
      setError(null);
    }
  }, [visible, location]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('El nombre es requerido.'); return; }
    if (trimmed.length > 50) { setError('Máximo 50 caracteres.'); return; }
    setIsSaving(true);
    try {
      await onSave(trimmed, icon);
      onClose();
    } catch {
      setError('No se pudo guardar la ubicación.');
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
              {location ? 'Editar ubicación' : 'Nueva ubicación'}
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
          <View style={styles.previewRow}>
            <View style={styles.previewIcon}>
              <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={28} color={Colors.primary} />
            </View>
            <Text variant="headingSmall" color={Colors.textPrimary} style={styles.previewName}>
              {name || 'Sin nombre'}
            </Text>
          </View>

          {/* Name input */}
          <View style={[styles.nameInputWrapper, error ? styles.nameInputError : null]}>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={(v) => { setName(v); setError(null); }}
              placeholder="Nombre de la ubicación"
              placeholderTextColor={Colors.textTertiary}
              selectionColor={Colors.primary}
              maxLength={50}
              autoFocus
              accessibilityLabel="Nombre de la ubicación"
            />
          </View>
          {error && (
            <Text variant="caption" color={Colors.error} style={styles.errorText}>
              {error}
            </Text>
          )}

          {/* Icon picker */}
          <Text variant="labelSmall" color={Colors.textTertiary} style={styles.iconLabel}>
            ÍCONO
          </Text>
          <View style={styles.iconGrid} accessibilityRole="radiogroup">
            {LOCATION_ICONS.map((ic) => (
              <TouchableOpacity
                key={ic}
                style={[
                  styles.iconOption,
                  icon === ic && styles.iconOptionSelected,
                ]}
                onPress={() => { setIcon(ic); Haptics.selectionAsync(); }}
                activeOpacity={0.75}
                accessibilityRole="radio"
                accessibilityLabel={ic.replace(/-outline$/, '').replace(/-/g, ' ')}
                accessibilityState={{ selected: icon === ic }}
              >
                <Ionicons
                  name={ic}
                  size={22}
                  color={icon === ic ? Colors.primary : Colors.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalFooter}>
            <Button label="Cancelar" onPress={onClose} variant="ghost" size="md" style={styles.modalCancelBtn} />
            <Button label={location ? 'Guardar' : 'Crear'} onPress={handleSave} variant="primary" size="md" loading={isSaving} style={styles.modalSaveBtn} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Location card ────────────────────────────────────────────────────────────
const LocationCard = React.memo(function LocationCard({
  location,
  containerCount,
  index,
  onEdit,
  onDelete,
  onViewContainers,
}: {
  location: Location;
  containerCount: number;
  index: number;
  onEdit: (loc: Location) => void;
  onDelete: (loc: Location) => void;
  onViewContainers: (loc: Location) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 240, delay: index * 40, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 240, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const iconName = (location.icon ?? 'location-outline') as React.ComponentProps<typeof Ionicons>['name'];

  return (
    <Animated.View style={[styles.locationCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity
        style={styles.locationCardInner}
        onPress={() => onViewContainers(location)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${location.name}, ${containerCount} contenedor${containerCount !== 1 ? 'es' : ''}`}
        accessibilityHint="Toca para ver los contenedores de esta ubicación"
      >
        <View style={styles.locationIconWrapper}>
          <Ionicons name={iconName} size={24} color={Colors.primary} />
        </View>
        <View style={styles.locationInfo}>
          <Text variant="labelLarge" color={Colors.textPrimary} numberOfLines={1}>
            {location.name}
          </Text>
          <Text variant="caption" color={Colors.textTertiary}>
            {containerCount} contenedor{containerCount !== 1 ? 'es' : ''}
          </Text>
        </View>
        <View style={styles.locationActions}>
          <TouchableOpacity
            style={styles.locationActionBtn}
            onPress={() => { Haptics.selectionAsync(); onEdit(location); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${location.name}`}
          >
            <Ionicons name="pencil-outline" size={15} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.locationActionBtn, styles.locationDeleteBtn]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onDelete(location); }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${location.name}`}
          >
            <Ionicons name="trash-outline" size={15} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Containers by location modal ─────────────────────────────────────────────
function ContainersByLocationModal({
  visible,
  location,
  onClose,
  onNavigate,
}: {
  visible: boolean;
  location: Location | null;
  onClose: () => void;
  onNavigate: (containerId: string) => void;
}) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && location) {
      setIsLoading(true);
      ContainerRepository.findByLocationId(location.id)
        .then(setContainers)
        .catch(() => setContainers([]))
        .finally(() => setIsLoading(false));
    }
  }, [visible, location]);

  if (!location) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalCard, styles.containersModal]}>
          <View style={styles.modalHeader}>
            <View style={styles.locationModalTitle}>
              <Ionicons
                name={(location.icon ?? 'location-outline') as React.ComponentProps<typeof Ionicons>['name']}
                size={20}
                color={Colors.primary}
                style={{ marginRight: Spacing[2] }}
              />
              <Text variant="headingSmall" color={Colors.textPrimary} numberOfLines={1}>
                {location.name}
              </Text>
            </View>
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

          {isLoading ? (
            <View style={styles.loadingState}>
              <Text variant="bodyMedium" color={Colors.textTertiary}>Cargando...</Text>
            </View>
          ) : containers.length === 0 ? (
            <View style={styles.loadingState}>
              <Ionicons name="cube-outline" size={32} color={Colors.textTertiary} />
              <Text variant="bodyMedium" color={Colors.textTertiary} style={{ marginTop: Spacing[2] }}>
                Sin contenedores en esta ubicación
              </Text>
            </View>
          ) : (
            <FlatList
              data={containers}
              keyExtractor={(c) => c.id}
              style={styles.containersList}
              renderItem={({ item }) => {
                const iconName = CONTAINER_TYPE_ICONS[item.type] as React.ComponentProps<typeof Ionicons>['name'];
                const accentColor = item.color_tag ?? Colors.primary;
                return (
                  <TouchableOpacity
                    style={styles.containerItem}
                    onPress={() => { onClose(); onNavigate(item.id); }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`Ir a ${item.name}`}
                  >
                    <View style={[styles.containerItemIcon, { backgroundColor: `${accentColor}22` }]}>
                      <Ionicons name={iconName} size={18} color={accentColor} />
                    </View>
                    <View style={styles.containerItemInfo}>
                      <Text variant="labelLarge" color={Colors.textPrimary} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text variant="caption" color={Colors.textTertiary}>
                        {CONTAINER_TYPE_LABELS[item.type]}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── LocationsScreen ──────────────────────────────────────────────────────────
export default function LocationsScreen() {
  const { goBack, navigate } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [locations, setLocations] = useState<Location[]>([]);
  const [containerCounts, setContainerCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [viewingLocation, setViewingLocation] = useState<Location | null>(null);
  const [containersModalVisible, setContainersModalVisible] = useState(false);

  const loadLocations = useCallback(async () => {
    setIsLoading(true);
    try {
      const all = await LocationRepository.findAll();
      setLocations(all);
      // Load container counts per location
      const counts: Record<string, number> = {};
      await Promise.all(
        all.map(async (loc) => {
          const containers = await ContainerRepository.findByLocationId(loc.id);
          counts[loc.id] = containers.length;
        })
      );
      setContainerCounts(counts);
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadLocations(); }, [loadLocations]);

  const handleOpenCreate = () => {
    setEditingLocation(null);
    setModalVisible(true);
    Haptics.selectionAsync();
  };

  const handleOpenEdit = (loc: Location) => {
    setEditingLocation(loc);
    setModalVisible(true);
  };

  const handleSave = async (name: string, icon: string) => {
    if (editingLocation) {
      await LocationRepository.update(editingLocation.id, { name, icon });
    } else {
      await LocationRepository.create({ name, icon });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await loadLocations();
  };

  const handleDelete = (loc: Location) => {
    const count = containerCounts[loc.id] ?? 0;
    Alert.alert(
      'Eliminar ubicación',
      count > 0
        ? `"${loc.name}" tiene ${count} contenedor${count !== 1 ? 'es' : ''}. Se quitará la ubicación de esos contenedores.`
        : `¿Eliminar "${loc.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await LocationRepository.delete(loc.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              await loadLocations();
            } catch {
              Alert.alert('Error', 'No se pudo eliminar la ubicación.');
            }
          },
        },
      ]
    );
  };

  const handleViewContainers = (loc: Location) => {
    setViewingLocation(loc);
    setContainersModalVisible(true);
    Haptics.selectionAsync();
  };

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
          <Text variant="headingSmall" color={Colors.textPrimary}>Ubicaciones</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleOpenCreate}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Nueva ubicación"
        >
          <Ionicons name="add" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {locations.length > 0 && (
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { borderColor: Colors.warning, backgroundColor: `${Colors.warning}18` }]}>
            <Ionicons name="location" size={12} color={Colors.warning} style={{ marginRight: 4 }} />
            <Text variant="labelSmall" color={Colors.warning}>{locations.length} ubicaciones</Text>
          </View>
          <View style={[styles.statChip, { borderColor: Colors.primary, backgroundColor: Colors.primaryGlow, marginLeft: Spacing[2] }]}>
            <Ionicons name="cube" size={12} color={Colors.primary} style={{ marginRight: 4 }} />
            <Text variant="labelSmall" color={Colors.primary}>
              {Object.values(containerCounts).reduce((a, b) => a + b, 0)} contenedores
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isLoading && locations.length === 0 && (
          <EmptyState
            icon="location-outline"
            title="Sin ubicaciones"
            description="Crea ubicaciones para organizar tus contenedores por lugar."
            actionLabel="Crear ubicación"
            onAction={handleOpenCreate}
          />
        )}

        {locations.map((loc, index) => (
          <LocationCard
            key={loc.id}
            location={loc}
            containerCount={containerCounts[loc.id] ?? 0}
            index={index}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onViewContainers={handleViewContainers}
          />
        ))}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <LocationEditorModal
        visible={modalVisible}
        location={editingLocation}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />

      <ContainersByLocationModal
        visible={containersModalVisible}
        location={viewingLocation}
        onClose={() => setContainersModalVisible(false)}
        onNavigate={(id) => navigate('ContainerDetail', { containerId: id })}
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
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
  locationCard: {
    marginBottom: Spacing[2],
  },
  locationCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    ...Shadows.sm,
  },
  locationIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  locationInfo: {
    flex: 1,
  },
  locationActions: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  locationActionBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationDeleteBtn: {
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
  containersModal: {
    maxHeight: '70%',
    paddingBottom: Spacing[5],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[4],
  },
  locationModalTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    marginBottom: Spacing[4],
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  previewName: {
    flex: 1,
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
  iconLabel: {
    letterSpacing: 2,
    marginBottom: Spacing[3],
    marginTop: Spacing[2],
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    marginBottom: Spacing[5],
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
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
  // Containers list in modal
  containersList: {
    maxHeight: 300,
  },
  containerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    marginBottom: Spacing[2],
  },
  containerItemIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  containerItemInfo: {
    flex: 1,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: Spacing[8],
  },
});

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text, FloatingActionButton, SkeletonItemCard, FavoriteButton, EmptyState } from '../components/ui';
import { Colors, Spacing, BorderRadius, Shadows, FontFamily, FontSize } from '../theme';
import { useContainerStore } from '../store/containerStore';
import { useItemStore } from '../store/itemStore';
import { useAppNavigation } from '../navigation/NavigationContext';
import type { Item } from '../types/Item';
import { CONTAINER_TYPE_LABELS, CONTAINER_TYPE_ICONS } from '../types/common';
import { formatRelativeDate } from '../utils/dateUtils';
import { ECO_ACTION_ICONS } from '../types/Eco';
import type { EcoAction } from '../types/Item';

const HEADER_MAX_HEIGHT = 220;
const HEADER_MIN_HEIGHT = 72;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// ─── Item Card ────────────────────────────────────────────────────────────────
const ItemCard = React.memo(function ItemCard({
  item,
  index,
  onDelete,
  onToggleFavorite,
  onEdit,
  onEcoAction,
}: {
  item: Item;
  index: number;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (id: string) => void;
  onEcoAction: (id: string) => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 260,
        delay: Math.min(index * 45, 280),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        delay: Math.min(index * 45, 280),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 8 }).start();

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(item.name, '¿Qué deseas hacer con este ítem?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Editar', onPress: () => onEdit(item.id) },
      {
        text: 'Acción ecológica',
        onPress: () => onEcoAction(item.id),
      },
      { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(item.id) },
    ]);
  };

  const hasImage = !!item.cover_image_uri;

  return (
    <Animated.View
      style={[
        styles.itemCardWrapper,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        style={styles.itemCard}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, cantidad ${item.quantity}`}
        accessibilityHint="Mantén presionado para opciones"
      >
        {/* Thumbnail or icon */}
        {hasImage ? (
          <View>
            <Image
              source={{ uri: item.cover_image_uri }}
              style={styles.itemThumbnail}
              resizeMode="cover"
            />
            {item.eco_action && (
              <View style={styles.ecoBadge}>
                <Ionicons
                  name={ECO_ACTION_ICONS[item.eco_action as EcoAction] as React.ComponentProps<typeof Ionicons>['name']}
                  size={10}
                  color={Colors.accent}
                />
              </View>
            )}
          </View>
        ) : (
          <View>
            <View style={styles.itemIconWrapper}>
              <Ionicons name="pricetag" size={22} color={Colors.accent} />
            </View>
            {item.eco_action && (
              <View style={styles.ecoBadge}>
                <Ionicons
                  name={ECO_ACTION_ICONS[item.eco_action as EcoAction] as React.ComponentProps<typeof Ionicons>['name']}
                  size={10}
                  color={Colors.accent}
                />
              </View>
            )}
          </View>
        )}

        <View style={styles.itemInfo}>
          <View style={styles.itemTitleRow}>
            <Text variant="labelLarge" color={Colors.textPrimary} numberOfLines={1} style={styles.itemTitle}>
              {item.name}
            </Text>
            {item.is_favorite && (
              <Ionicons name="heart" size={11} color={Colors.secondary} style={styles.itemFavIcon} />
            )}
          </View>
          {item.description ? (
            <Text variant="bodySmall" color={Colors.textTertiary} numberOfLines={2} style={styles.itemDesc}>
              {item.description}
            </Text>
          ) : null}
          <Text variant="caption" color={Colors.textTertiary} style={styles.itemDate}>
            {formatRelativeDate(item.updated_at)}
          </Text>
        </View>

        <View style={styles.itemRight}>
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityValue}>{item.quantity}</Text>
            <Text style={styles.quantityUnit}>uds</Text>
          </View>
          <FavoriteButton
            isFavorite={item.is_favorite}
            onToggle={() => onToggleFavorite(item.id)}
            size={16}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── ContainerDetailScreen ────────────────────────────────────────────────────
export default function ContainerDetailScreen() {
  const { goBack, navigate, params } = useAppNavigation();
  const containerId = params?.containerId ?? '';
  const insets = useSafeAreaInsets();

  const { selectedContainer, loadContainerById, toggleFavorite } = useContainerStore();
  const { itemsByContainer, isLoading, loadItemsByContainer, deleteItem, toggleFavorite: toggleItemFavorite } = useItemStore();
  const items = itemsByContainer[containerId] ?? [];

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-16)).current;

  useEffect(() => {
    if (containerId) {
      loadContainerById(containerId);
      loadItemsByContainer(containerId);
    }
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [containerId, loadContainerById, loadItemsByContainer, headerFade, headerSlide]);

  const container = selectedContainer?.id === containerId ? selectedContainer : null;
  const accentColor = container?.color_tag ?? Colors.primary;
  const iconName = container
    ? (CONTAINER_TYPE_ICONS[container.type] as React.ComponentProps<typeof Ionicons>['name'])
    : 'cube-outline';
  const hasHeroImage = !!container?.cover_image_uri;

  // Scroll-driven header collapse
  const heroHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });
  const titleScale = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.82],
    extrapolate: 'clamp',
  });
  const stickyTitleOpacity = scrollY.interpolate({
    inputRange: [HEADER_SCROLL_DISTANCE * 0.7, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      try {
        await deleteItem(itemId, containerId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {
        Alert.alert('Error', 'No se pudo eliminar el ítem.');
      }
    },
    [deleteItem, containerId]
  );

  const handleToggleFavorite = useCallback(async () => {
    if (!container) return;
    await toggleFavorite(container.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [container, toggleFavorite]);

  const handleToggleItemFavorite = useCallback(
    async (itemId: string) => {
      await toggleItemFavorite(itemId, containerId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [toggleItemFavorite, containerId]
  );

  const handleEditItem = useCallback(
    (itemId: string) => {
      navigate('EditItem', { itemId, containerId });
    },
    [navigate, containerId]
  );

  const handleEcoAction = useCallback(
    (itemId: string) => {
      navigate('EcoItemDetail', { itemId });
    },
    [navigate]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Item; index: number }) => (
      <ItemCard
        item={item}
        index={index}
        onDelete={handleDeleteItem}
        onToggleFavorite={handleToggleItemFavorite}
        onEdit={handleEditItem}
        onEcoAction={handleEcoAction}
      />
    ),
    [handleDeleteItem, handleToggleItemFavorite, handleEditItem, handleEcoAction]
  );

  const keyExtractor = useCallback((item: Item) => item.id, []);

  const totalUnits = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items]
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <View style={[styles.listHeaderAccent, { backgroundColor: accentColor }]} />
        <Text variant="labelMedium" color={Colors.textTertiary} style={styles.listHeaderText}>
          CONTENIDO ({items.length})
        </Text>
        {items.length > 0 && (
          <Text variant="caption" color={Colors.textTertiary}>
            {totalUnits} uds
          </Text>
        )}
      </View>
    ),
    [accentColor, items.length, totalUnits]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Outer view handles height (useNativeDriver: false) */}
      <Animated.View style={[styles.heroOuter, { height: heroHeight }]}>
        {/* Inner view handles fade+slide entrance (useNativeDriver: true) */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.heroInner,
            { opacity: headerFade, transform: [{ translateY: headerSlide }] },
          ]}
        >
          {/* Hero image background */}
          {hasHeroImage && (
            <Image
              source={{ uri: container!.cover_image_uri }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          )}
          <LinearGradient
            colors={hasHeroImage
              ? ['rgba(0,0,0,0.3)', Colors.background]
              : [`${accentColor}30`, Colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          {/* Nav row — always visible */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={goBack}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
              <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            </TouchableOpacity>

            {/* Sticky title appears when collapsed */}
            <Animated.View style={[styles.stickyTitle, { opacity: stickyTitleOpacity }]}>
              <Text variant="labelLarge" color={Colors.textPrimary} numberOfLines={1}>
                {container?.name ?? ''}
              </Text>
            </Animated.View>

            <View style={styles.navRight}>
              {container && (
                <FavoriteButton
                  isFavorite={container.is_favorite}
                  onToggle={handleToggleFavorite}
                  size={20}
                />
              )}
              <TouchableOpacity
                style={[styles.editButton, { marginLeft: Spacing[2] }]}
                onPress={() => navigate('EditContainer', { containerId })}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Editar contenedor"
              >
                <Ionicons name="create-outline" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Expandable content */}
          <Animated.View style={[styles.heroContent, { opacity: heroOpacity }]}>
            {!hasHeroImage && (
              <Animated.View
                style={[
                  styles.heroIconWrapper,
                  {
                    backgroundColor: `${accentColor}22`,
                    borderColor: `${accentColor}55`,
                    transform: [{ scale: titleScale }],
                  },
                ]}
              >
                <Ionicons name={iconName} size={36} color={accentColor} />
              </Animated.View>
            )}
            <View style={[styles.heroInfo, hasHeroImage && styles.heroInfoFull]}>
              <Text variant="headingLarge" color={Colors.textPrimary} numberOfLines={2}>
                {container?.name ?? '...'}
              </Text>
              <View style={styles.heroBadgeRow}>
                <View style={[styles.typeBadge, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}44` }]}>
                  <Text variant="labelSmall" color={accentColor}>
                    {container ? CONTAINER_TYPE_LABELS[container.type] : ''}
                  </Text>
                </View>
                {container?.is_favorite && (
                  <View style={styles.favBadge}>
                    <Ionicons name="heart" size={10} color={Colors.secondary} />
                    <Text variant="labelSmall" color={Colors.secondary} style={{ marginLeft: 4 }}>
                      Favorito
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Stats row */}
          <Animated.View style={[styles.statsRow, { opacity: heroOpacity }]}>
            <View style={styles.statBox}>
              <Text variant="headingMedium" color={Colors.textPrimary}>{items.length}</Text>
              <Text variant="caption" color={Colors.textTertiary}>Tipos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text variant="headingMedium" color={Colors.textPrimary}>{totalUnits}</Text>
              <Text variant="caption" color={Colors.textTertiary}>Unidades</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text variant="headingMedium" color={Colors.textPrimary} numberOfLines={1} style={styles.statDate}>
                {container ? formatRelativeDate(container.updated_at) : '—'}
              </Text>
              <Text variant="caption" color={Colors.textTertiary}>Actualizado</Text>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Skeleton loading */}
      {isLoading && items.length === 0 && (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2, 3].map((i) => <SkeletonItemCard key={i} />)}
        </View>
      )}

      {/* Items list */}
      {(!isLoading || items.length > 0) && (
        <Animated.FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          initialNumToRender={8}
          windowSize={10}
          updateCellsBatchingPeriod={50}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon="archive-outline"
                title="Contenedor vacío"
                description="Toca + para agregar el primer ítem a este contenedor."
              />
            ) : null
          }
        />
      )}

      <FloatingActionButton
        onPress={() => navigate('CreateItem', { containerId })}
        icon="add"
        bottom={90}
        right={Spacing[5]}
        gradient={Colors.gradients.accent}
        accessibilityLabel="Agregar ítem"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  heroOuter: {
    overflow: 'hidden',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  heroInner: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing[3],
    marginBottom: Spacing[3],
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
  stickyTitle: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
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
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing[3],
  },
  heroIconWrapper: {
    width: 68,
    height: 68,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[4],
  },
  heroInfo: {
    flex: 1,
    paddingTop: 2,
  },
  heroInfoFull: {
    // full width when no icon (hero image mode)
  },
  heroDesc: {
    marginTop: Spacing[1],
    marginBottom: Spacing[2],
  },
  heroBadgeRow: {
    flexDirection: 'row',
    marginTop: Spacing[2],
    gap: Spacing[2],
  },
  typeBadge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  favBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: `${Colors.secondary}44`,
    backgroundColor: `${Colors.secondary}12`,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing[3],
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[3],
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[2],
  },
  statDate: {
    fontSize: FontSize.sm,
  },
  skeletonContainer: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },
  listHeaderAccent: {
    width: 3,
    height: 14,
    borderRadius: BorderRadius.full,
    marginRight: Spacing[3],
  },
  listHeaderText: {
    letterSpacing: 2,
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: 120,
  },
  itemCardWrapper: {
    marginBottom: Spacing[2],
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    ...Shadows.sm,
  },
  itemIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    backgroundColor: `${Colors.accent}18`,
    borderWidth: 1,
    borderColor: `${Colors.accent}33`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  itemThumbnail: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing[3],
  },
  ecoBadge: {
    position: 'absolute',
    top: -4,
    right: Spacing[3] - 4,
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.accentGlow,
    borderWidth: 1,
    borderColor: `${Colors.accent}66`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTitle: {
    flex: 1,
  },
  itemFavIcon: {
    marginLeft: Spacing[1],
  },
  itemInfo: {
    flex: 1,
  },
  itemDesc: {
    marginTop: 2,
  },
  itemDate: {
    marginTop: 4,
  },
  itemRight: {
    marginLeft: Spacing[3],
    alignItems: 'center',
    gap: Spacing[2],
  },
  quantityBadge: {
    alignItems: 'center',
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    minWidth: 48,
  },
  quantityValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.primary,
    lineHeight: 24,
  },
  quantityUnit: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 14,
  },
});

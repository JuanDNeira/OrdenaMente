import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  Image,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Text,
  EmptyState,
  FloatingActionButton,
  SkeletonContainerCard,
  FavoriteButton,
} from '../components/ui';
import { Colors, Spacing, BorderRadius, Shadows, FontFamily, FontSize } from '../theme';
import { useContainerStore } from '../store/containerStore';
import { useAppNavigation } from '../navigation/NavigationContext';
import { ContainerRepository } from '../database/repositories/ContainerRepository';
import type { Container } from '../types/Container';
import { CONTAINER_TYPE_LABELS, CONTAINER_TYPE_ICONS } from '../types/common';
import { formatRelativeDate } from '../utils/dateUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_IMAGE_HEIGHT = 110;

// ─── Quick action button ──────────────────────────────────────────────────────
function QuickAction({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 10 }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.quickAction}
        onPress={() => { Haptics.selectionAsync(); onPress(); }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${color}22`, borderColor: `${color}44` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text variant="caption" color={Colors.textSecondary} style={styles.quickActionLabel}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Container poster card ────────────────────────────────────────────────────
const ContainerPosterCard = React.memo(function ContainerPosterCard({
  container,
  onPress,
  onToggleFavorite,
  index,
}: {
  container: Container;
  onPress: () => void;
  onToggleFavorite: (id: string) => void;
  index: number;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        delay: Math.min(index * 55, 300),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        delay: Math.min(index * 55, 300),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 8 }).start();

  const accentColor = container.color_tag ?? Colors.primary;
  const iconName = CONTAINER_TYPE_ICONS[container.type] as React.ComponentProps<typeof Ionicons>['name'];
  const itemCount = container.item_count ?? 0;
  const hasImage = !!container.cover_image_uri;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`${container.name}, ${itemCount} ítems${container.is_favorite ? ', favorito' : ''}`}
      >
        {/* Hero image or gradient background */}
        {hasImage ? (
          <View style={styles.cardHeroWrapper}>
            <Image
              source={{ uri: container.cover_image_uri }}
              style={styles.cardHeroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', Colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.cardHeroGradient}
            />
            {/* Favorite button overlay */}
            <View style={styles.cardHeroFav}>
              <FavoriteButton
                isFavorite={container.is_favorite}
                onToggle={() => onToggleFavorite(container.id)}
                size={20}
              />
            </View>
            {/* Type pill overlay */}
            <View style={[styles.cardHeroTypePill, { backgroundColor: `${accentColor}CC` }]}>
              <Ionicons name={iconName} size={10} color={Colors.textPrimary} style={styles.typePillIcon} />
              <Text style={styles.cardHeroTypePillText}>
                {CONTAINER_TYPE_LABELS[container.type].toUpperCase()}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <LinearGradient
              colors={[`${accentColor}14`, Colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.topAccent, { backgroundColor: accentColor }]} />
          </>
        )}

        <View style={styles.cardInner}>
          {!hasImage && (
            <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}40` }]}>
              <Ionicons name={iconName} size={28} color={accentColor} />
            </View>
          )}

          <View style={[styles.cardInfo, hasImage && styles.cardInfoFull]}>
            <Text variant="labelLarge" color={Colors.textPrimary} numberOfLines={1} style={styles.cardName}>
              {container.name}
            </Text>
            <Text variant="bodySmall" color={Colors.textTertiary} numberOfLines={1} style={styles.cardDesc}>
              {container.description || CONTAINER_TYPE_LABELS[container.type]}
            </Text>
            <Text variant="caption" color={Colors.textTertiary} style={styles.cardDate}>
              {formatRelativeDate(container.updated_at)}
            </Text>
          </View>

          <View style={styles.cardRight}>
            <View style={[styles.itemCountBadge, { backgroundColor: `${accentColor}20`, borderColor: `${accentColor}50` }]}>
              <Text style={[styles.itemCountText, { color: accentColor }]}>{itemCount}</Text>
              <Text style={styles.itemCountLabel}>ítems</Text>
            </View>
            {!hasImage && (
              <FavoriteButton
                isFavorite={container.is_favorite}
                onToggle={() => onToggleFavorite(container.id)}
                size={18}
              />
            )}
          </View>
        </View>

        {!hasImage && (
          <View style={styles.cardFooter}>
            <View style={[styles.typePill, { backgroundColor: `${accentColor}12` }]}>
              <Ionicons name={iconName} size={10} color={accentColor} style={styles.typePillIcon} />
              <Text style={[styles.typePillText, { color: accentColor }]}>
                {CONTAINER_TYPE_LABELS[container.type].toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── Favorites horizontal strip ──────────────────────────────────────────────
const FavoriteStrip = React.memo(function FavoriteStrip({
  favorites,
  onPress,
}: {
  favorites: Container[];
  onPress: (id: string) => void;
}) {
  if (favorites.length === 0) return null;
  return (
    <View style={styles.favSection}>
      <View style={styles.listHeader}>
        <View style={[styles.listHeaderAccent, { backgroundColor: Colors.secondary }]} />
        <Text variant="labelMedium" color={Colors.textTertiary} style={styles.listHeaderText}>
          FAVORITOS
        </Text>
        <Ionicons name="heart" size={12} color={Colors.secondary} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.favScrollContent}
      >
        {favorites.map((c) => {
          const accentColor = c.color_tag ?? Colors.primary;
          const iconName = CONTAINER_TYPE_ICONS[c.type] as React.ComponentProps<typeof Ionicons>['name'];
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.favChip, { borderColor: `${accentColor}55`, backgroundColor: `${accentColor}12` }]}
              onPress={() => { Haptics.selectionAsync(); onPress(c.id); }}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Favorito: ${c.name}`}
            >
              {c.cover_image_uri ? (
                <Image source={{ uri: c.cover_image_uri }} style={styles.favChipImage} />
              ) : (
                <View style={[styles.favChipIcon, { backgroundColor: `${accentColor}22` }]}>
                  <Ionicons name={iconName} size={16} color={accentColor} />
                </View>
              )}
              <Text variant="labelSmall" color={Colors.textPrimary} numberOfLines={1} style={styles.favChipLabel}>
                {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

// ─── List header ──────────────────────────────────────────────────────────────
function ListHeader({
  containers,
  favorites,
  onSearch,
  onCreateContainer,
  onNavigate,
  totalItems,
}: {
  containers: Container[];
  favorites: Container[];
  onSearch: () => void;
  onCreateContainer: () => void;
  onNavigate: (route: string) => void;
  totalItems: number;
}) {
  return (
    <>
      {/* Stats strip */}
      {containers.length > 0 && (
        <View style={styles.statsStrip}>
          <LinearGradient
            colors={[Colors.primaryGlow, Colors.backgroundSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.statsGradient}
          >
            <View style={styles.statItem}>
              <Text variant="headingSmall" color={Colors.primary}>{containers.length}</Text>
              <Text variant="caption" color={Colors.textTertiary}>Contenedores</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headingSmall" color={Colors.accent}>{totalItems}</Text>
              <Text variant="caption" color={Colors.textTertiary}>Ítems totales</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text variant="headingSmall" color={Colors.secondary}>{favorites.length}</Text>
              <Text variant="caption" color={Colors.textTertiary}>Favoritos</Text>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.quickActionsRow}>
        <QuickAction
          icon="add-circle-outline"
          label="Nuevo"
          color={Colors.primary}
          onPress={onCreateContainer}
        />
        <QuickAction
          icon="search-outline"
          label="Buscar"
          color={Colors.accent}
          onPress={onSearch}
        />
        <QuickAction
          icon="location-outline"
          label="Lugares"
          color={Colors.warning}
          onPress={() => onNavigate('Locations')}
        />
        <QuickAction
          icon="pricetag-outline"
          label="Tags"
          color={Colors.secondary}
          onPress={() => onNavigate('Tags')}
        />
        <QuickAction
          icon="settings-outline"
          label="Config"
          color={Colors.textSecondary}
          onPress={() => onNavigate('Settings')}
        />
      </View>

      {/* Favorites strip */}
      <FavoriteStrip favorites={favorites} onPress={(id) => onNavigate(`ContainerDetail:${id}`)} />

      {/* Section label */}
      {containers.length > 0 && (
        <View style={styles.listHeader}>
          <View style={styles.listHeaderAccent} />
          <Text variant="labelMedium" color={Colors.textTertiary} style={styles.listHeaderText}>
            MIS CONTENEDORES
          </Text>
          <Text variant="caption" color={Colors.primary} style={styles.listHeaderCount}>
            {containers.length}
          </Text>
        </View>
      )}
    </>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { navigate } = useAppNavigation();
  const { containers, isLoading, loadContainers, toggleFavorite } = useContainerStore();
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<Container[]>([]);

  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-10)).current;

  const loadFavorites = useCallback(async () => {
    try {
      const favs = await ContainerRepository.findFavorites();
      setFavorites(favs);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    loadContainers();
    loadFavorites();
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [loadContainers, loadFavorites, headerFade, headerSlide]);

  const handleRefresh = useCallback(async () => {
    await loadContainers();
    await loadFavorites();
  }, [loadContainers, loadFavorites]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    await toggleFavorite(id);
    await loadFavorites();
  }, [toggleFavorite, loadFavorites]);

  const handleNavigate = useCallback((route: string) => {
    if (route.startsWith('ContainerDetail:')) {
      const containerId = route.split(':')[1];
      navigate('ContainerDetail', { containerId });
    } else {
      navigate(route as any);
    }
  }, [navigate]);

  const totalItems = useMemo(
    () => containers.reduce((sum, c) => sum + (c.item_count ?? 0), 0),
    [containers]
  );

  const renderContainer = useCallback(
    ({ item, index }: { item: Container; index: number }) => (
      <ContainerPosterCard
        container={item}
        index={index}
        onPress={() => navigate('ContainerDetail', { containerId: item.id })}
        onToggleFavorite={handleToggleFavorite}
      />
    ),
    [navigate, handleToggleFavorite]
  );

  const keyExtractor = useCallback((item: Container) => item.id, []);

  const listHeader = useMemo(
    () => (
      <ListHeader
        containers={containers}
        favorites={favorites}
        onSearch={() => navigate('Search')}
        onCreateContainer={() => navigate('CreateContainer')}
        onNavigate={handleNavigate}
        totalItems={totalItems}
      />
    ),
    [containers, favorites, navigate, handleNavigate, totalItems]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Animated header */}
      <Animated.View
        style={[
          styles.header,
          { opacity: headerFade, transform: [{ translateY: headerSlide }] },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text variant="labelSmall" color={Colors.textTertiary} style={styles.greeting}>
            BIENVENIDO A
          </Text>
          <Text variant="headingLarge" color={Colors.textPrimary}>OrdenaMente</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigate('Settings')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Configuración"
          >
            <Ionicons name="settings-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconButton, styles.headerIconButtonSpaced]}
            onPress={() => navigate('Search')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Buscar"
          >
            <Ionicons name="search-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Skeleton loading */}
      {isLoading && containers.length === 0 && (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2, 3].map((i) => (
            <SkeletonContainerCard key={i} />
          ))}
        </View>
      )}

      {/* Main list */}
      {!isLoading || containers.length > 0 ? (
        <FlatList
          data={containers}
          keyExtractor={keyExtractor}
          renderItem={renderContainer}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={8}
          initialNumToRender={6}
          windowSize={10}
          updateCellsBatchingPeriod={50}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            !isLoading ? (
              <EmptyState
                icon="cube-outline"
                title="Sin contenedores"
                description="Crea tu primer contenedor para empezar a organizar tus cosas."
                actionLabel="Crear contenedor"
                onAction={() => navigate('CreateContainer')}
              />
            ) : null
          }
        />
      ) : null}

      <FloatingActionButton
        onPress={() => navigate('CreateContainer')}
        icon="add"
        bottom={90}
        right={Spacing[5]}
        accessibilityLabel="Crear contenedor"
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
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
  headerIconButtonSpaced: {
    marginLeft: Spacing[2],
  },
  skeletonContainer: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
  },
  statsStrip: {
    marginBottom: Spacing[4],
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsGradient: {
    flexDirection: 'row',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing[4],
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[1],
  },
  quickActionLabel: {
    textAlign: 'center',
  },
  // Favorites strip
  favSection: {
    marginBottom: Spacing[4],
  },
  favScrollContent: {
    paddingBottom: Spacing[1],
  },
  favChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    marginRight: Spacing[2],
    maxWidth: 160,
  },
  favChipImage: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing[2],
  },
  favChipIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[2],
  },
  favChipLabel: {
    flex: 1,
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
    backgroundColor: Colors.primary,
    marginRight: Spacing[3],
  },
  listHeaderText: {
    letterSpacing: 2,
    flex: 1,
  },
  listHeaderCount: {
    backgroundColor: Colors.primaryGlow,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: 120,
  },
  cardWrapper: {
    marginBottom: Spacing[3],
  },
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    ...Shadows.cardShadow,
  },
  // Hero image styles
  cardHeroWrapper: {
    height: CARD_IMAGE_HEIGHT,
    position: 'relative',
  },
  cardHeroImage: {
    width: '100%',
    height: '100%',
  },
  cardHeroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  cardHeroFav: {
    position: 'absolute',
    top: Spacing[2],
    right: Spacing[3],
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: BorderRadius.full,
    padding: 6,
  },
  cardHeroTypePill: {
    position: 'absolute',
    bottom: Spacing[2],
    left: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  cardHeroTypePillText: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    letterSpacing: 1,
    color: Colors.textPrimary,
  },
  topAccent: {
    height: 3,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[4],
  },
  cardInfo: {
    flex: 1,
  },
  cardInfoFull: {
    // when there's a hero image, no icon so info takes full width
  },
  cardName: {
    marginBottom: 3,
  },
  cardDesc: {
    marginBottom: 4,
  },
  cardDate: {},
  cardRight: {
    alignItems: 'center',
    marginLeft: Spacing[3],
    gap: Spacing[2],
  },
  itemCountBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 50,
  },
  itemCountText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    lineHeight: 24,
  },
  itemCountLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: BorderRadius.xs,
  },
  typePillIcon: {
    marginRight: 4,
  },
  typePillText: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    letterSpacing: 1,
  },
});

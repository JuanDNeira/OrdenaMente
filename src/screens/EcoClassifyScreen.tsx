/**
 * EcoClassifyScreen — Flujo de clasificación ecológica de ítems.
 * Task 7 — implementación visual completa.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Text,
  Button,
  EmptyState,
  SkeletonLoader,
  SectionHeader,
} from '../components/ui';
import { Colors, Spacing, BorderRadius, Shadows, FontFamily, FontSize } from '../theme';
import { useEcoStore } from '../store/ecoStore';
import { useAppNavigation } from '../navigation/NavigationContext';
import {
  ECO_ACTION_LABELS,
  ECO_ACTION_ICONS,
  ECO_ACTIONS,
} from '../types/Eco';
import type { EcoAction } from '../types/Item';
import type { Item } from '../types/Item';

// ─── Colores contextuales por acción ─────────────────────────────────────────
const ECO_ACTION_COLORS: Record<EcoAction, string> = {
  recycle: Colors.accent,
  donate:  Colors.secondary,
  sell:    Colors.warning,
  reuse:   Colors.info,
  repair:  Colors.primary,
  discard: Colors.textTertiary,
};

// ─── FilterChip ───────────────────────────────────────────────────────────────
const FilterChip = React.memo(function FilterChip({
  label,
  icon,
  active,
  color,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        chipStyles.chip,
        active
          ? { backgroundColor: `${color}22`, borderColor: color }
          : { backgroundColor: Colors.surface, borderColor: Colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Ionicons name={icon} size={13} color={active ? color : Colors.textTertiary} />
      <Text style={[chipStyles.label, { color: active ? color : Colors.textTertiary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing[3],
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing[2],
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
});

// ─── EcoActionButton ──────────────────────────────────────────────────────────
const EcoActionButton = React.memo(function EcoActionButton({
  action,
  onPress,
  disabled,
}: {
  action: EcoAction;
  onPress: (action: EcoAction) => void;
  disabled: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const color = ECO_ACTION_COLORS[action];
  const icon = ECO_ACTION_ICONS[action] as React.ComponentProps<typeof Ionicons>['name'];
  const label = ECO_ACTION_LABELS[action];

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.92, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 10 }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (!disabled) onPress(action);
  }, [action, disabled, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={disabled}
      style={actionStyles.wrapper}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          actionStyles.btn,
          { borderColor: `${color}55`, opacity: disabled ? 0.5 : 1 },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={[actionStyles.iconWrap, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={[actionStyles.label, { color: Colors.textPrimary }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
});

const actionStyles = StyleSheet.create({
  wrapper: { width: '31%' },
  btn: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing[3],
    alignItems: 'center',
    gap: Spacing[2],
    ...Shadows.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});

// ─── ItemClassifyCard ─────────────────────────────────────────────────────────
const ItemClassifyCard = React.memo(function ItemClassifyCard({
  item,
  fadeAnim,
  slideAnim,
}: {
  item: Item;
  fadeAnim: Animated.Value;
  slideAnim: Animated.Value;
}) {
  const hasImage = !!item.cover_image_uri;

  return (
    <Animated.View
      style={[
        cardStyles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Glassmorphism background */}
      <LinearGradient
        colors={[Colors.glass, Colors.glassDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        borderRadius={BorderRadius['2xl']}
      />

      {/* Image or icon */}
      {hasImage ? (
        <Image
          source={{ uri: item.cover_image_uri }}
          style={cardStyles.heroImage}
          resizeMode="cover"
        />
      ) : (
        <View style={cardStyles.iconPlaceholder}>
          <LinearGradient
            colors={Colors.gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            borderRadius={BorderRadius.xl}
          />
          <Ionicons name="pricetag" size={36} color="rgba(255,255,255,0.9)" />
        </View>
      )}

      {/* Info */}
      <View style={cardStyles.info}>
        <Text style={cardStyles.name} numberOfLines={2}>{item.name}</Text>
        {item.description ? (
          <Text style={cardStyles.desc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={cardStyles.metaRow}>
          <View style={cardStyles.metaBadge}>
            <Ionicons name="cube-outline" size={11} color={Colors.textTertiary} />
            <Text style={cardStyles.metaText}>
              {item.quantity} {item.quantity === 1 ? 'unidad' : 'unidades'}
            </Text>
          </View>
          {item.is_favorite && (
            <View style={cardStyles.favBadge}>
              <Ionicons name="heart" size={11} color={Colors.secondary} />
              <Text style={[cardStyles.metaText, { color: Colors.secondary }]}>Favorito</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    marginHorizontal: Spacing[4],
    ...Shadows.lg,
  },
  heroImage: {
    width: '100%',
    height: 180,
  },
  iconPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: {
    padding: Spacing[5],
    gap: Spacing[2],
  },
  name: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  desc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing[3],
    marginTop: Spacing[1],
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  favBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    backgroundColor: `${Colors.secondary}12`,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: `${Colors.secondary}33`,
  },
  metaText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
});

// ─── SummaryScreen ────────────────────────────────────────────────────────────
function SummaryScreen({
  classifiedCount,
  totalCount,
  onFinish,
}: {
  classifiedCount: number;
  totalCount: number;
  onFinish: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const skipped = totalCount - classifiedCount;

  return (
    <Animated.View
      style={[summaryStyles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
    >
      <LinearGradient
        colors={Colors.gradients.accent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={summaryStyles.iconCircle}
      >
        <Ionicons name="checkmark-circle" size={48} color={Colors.textPrimary} />
      </LinearGradient>

      <Text style={summaryStyles.title}>¡Sesión completada!</Text>
      <Text style={summaryStyles.subtitle}>
        Revisaste {totalCount} {totalCount === 1 ? 'objeto' : 'objetos'} en esta sesión
      </Text>

      <View style={summaryStyles.statsRow}>
        <View style={summaryStyles.statBox}>
          <Text style={[summaryStyles.statValue, { color: Colors.accent }]}>{classifiedCount}</Text>
          <Text style={summaryStyles.statLabel}>Clasificados</Text>
        </View>
        <View style={summaryStyles.statDivider} />
        <View style={summaryStyles.statBox}>
          <Text style={[summaryStyles.statValue, { color: Colors.textTertiary }]}>{skipped}</Text>
          <Text style={summaryStyles.statLabel}>Omitidos</Text>
        </View>
      </View>

      <Button
        label="Finalizar"
        onPress={onFinish}
        variant="primary"
        style={summaryStyles.btn}
      />
    </Animated.View>
  );
}

const summaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    gap: Spacing[5],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.accentGlow,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    width: '100%',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[4],
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[3],
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    lineHeight: 34,
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  btn: { width: '100%' },
});

// ─── EcoClassifyScreen ────────────────────────────────────────────────────────
export default function EcoClassifyScreen() {
  const { goBack } = useAppNavigation();
  const insets = useSafeAreaInsets();

  const {
    unclassifiedItems,
    isLoadingItems,
    assignEcoAction,
    skipItem,
    loadUnclassifiedItems,
  } = useEcoStore();

  // ── Estado local ──────────────────────────────────────────────────────────
  const [currentIndex, setCurrentIndex] = useState(0);
  const [classifiedCount, setClassifiedCount] = useState(0);
  const [activeFilter, setActiveFilter] = useState<EcoAction | 'all'>('all');
  const [isActing, setIsActing] = useState(false); // evita doble tap

  // Total fijado al montar — no cambia durante la sesión
  const totalRef = useRef(0);

  // ── Animaciones de transición entre cards ─────────────────────────────────
  const cardFade  = useRef(new Animated.Value(1)).current;
  const cardSlide = useRef(new Animated.Value(0)).current;

  const transitionToNext = useCallback((onMidpoint: () => void) => {
    Animated.parallel([
      Animated.timing(cardFade,  { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: -20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      onMidpoint();
      cardSlide.setValue(20);
      Animated.parallel([
        Animated.timing(cardFade,  { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(cardSlide, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    });
  }, [cardFade, cardSlide]);

  // ── Carga inicial — fija el total al montar ───────────────────────────────
  useEffect(() => {
    loadUnclassifiedItems(90).then(() => {
      totalRef.current = useEcoStore.getState().unclassifiedItems.length;
    });
  }, [loadUnclassifiedItems]);

  // Actualizar total cuando llegan los datos por primera vez
  useEffect(() => {
    if (totalRef.current === 0 && unclassifiedItems.length > 0) {
      totalRef.current = unclassifiedItems.length;
    }
  }, [unclassifiedItems.length]);

  // ── Lista filtrada ────────────────────────────────────────────────────────
  const filteredItems = useMemo<Item[]>(() => {
    if (activeFilter === 'all') return unclassifiedItems;
    // Para filtros de acción: mostrar ítems que aún no tienen esa acción asignada
    // (todos los unclassified no tienen eco_action, así que el filtro es visual/informativo)
    return unclassifiedItems;
  }, [unclassifiedItems, activeFilter]);

  const currentItem = filteredItems[currentIndex] ?? null;
  const totalItems = totalRef.current || filteredItems.length;
  const isDone = currentIndex >= filteredItems.length && filteredItems.length > 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAction = useCallback(async (action: EcoAction) => {
    if (!currentItem || isActing) return;
    setIsActing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    transitionToNext(async () => {
      await assignEcoAction(currentItem.id, action);
      setClassifiedCount((c) => c + 1);
      setCurrentIndex((i) => i + 1);
      setIsActing(false);
    });
  }, [currentItem, isActing, assignEcoAction, transitionToNext]);

  const handleSkip = useCallback(async () => {
    if (!currentItem || isActing) return;
    setIsActing(true);
    Haptics.selectionAsync();

    transitionToNext(async () => {
      await skipItem(currentItem.id);
      setCurrentIndex((i) => i + 1);
      setIsActing(false);
    });
  }, [currentItem, isActing, skipItem, transitionToNext]);

  const handleFilterPress = useCallback((filter: EcoAction | 'all') => {
    Haptics.selectionAsync();
    setActiveFilter((prev) => prev === filter ? 'all' : filter);
    setCurrentIndex(0);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={goBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Cerrar clasificación"
        >
          <Ionicons name="close" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {!isDone && filteredItems.length > 0 && (
            <>
              <Text style={styles.headerCounter}>
                Ítem {Math.min(currentIndex + 1, filteredItems.length)} de {totalItems}
              </Text>
              {/* Progress dots */}
              <View style={styles.progressDots}>
                {Array.from({ length: Math.min(totalItems, 8) }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i < currentIndex
                        ? styles.dotDone
                        : i === currentIndex
                        ? styles.dotActive
                        : styles.dotPending,
                    ]}
                  />
                ))}
                {totalItems > 8 && (
                  <Text style={styles.dotMore}>+{totalItems - 8}</Text>
                )}
              </View>
            </>
          )}
          {isDone && <Text style={styles.headerCounter}>Sesión completada</Text>}
          {filteredItems.length === 0 && !isLoadingItems && (
            <Text style={styles.headerCounter}>Sin candidatos</Text>
          )}
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.ecoChip]}>
            <Ionicons name="leaf" size={12} color={Colors.accent} />
            <Text style={styles.ecoChipText}>Eco</Text>
          </View>
        </View>
      </View>

      {/* Loading */}
      {isLoadingItems && unclassifiedItems.length === 0 && (
        <View style={styles.loadingContainer}>
          <SkeletonLoader height={280} borderRadius={BorderRadius['2xl']} style={{ marginHorizontal: Spacing[4] }} />
          <View style={styles.skeletonActions}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <SkeletonLoader key={i} width="31%" height={88} borderRadius={BorderRadius.xl} />
            ))}
          </View>
        </View>
      )}

      {/* Empty state */}
      {!isLoadingItems && filteredItems.length === 0 && (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="leaf-outline"
            title="Sin candidatos"
            description="No hay objetos candidatos a clasificar en este momento. Los objetos sin clasificar con más de 90 días de antigüedad aparecerán aquí."
            actionLabel="Volver"
            onAction={goBack}
          />
        </View>
      )}

      {/* Summary screen */}
      {isDone && (
        <SummaryScreen
          classifiedCount={classifiedCount}
          totalCount={totalItems}
          onFinish={goBack}
        />
      )}

      {/* Main classify flow */}
      {!isLoadingItems && !isDone && currentItem && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Item card */}
          <ItemClassifyCard
            item={currentItem}
            fadeAnim={cardFade}
            slideAnim={cardSlide}
          />

          {/* Filter chips */}
          <View style={styles.filtersSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScroll}
            >
              <FilterChip
                label="Todos"
                icon="apps-outline"
                active={activeFilter === 'all'}
                color={Colors.accent}
                onPress={() => handleFilterPress('all')}
              />
              {ECO_ACTIONS.filter((a) => a !== 'discard').map((action) => (
                <FilterChip
                  key={action}
                  label={ECO_ACTION_LABELS[action]}
                  icon={ECO_ACTION_ICONS[action] as React.ComponentProps<typeof Ionicons>['name']}
                  active={activeFilter === action}
                  color={ECO_ACTION_COLORS[action]}
                  onPress={() => handleFilterPress(action)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Action grid */}
          <View style={styles.actionsSection}>
            <SectionHeader
              title="¿Qué harás con este objeto?"
              accent={Colors.accent}
              style={styles.actionHeader}
            />
            <View style={styles.actionsGrid}>
              {ECO_ACTIONS.map((action) => (
                <EcoActionButton
                  key={action}
                  action={action}
                  onPress={handleAction}
                  disabled={isActing}
                />
              ))}
            </View>
          </View>

          {/* Skip button */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={handleSkip}
            activeOpacity={0.7}
            disabled={isActing}
            accessibilityRole="button"
            accessibilityLabel="Omitir este objeto"
          >
            <Ionicons name="arrow-forward-circle-outline" size={16} color={Colors.textTertiary} />
            <Text style={styles.skipText}>Omitir por ahora</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
    gap: Spacing[3],
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  headerCounter: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
  },
  dotDone:    { backgroundColor: Colors.accent },
  dotActive:  { backgroundColor: Colors.textPrimary, width: 14 },
  dotPending: { backgroundColor: Colors.border },
  dotMore: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginLeft: 2,
  },
  headerRight: { width: 40, alignItems: 'flex-end' },
  ecoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
    backgroundColor: Colors.accentGlow,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: `${Colors.accent}44`,
  },
  ecoChipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.accent,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    paddingTop: Spacing[5],
    gap: Spacing[5],
  },
  skeletonActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    justifyContent: 'space-between',
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: Spacing[5],
    paddingBottom: Spacing[16],
    gap: Spacing[5],
  },
  // Filters
  filtersSection: {},
  filtersScroll: {
    paddingHorizontal: Spacing[4],
  },
  // Actions
  actionsSection: {
    paddingHorizontal: Spacing[4],
  },
  actionHeader: {
    marginBottom: Spacing[4],
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
    justifyContent: 'space-between',
  },
  // Skip
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    marginHorizontal: Spacing[4],
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.glass,
  },
  skipText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
});

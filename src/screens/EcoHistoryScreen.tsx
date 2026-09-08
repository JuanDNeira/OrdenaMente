/**
 * EcoHistoryScreen — Historial de acciones ecológicas completadas.
 * Task 9 — implementación visual completa.
 */

import React, { useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, EmptyState, SkeletonLoader } from '../components/ui';
import { Colors, Spacing, BorderRadius, Shadows, FontFamily, FontSize } from '../theme';
import { useEcoStore } from '../store/ecoStore';
import { useAppNavigation } from '../navigation/NavigationContext';
import { ECO_ACTION_LABELS, ECO_ACTION_ICONS } from '../types/Eco';
import type { EcoAction } from '../types/Item';
import type { Item } from '../types/Item';
import { formatDate } from '../utils/dateUtils';

// ─── HistoryRow ───────────────────────────────────────────────────────────────
const HistoryRow = React.memo(function HistoryRow({
  item,
  index,
}: {
  item: Item;
  index: number;
}) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        delay: Math.min(index * 50, 300),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        delay: Math.min(index * 50, 300),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const action = item.eco_action as EcoAction | undefined;
  const isDiscard = action === 'discard';
  const iconColor = isDiscard ? Colors.textTertiary : Colors.accent;
  const iconName = action
    ? (ECO_ACTION_ICONS[action] as React.ComponentProps<typeof Ionicons>['name'])
    : 'help-circle-outline';
  const actionLabel = action ? ECO_ACTION_LABELS[action] : '—';
  const dateStr = item.eco_completed_at ? formatDate(item.eco_completed_at) : '—';

  return (
    <Animated.View
      style={[
        rowStyles.row,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Ícono de acción */}
      <View style={[rowStyles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={iconName} size={18} color={iconColor} />
      </View>

      {/* Info */}
      <View style={rowStyles.info}>
        <Text style={rowStyles.name} numberOfLines={1}>{item.name}</Text>
        <View style={rowStyles.metaRow}>
          <View style={[rowStyles.actionBadge, { borderColor: `${iconColor}44`, backgroundColor: `${iconColor}12` }]}>
            <Text style={[rowStyles.actionLabel, { color: iconColor }]}>{actionLabel}</Text>
          </View>
          {item.eco_notes ? (
            <Text style={rowStyles.notes} numberOfLines={1}>{item.eco_notes}</Text>
          ) : null}
        </View>
      </View>

      {/* Fecha */}
      <Text style={rowStyles.date}>{dateStr}</Text>
    </Animated.View>
  );
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    gap: Spacing[3],
    ...Shadows.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: { flex: 1, gap: 4 },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  actionBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  actionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
  },
  notes: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    flex: 1,
  },
  date: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    flexShrink: 0,
  },
});

// ─── EcoHistoryScreen ─────────────────────────────────────────────────────────
export default function EcoHistoryScreen() {
  const { goBack } = useAppNavigation();
  const insets = useSafeAreaInsets();

  const { completedItems, isLoadingItems, loadCompletedItems } = useEcoStore();

  useEffect(() => {
    loadCompletedItems();
  }, [loadCompletedItems]);

  // Contadores del encabezado
  const { rescued, discarded } = useMemo(() => {
    let r = 0;
    let d = 0;
    for (const item of completedItems) {
      if (item.eco_action === 'discard') d++;
      else r++;
    }
    return { rescued: r, discarded: d };
  }, [completedItems]);

  const renderItem = useCallback(
    ({ item, index }: { item: Item; index: number }) => (
      <HistoryRow item={item} index={index} />
    ),
    []
  );

  const keyExtractor = useCallback((item: Item) => item.id, []);

  const listHeader = useMemo(
    () => (
      <View style={styles.countersRow}>
        <View style={styles.counterBox}>
          <Ionicons name="leaf" size={16} color={Colors.accent} />
          <Text style={styles.counterValue}>{rescued}</Text>
          <Text style={styles.counterLabel}>Rescatados</Text>
        </View>
        <View style={styles.counterDivider} />
        <View style={styles.counterBox}>
          <Ionicons name="trash-outline" size={16} color={Colors.textTertiary} />
          <Text style={[styles.counterValue, { color: Colors.textTertiary }]}>{discarded}</Text>
          <Text style={styles.counterLabel}>Desechados</Text>
        </View>
      </View>
    ),
    [rescued, discarded]
  );

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
        <Text style={styles.headerTitle}>Historial Eco</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Skeleton */}
      {isLoadingItems && completedItems.length === 0 && (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonLoader
              key={i}
              height={68}
              borderRadius={BorderRadius.lg}
              style={{ marginBottom: Spacing[2] }}
            />
          ))}
        </View>
      )}

      {/* Lista */}
      {(!isLoadingItems || completedItems.length > 0) && (
        <FlatList
          data={completedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          initialNumToRender={8}
          windowSize={10}
          ListHeaderComponent={completedItems.length > 0 ? listHeader : null}
          ListEmptyComponent={
            !isLoadingItems ? (
              <EmptyState
                icon="time-outline"
                title="Sin historial aún"
                description="Aún no has completado ninguna acción ecológica."
              />
            ) : null
          }
        />
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
  },
  headerSpacer: { width: 40 },
  // Counters
  countersRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing[4],
  },
  counterBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[4],
    gap: Spacing[1],
  },
  counterDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[3],
  },
  counterValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.accent,
    lineHeight: 34,
  },
  counterLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  // List
  listContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[20],
  },
  skeletonContainer: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },
});

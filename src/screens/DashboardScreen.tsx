import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Text, StatCard, SectionHeader, SkeletonStatCard, EmptyState } from '../components/ui';
import { Colors, Spacing, BorderRadius, Shadows, FontFamily, FontSize } from '../theme';
import { ContainerRepository } from '../database/repositories/ContainerRepository';
import { ItemRepository } from '../database/repositories/ItemRepository';
import { useAppNavigation } from '../navigation/NavigationContext';
import { useEcoStore } from '../store/ecoStore';
import type { ContainerType } from '../types/common';
import { CONTAINER_TYPE_LABELS, CONTAINER_TYPE_ICONS } from '../types/common';

interface DashboardStats {
  totalContainers: number;
  totalItems: number;
  byType: Partial<Record<ContainerType, number>>;
  topContainers: {
    container: { id: string; name: string; color_tag?: string; type: ContainerType };
    count: number;
  }[];
}

const TYPE_COLORS: Partial<Record<ContainerType, string>> = {
  box: Colors.primary,
  suitcase: Colors.secondary,
  drawer: Colors.accent,
  shelf: Colors.warning,
  bag: Colors.info,
  other: Colors.textTertiary,
};

// ─── Animated progress bar ────────────────────────────────────────────────────
function AnimatedBar({
  pct,
  color,
  delay = 0,
}: {
  pct: number;
  color: string;
  delay?: number;
}) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 700,
      delay,
      useNativeDriver: false,
    }).start();
  }, [pct, delay, widthAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={barStyles.track}>
      <Animated.View style={[barStyles.fill, { width: animatedWidth, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginTop: Spacing[2],
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ value, color }: { value: number; color: string }) {
  const countAnim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    countAnim.setValue(0);
    const animation = Animated.timing(countAnim, {
      toValue: value,
      duration: 800,
      useNativeDriver: false,
    });
    animation.start();
    const id = countAnim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => {
      animation.stop();
      countAnim.removeListener(id);
    };
  }, [value, countAnim]);

  return (
    <Text variant="headingMedium" color={color}>
      {display}
    </Text>
  );
}

// ─── DashboardScreen ──────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { navigate } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { ecoStats, loadEcoStats } = useEcoStore();

  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(16)).current;
  const refreshRotate = useRef(new Animated.Value(0)).current;

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    contentFade.setValue(0);
    contentSlide.setValue(16);

    // Spin refresh icon
    const spinLoop = Animated.loop(
      Animated.timing(refreshRotate, { toValue: 1, duration: 600, useNativeDriver: true })
    );
    spinLoop.start();

    try {
      const [containers, totalItems, byType, topContainers] = await Promise.all([
        ContainerRepository.findAll(),
        ItemRepository.getTotalCount(),
        ContainerRepository.getStatsByType(),
        ContainerRepository.getTopFilledContainers(5),
      ]);
      // Cargar stats eco en paralelo con las cargas existentes
      loadEcoStats();
      setStats({
        totalContainers: containers.length,
        totalItems,
        byType,
        topContainers: topContainers.map(({ container, count }) => ({
          container: {
            id: container.id,
            name: container.name,
            color_tag: container.color_tag,
            type: container.type,
          },
          count,
        })),
      });
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(contentSlide, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start();
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
      spinLoop.stop();
      refreshRotate.setValue(0);
    }
  }, [contentFade, contentSlide, refreshRotate]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadStats();
  }, [loadStats]);

  const spin = refreshRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const totalTypes = stats ? Object.keys(stats.byType).length : 0;
  const avg =
    stats && stats.totalContainers > 0
      ? (stats.totalItems / stats.totalContainers).toFixed(1)
      : '0';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="labelSmall" color={Colors.textTertiary} style={styles.headerLabel}>
            RESUMEN GENERAL
          </Text>
          <Text variant="headingLarge" color={Colors.textPrimary}>Panel</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Actualizar estadísticas"
          >
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="refresh-outline" size={18} color={Colors.textSecondary} />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.refreshButton, styles.settingsButton]}
            onPress={() => navigate('Settings')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Configuración"
          >
            <Ionicons name="settings-outline" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Skeleton */}
        {isLoading && !stats && (
          <View style={styles.skeletonRow}>
            <SkeletonStatCard />
            <View style={styles.metricGap} />
            <SkeletonStatCard />
          </View>
        )}

        {/* Animated content */}
        {stats && (
          <Animated.View
            style={{ opacity: contentFade, transform: [{ translateY: contentSlide }] }}
          >
            {/* Main metrics */}
            <View style={styles.metricsRow}>
              <StatCard
                label="Contenedores"
                value={stats.totalContainers}
                icon="cube"
                gradient={Colors.gradients.primary}
                subtitle={`${totalTypes} tipo${totalTypes !== 1 ? 's' : ''}`}
              />
              <View style={styles.metricGap} />
              <StatCard
                label="Ítems totales"
                value={stats.totalItems}
                icon="pricetag"
                gradient={Colors.gradients.accent}
                subtitle="unidades"
              />
            </View>

            {/* Eco points card — solo cuando hay datos eco */}
            {ecoStats !== null && (
              <View style={styles.metricsRow}>
                <StatCard
                  label="Puntos Eco"
                  value={ecoStats.ecoPoints}
                  icon="leaf"
                  gradient={Colors.gradients.accent}
                  subtitle={`${ecoStats.totalRescued} rescatado${ecoStats.totalRescued !== 1 ? 's' : ''}`}
                />
                <View style={styles.metricGap} />
                <StatCard
                  label="Rescatados"
                  value={ecoStats.totalRescued}
                  icon="checkmark-circle"
                  gradient={['#34D399', '#059669']}
                  subtitle="completados"
                />
              </View>
            )}

            {/* Average card */}
            {stats.totalContainers > 0 && (
              <View style={styles.avgCard}>
                <LinearGradient
                  colors={[Colors.backgroundSecondary, Colors.backgroundTertiary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.avgGradient}
                >
                  <View style={styles.avgLeft}>
                    <View style={styles.avgIconWrapper}>
                      <Ionicons name="analytics-outline" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.avgText}>
                      <Text variant="labelMedium" color={Colors.textSecondary}>
                        Promedio por contenedor
                      </Text>
                      <Text variant="caption" color={Colors.textTertiary}>
                        ítems / contenedor
                      </Text>
                    </View>
                  </View>
                  <Text variant="headingMedium" color={Colors.primary}>{avg}</Text>
                </LinearGradient>
              </View>
            )}

            {/* By type */}
            {Object.keys(stats.byType).length > 0 && (
              <>
                <SectionHeader
                  title="Distribución por tipo"
                  accent={Colors.primary}
                  style={styles.sectionHeader}
                />
                <View style={styles.typeGrid}>
                  {(Object.entries(stats.byType) as [ContainerType, number][]).map(
                    ([type, count], i) => {
                      const color = TYPE_COLORS[type] ?? Colors.primary;
                      const iconName = CONTAINER_TYPE_ICONS[type] as React.ComponentProps<
                        typeof Ionicons
                      >['name'];
                      const pct =
                        stats.totalContainers > 0
                          ? (count / stats.totalContainers) * 100
                          : 0;
                      return (
                        <View key={type} style={styles.typeCard}>
                          <View
                            style={[
                              styles.typeIconWrapper,
                              { backgroundColor: `${color}22` },
                            ]}
                          >
                            <Ionicons name={iconName} size={18} color={color} />
                          </View>
                          <AnimatedCounter value={count} color={Colors.textPrimary} />
                          <Text variant="caption" color={Colors.textTertiary}>
                            {CONTAINER_TYPE_LABELS[type]}
                          </Text>
                          <AnimatedBar pct={pct} color={color} delay={i * 80} />
                        </View>
                      );
                    }
                  )}
                </View>
              </>
            )}

            {/* Top containers */}
            {stats.topContainers.length > 0 && (
              <>
                <SectionHeader
                  title="Más llenos"
                  accent={Colors.accent}
                  style={styles.sectionHeader}
                />
                <View style={styles.topList}>
                  {stats.topContainers.map(({ container, count }, index) => {
                    const color = container.color_tag ?? Colors.primary;
                    const iconName = CONTAINER_TYPE_ICONS[
                      container.type
                    ] as React.ComponentProps<typeof Ionicons>['name'];
                    const maxCount = stats.topContainers[0]?.count ?? 1;
                    const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;

                    return (
                      <TouchableOpacity
                        key={container.id}
                        style={styles.topItem}
                        onPress={() =>
                          navigate('ContainerDetail', { containerId: container.id })
                        }
                        activeOpacity={0.75}
                        accessibilityRole="button"
                        accessibilityLabel={`${container.name}, ${count} ítems`}
                      >
                        <View style={styles.topRank}>
                          <Text
                            style={[
                              styles.rankText,
                              index === 0 && styles.rankFirst,
                              index === 1 && styles.rankSecond,
                              index === 2 && styles.rankThird,
                            ]}
                          >
                            #{index + 1}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.topIconWrapper,
                            { backgroundColor: `${color}22` },
                          ]}
                        >
                          <Ionicons name={iconName} size={16} color={color} />
                        </View>
                        <View style={styles.topInfo}>
                          <Text
                            variant="labelLarge"
                            color={Colors.textPrimary}
                            numberOfLines={1}
                          >
                            {container.name}
                          </Text>
                          <AnimatedBar pct={pct} color={color} delay={index * 100} />
                        </View>
                        <View
                          style={[
                            styles.topCountBadge,
                            {
                              backgroundColor: `${color}22`,
                              borderColor: `${color}44`,
                            },
                          ]}
                        >
                          <Text style={[styles.topCountText, { color }]}>{count}</Text>
                          <Text style={styles.topCountUnit}>ítems</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            {/* Empty state */}
            {stats.totalContainers === 0 && (
              <EmptyState
                icon="bar-chart-outline"
                title="Sin datos aún"
                description="Agrega contenedores para ver estadísticas aquí."
              />
            )}
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  headerLabel: {
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    // inherits refreshButton styles
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[20],
  },
  skeletonRow: {
    flexDirection: 'row',
    marginBottom: Spacing[4],
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: Spacing[4],
  },
  metricGap: {
    width: Spacing[3],
  },
  avgCard: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing[4],
    ...Shadows.sm,
  },
  avgGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
  },
  avgLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avgIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  avgText: {},
  sectionHeader: {
    marginBottom: Spacing[3],
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  typeCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    ...Shadows.sm,
  },
  typeIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  topList: {
    marginBottom: Spacing[4],
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
    marginBottom: Spacing[2],
    ...Shadows.sm,
  },
  topRank: {
    width: 28,
    alignItems: 'center',
    marginRight: Spacing[3],
  },
  rankText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  rankFirst: { color: Colors.warning },
  rankSecond: { color: Colors.textSecondary },
  rankThird: { color: '#CD7F32' },
  topIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  topInfo: {
    flex: 1,
  },
  topCountBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginLeft: Spacing[3],
    minWidth: 52,
  },
  topCountText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  topCountUnit: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    lineHeight: 14,
  },
  bottomSpacer: {
    height: Spacing[4],
  },
});

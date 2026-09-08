/**
 * EcoHubScreen — Dashboard principal del módulo Reciclador Inteligente.
 * Task 6 — implementación visual completa.
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Text,
  StatCard,
  SectionHeader,
  SkeletonStatCard,
  SkeletonLoader,
  EmptyState,
  FloatingActionButton,
} from '../components/ui';
import { Colors, Spacing, BorderRadius, Shadows, FontFamily, FontSize } from '../theme';
import { useEcoStore } from '../store/ecoStore';
import type { EcoInsight } from '../store/ecoStore';
import { useAppNavigation } from '../navigation/NavigationContext';
import {
  ECO_ACTION_LABELS,
  ECO_ACTION_ICONS,
  ECO_ACHIEVEMENT_LABELS,
} from '../types/Eco';
import type { EcoAction } from '../types/Item';
import type { EcoAchievement } from '../types/Eco';
import { formatDate } from '../utils/dateUtils';

// ─── Insight severity config ──────────────────────────────────────────────────
const INSIGHT_CONFIG: Record<
  EcoInsight['severity'],
  { color: string; bg: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
> = {
  warning: { color: Colors.warning,  bg: Colors.warningLight,  icon: 'warning-outline'      },
  tip:     { color: Colors.accent,   bg: Colors.accentGlow,    icon: 'bulb-outline'          },
  info:    { color: Colors.info,     bg: Colors.infoLight,     icon: 'information-circle-outline' },
};

// ─── AnimatedProgressBar ──────────────────────────────────────────────────────
function AnimatedProgressBar({ progress, delay = 0 }: { progress: number; delay?: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 900,
      delay,
      useNativeDriver: false,
    }).start();
  }, [progress, delay, widthAnim]);

  const animatedWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={progressStyles.track}>
      <Animated.View style={[progressStyles.fill, { width: animatedWidth }]}>
        <LinearGradient
          colors={Colors.gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
});

// ─── InsightCard ──────────────────────────────────────────────────────────────
function InsightCard({ insight, index }: { insight: EcoInsight; index: number }) {
  const cfg = INSIGHT_CONFIG[insight.severity];
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View
      style={[
        insightStyles.card,
        { borderColor: `${cfg.color}44`, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={[insightStyles.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={16} color={cfg.color} />
      </View>
      <Text style={[insightStyles.message, { color: Colors.textSecondary }]} numberOfLines={2}>
        {insight.message}
      </Text>
    </Animated.View>
  );
}

const insightStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    gap: Spacing[3],
    ...Shadows.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  message: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});

// ─── PendingItemRow ───────────────────────────────────────────────────────────
function PendingItemRow({
  item,
  onPress,
}: {
  item: { id: string; name: string; eco_action?: EcoAction };
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const action = item.eco_action;
  const iconName = action
    ? (ECO_ACTION_ICONS[action] as React.ComponentProps<typeof Ionicons>['name'])
    : 'help-circle-outline';
  const label = action ? ECO_ACTION_LABELS[action] : 'Sin clasificar';

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 4 }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 10 }).start()}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, acción: ${label}`}
    >
      <Animated.View style={[pendingStyles.row, { transform: [{ scale: scaleAnim }] }]}>
        <View style={pendingStyles.iconWrap}>
          <Ionicons name={iconName} size={16} color={Colors.accent} />
        </View>
        <View style={pendingStyles.info}>
          <Text style={pendingStyles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={pendingStyles.label}>{label}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const pendingStyles = StyleSheet.create({
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
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textPrimary },
  label: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
});

// ─── AchievementRow ───────────────────────────────────────────────────────────
function AchievementRow({ achievement }: { achievement: EcoAchievement }) {
  const info = ECO_ACHIEVEMENT_LABELS[achievement.type];
  return (
    <View style={achieveStyles.row}>
      <View style={achieveStyles.iconWrap}>
        <Ionicons name="trophy-outline" size={16} color={Colors.warning} />
      </View>
      <View style={achieveStyles.info}>
        <Text style={achieveStyles.name}>{info.name}</Text>
        <Text style={achieveStyles.date}>{formatDate(achievement.unlocked_at)}</Text>
      </View>
      <View style={achieveStyles.badge}>
        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
      </View>
    </View>
  );
}

const achieveStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: `${Colors.warning}33`,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    gap: Spacing[3],
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  name: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textPrimary },
  date: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  badge: { width: 24, alignItems: 'center' },
});

// ─── AchievementBanner ────────────────────────────────────────────────────────
function AchievementBanner({
  achievement,
  onDismiss,
}: {
  achievement: EcoAchievement;
  onDismiss: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const info = ECO_ACHIEVEMENT_LABELS[achievement.type];

  useEffect(() => {
    // Entrada
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 8 }),
    ]).start();
    // Auto-dismiss a los 3s
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 250, useNativeDriver: true }),
      ]).start(onDismiss);
    }, 3000);
    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim, onDismiss]);

  return (
    <Animated.View
      style={[bannerStyles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Logro desbloqueado: ${info.name}`}
    >
      <LinearGradient
        colors={['#FBBF24', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={bannerStyles.gradient}
      >
        <Ionicons name="trophy" size={18} color="#0A0A0F" />
        <View style={bannerStyles.textGroup}>
          <Text style={bannerStyles.title}>¡Logro desbloqueado!</Text>
          <Text style={bannerStyles.subtitle}>{info.name}</Text>
        </View>
        <Ionicons name="sparkles" size={16} color="#0A0A0F" />
      </LinearGradient>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: Spacing[4],
    right: Spacing[4],
    zIndex: 100,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
  },
  textGroup: { flex: 1 },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: '#0A0A0F' },
  subtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: '#1A1A00' },
});

// ─── QuickActionCard ──────────────────────────────────────────────────────────
function QuickActionCard({
  icon,
  label,
  subtitle,
  onPress,
  accentColor,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle: string;
  onPress: () => void;
  accentColor: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <TouchableOpacity
      style={qaStyles.card}
      onPress={onPress}
      onPressIn={() => {
        Haptics.selectionAsync();
        Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
      }}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 10 }).start()}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={[qaStyles.inner, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[qaStyles.iconWrap, { backgroundColor: `${accentColor}22` }]}>
          <Ionicons name={icon} size={22} color={accentColor} />
        </View>
        <Text style={qaStyles.label}>{label}</Text>
        <Text style={qaStyles.subtitle} numberOfLines={2}>{subtitle}</Text>
        <View style={[qaStyles.arrow, { backgroundColor: `${accentColor}18` }]}>
          <Ionicons name="arrow-forward" size={12} color={accentColor} />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const qaStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.glass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  inner: { padding: Spacing[4], gap: Spacing[2] },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[1],
  },
  label: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary },
  subtitle: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textTertiary, lineHeight: 16 },
  arrow: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: Spacing[1],
  },
});

// ─── EcoHubScreen ─────────────────────────────────────────────────────────────
export default function EcoHubScreen() {
  const { navigate } = useAppNavigation();
  const insets = useSafeAreaInsets();

  const {
    ecoStats,
    ecoProgress,
    ecoInsights,
    pendingItems,
    unclassifiedItems,
    achievements,
    isLoadingStats,
    isLoadingItems,
    isRefreshing,
    error,
    loadEcoStats,
    loadPendingItems,
    loadAchievements,
    loadInsights,
    refreshEcoData,
    clearError,
  } = useEcoStore();

  // ── Banner de logro ──────────────────────────────────────────────────────
  const prevAchievementsCount = useRef(achievements.length);
  const [bannerAchievement, setBannerAchievement] = React.useState<EcoAchievement | null>(null);

  useEffect(() => {
    if (achievements.length > prevAchievementsCount.current) {
      setBannerAchievement(achievements[0] ?? null);
    }
    prevAchievementsCount.current = achievements.length;
  }, [achievements]);

  // ── Animaciones de entrada escalonadas ───────────────────────────────────
  const heroFade   = useRef(new Animated.Value(0)).current;
  const statsFade  = useRef(new Animated.Value(0)).current;
  const bodyFade   = useRef(new Animated.Value(0)).current;
  const heroSlide  = useRef(new Animated.Value(20)).current;
  const statsSlide = useRef(new Animated.Value(20)).current;
  const bodySlide  = useRef(new Animated.Value(20)).current;

  const runEntrance = useCallback(() => {
    heroFade.setValue(0); heroSlide.setValue(20);
    statsFade.setValue(0); statsSlide.setValue(20);
    bodyFade.setValue(0); bodySlide.setValue(20);

    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(heroFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(heroSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(statsFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(statsSlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(bodyFade,  { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(bodySlide, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, [heroFade, heroSlide, statsFade, statsSlide, bodyFade, bodySlide]);

  // ── Carga inicial ────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      loadEcoStats(),
      loadPendingItems(),
      loadAchievements(),
      loadInsights(),
    ]).then(runEntrance);
  }, [loadEcoStats, loadPendingItems, loadAchievements, loadInsights, runEntrance]);

  // ── Pendientes agrupados por acción ──────────────────────────────────────
  const pendingByAction = useMemo(() => {
    const map = new Map<EcoAction, typeof pendingItems>();
    for (const item of pendingItems) {
      if (!item.eco_action) continue;
      const list = map.get(item.eco_action) ?? [];
      list.push(item);
      map.set(item.eco_action, list);
    }
    return map;
  }, [pendingItems]);

  const recentAchievements = useMemo(() => achievements.slice(0, 3), [achievements]);
  const pct = Math.round(ecoProgress * 100);
  const isEmpty = pendingItems.length === 0 && unclassifiedItems.length === 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Banner de logro — posición absoluta sobre el contenido */}
      {bannerAchievement && (
        <AchievementBanner
          achievement={bannerAchievement}
          onDismiss={() => setBannerAchievement(null)}
        />
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshEcoData}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        {/* ── Hero Header ─────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: heroFade, transform: [{ translateY: heroSlide }] }}>
          <LinearGradient
            colors={Colors.gradients.accent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>RECICLADOR INTELIGENTE</Text>
                <Text style={styles.heroTitle}>Tu impacto eco</Text>
              </View>
              <TouchableOpacity
                style={styles.historyBtn}
                onPress={() => navigate('EcoHistory')}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Ver historial ecológico"
              >
                <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.85)" />
              </TouchableOpacity>
            </View>

            {/* Progreso eco */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progreso ecológico</Text>
                <Text style={styles.progressPct}>{pct}%</Text>
              </View>
              <AnimatedProgressBar progress={ecoProgress} delay={300} />
              <Text style={styles.progressSub}>
                {ecoStats
                  ? `${ecoStats.totalRescued} rescatados · ${ecoStats.totalDiscarded} desechados`
                  : 'Cargando...'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Error banner ────────────────────────────────────────────── */}
        {error && (
          <TouchableOpacity style={styles.errorBanner} onPress={clearError} activeOpacity={0.8}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
            <Text style={styles.errorText} numberOfLines={1}>{error}</Text>
            <Ionicons name="close" size={14} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* ── Stats Row ───────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: statsFade, transform: [{ translateY: statsSlide }] }}>
          {isLoadingStats && !ecoStats ? (
            <View style={styles.statsRow}>
              <SkeletonStatCard /><View style={styles.gap} /><SkeletonStatCard />
            </View>
          ) : ecoStats ? (
            <>
              <View style={styles.statsRow}>
                <StatCard
                  label="Rescatados"
                  value={ecoStats.totalRescued}
                  icon="leaf"
                  gradient={Colors.gradients.accent}
                  subtitle="completados"
                />
                <View style={styles.gap} />
                <StatCard
                  label="Puntos Eco"
                  value={ecoStats.ecoPoints}
                  icon="star"
                  gradient={['#FBBF24', '#F59E0B']}
                  subtitle="acumulados"
                />
              </View>
              <View style={[styles.statsRow, { marginTop: Spacing[3] }]}>
                <StatCard
                  label="Pendientes"
                  value={ecoStats.totalPending}
                  icon="time-outline"
                  gradient={Colors.gradients.primary}
                  subtitle="por completar"
                />
                <View style={styles.gap} />
                <StatCard
                  label="Completados"
                  value={ecoStats.totalCompleted}
                  icon="checkmark-circle"
                  gradient={['#34D399', '#059669']}
                  subtitle="total"
                />
              </View>
            </>
          ) : null}
        </Animated.View>

        {/* ── Body sections ───────────────────────────────────────────── */}
        <Animated.View style={{ opacity: bodyFade, transform: [{ translateY: bodySlide }] }}>

          {/* Quick Actions */}
          <SectionHeader title="Acciones rápidas" accent={Colors.accent} style={styles.sectionHeader} />
          <View style={styles.qaRow}>
            <QuickActionCard
              icon="albums-outline"
              label="Clasificar"
              subtitle="Revisa objetos sin clasificar"
              onPress={() => navigate('EcoClassify')}
              accentColor={Colors.accent}
            />
            <View style={styles.gap} />
            <QuickActionCard
              icon="time-outline"
              label="Historial"
              subtitle="Acciones completadas"
              onPress={() => navigate('EcoHistory')}
              accentColor={Colors.primary}
            />
          </View>

          {/* Insights */}
          {ecoInsights.length > 0 && (
            <>
              <SectionHeader title="Insights" accent={Colors.accent} style={styles.sectionHeader} />
              {ecoInsights.map((insight, i) => (
                <InsightCard key={insight.type} insight={insight} index={i} />
              ))}
            </>
          )}

          {/* Pendientes */}
          <SectionHeader
            title="Pendientes"
            subtitle={pendingItems.length > 0 ? `${pendingItems.length} ítems` : undefined}
            accent={Colors.accent}
            style={styles.sectionHeader}
          />
          {isLoadingItems && pendingItems.length === 0 ? (
            <>
              <SkeletonLoader height={52} borderRadius={BorderRadius.lg} style={{ marginBottom: Spacing[2] }} />
              <SkeletonLoader height={52} borderRadius={BorderRadius.lg} style={{ marginBottom: Spacing[2] }} />
            </>
          ) : isEmpty ? (
            <EmptyState
              icon="leaf-outline"
              title="Todo en orden"
              description="No tienes ítems pendientes de clasificar."
            />
          ) : (
            Array.from(pendingByAction.entries()).map(([action, items]) =>
              items.map((item) => (
                <PendingItemRow
                  key={item.id}
                  item={item}
                  onPress={() => navigate('EcoItemDetail', { itemId: item.id })}
                />
              ))
            )
          )}

          {/* Logros recientes */}
          {recentAchievements.length > 0 && (
            <>
              <SectionHeader title="Logros recientes" accent={Colors.warning} style={styles.sectionHeader} />
              {recentAchievements.map((a) => (
                <AchievementRow key={a.id} achievement={a} />
              ))}
            </>
          )}

        </Animated.View>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* FAB — clasificar */}
      <FloatingActionButton
        icon="leaf-outline"
        gradient={Colors.gradients.accent}
        onPress={() => navigate('EcoClassify')}
        accessibilityLabel="Clasificar objetos ecológicos"
        bottom={90}
        right={20}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: Spacing[20],
  },
  // Hero
  hero: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[6],
    gap: Spacing[5],
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
  },
  historyBtn: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: { gap: Spacing[2] },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  progressPct: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  progressSub: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.65)',
  },
  // Error
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginHorizontal: Spacing[4],
    marginTop: Spacing[3],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.errorLight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: `${Colors.error}44`,
  },
  errorText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.error,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    marginTop: Spacing[4],
  },
  gap: { width: Spacing[3] },
  // Sections
  sectionHeader: {
    marginTop: Spacing[6],
    marginBottom: Spacing[3],
    paddingHorizontal: Spacing[4],
  },
  // Quick actions
  qaRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
  },
  bottomSpacer: { height: Spacing[4] },
});

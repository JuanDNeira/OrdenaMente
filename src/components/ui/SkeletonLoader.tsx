import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { Colors, BorderRadius } from '../../theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLoader({
  width = '100%',
  height = 16,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonLoaderProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: false,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const backgroundColor = shimmer.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [Colors.backgroundTertiary, Colors.surfaceElevated, Colors.backgroundTertiary],
  });

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as number, height, borderRadius, backgroundColor },
        style,
      ]}
    />
  );
}

// ─── Skeleton presets ─────────────────────────────────────────────────────────

export function SkeletonContainerCard() {
  return (
    <View style={skeletonStyles.card}>
      {/* Top accent */}
      <SkeletonLoader height={3} borderRadius={0} />
      <View style={skeletonStyles.inner}>
        {/* Icon */}
        <SkeletonLoader width={60} height={60} borderRadius={BorderRadius.lg} style={skeletonStyles.icon} />
        {/* Text lines */}
        <View style={skeletonStyles.textGroup}>
          <SkeletonLoader width="70%" height={16} style={skeletonStyles.line} />
          <SkeletonLoader width="50%" height={12} style={skeletonStyles.line} />
          <SkeletonLoader width="35%" height={10} style={skeletonStyles.line} />
        </View>
        {/* Badge */}
        <View style={skeletonStyles.badge}>
          <SkeletonLoader width={52} height={44} borderRadius={BorderRadius.md} />
        </View>
      </View>
      <View style={skeletonStyles.footer}>
        <SkeletonLoader width={60} height={16} borderRadius={BorderRadius.xs} />
      </View>
    </View>
  );
}

export function SkeletonItemCard() {
  return (
    <View style={skeletonStyles.itemCard}>
      <SkeletonLoader width={44} height={44} borderRadius={BorderRadius.md} style={skeletonStyles.icon} />
      <View style={skeletonStyles.textGroup}>
        <SkeletonLoader width="65%" height={15} style={skeletonStyles.line} />
        <SkeletonLoader width="45%" height={11} style={skeletonStyles.line} />
      </View>
      <SkeletonLoader width={48} height={52} borderRadius={BorderRadius.md} />
    </View>
  );
}

export function SkeletonStatCard() {
  return (
    <View style={skeletonStyles.statCard}>
      <SkeletonLoader width="100%" height={130} borderRadius={BorderRadius.xl} />
    </View>
  );
}

export function SkeletonSearchResult() {
  return (
    <View style={skeletonStyles.searchResult}>
      <SkeletonLoader width={38} height={38} borderRadius={BorderRadius.sm} style={skeletonStyles.icon} />
      <View style={skeletonStyles.textGroup}>
        <SkeletonLoader width="60%" height={15} style={skeletonStyles.line} />
        <SkeletonLoader width="40%" height={11} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  icon: {
    marginRight: 16,
  },
  textGroup: {
    flex: 1,
  },
  line: {
    marginBottom: 8,
  },
  badge: {
    marginLeft: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 8,
  },
});

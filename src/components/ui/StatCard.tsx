import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, Shadows } from '../../theme';
import { Text } from './Text';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  gradient?: readonly [string, string];
  accent?: string;
  subtitle?: string;
}

export function StatCard({
  label,
  value,
  icon,
  gradient = Colors.gradients.primary,
  accent = Colors.primary,
  subtitle,
}: StatCardProps) {
  return (
    <View
      style={styles.card}
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconRow}>
          <View style={styles.iconWrapper}>
            <Ionicons name={icon} size={20} color="#FFFFFFCC" />
          </View>
        </View>
        <Text variant="displayMedium" color={Colors.textPrimary} style={styles.value}>
          {value}
        </Text>
        <Text variant="labelSmall" color="#FFFFFFBB" style={styles.label}>
          {label}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="#FFFFFF88" style={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  gradient: {
    padding: Spacing[5],
    minHeight: 130,
    justifyContent: 'flex-end',
  },
  iconRow: {
    position: 'absolute',
    top: Spacing[4],
    right: Spacing[4],
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    marginBottom: 2,
  },
  label: {
    letterSpacing: 1,
  },
  subtitle: {
    marginTop: 2,
  },
});

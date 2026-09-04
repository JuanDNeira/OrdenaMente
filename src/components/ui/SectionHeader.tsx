import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../theme';
import { Text } from './Text';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  accent?: string;
  style?: object;
}

export function SectionHeader({ title, subtitle, accent = Colors.primary, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.textGroup}>
        <Text variant="labelMedium" color={Colors.textTertiary} style={styles.title}>
          {title.toUpperCase()}
        </Text>
        {subtitle ? (
          <Text variant="caption" color={Colors.textTertiary}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing[3],
    marginTop: Spacing[2],
  },
  accent: {
    width: 3,
    height: 16,
    borderRadius: BorderRadius.full,
    marginRight: Spacing[3],
  },
  textGroup: {
    flex: 1,
  },
  title: {
    letterSpacing: 2,
  },
});

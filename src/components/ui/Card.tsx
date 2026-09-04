import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { Colors, BorderRadius, Spacing, Shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
  noPadding?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Card({
  children,
  onPress,
  onLongPress,
  style,
  elevated = false,
  noPadding = false,
  accessibilityLabel,
  accessibilityHint,
}: CardProps) {
  const containerStyle = [
    styles.card,
    elevated && styles.elevated,
    noPadding && styles.noPadding,
    style,
  ];

  if (onPress || onLongPress) {
    return (
      <TouchableOpacity
        style={containerStyle}
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.md,
  },
  elevated: {
    backgroundColor: Colors.surfaceElevated,
    ...Shadows.lg,
  },
  noPadding: {
    padding: 0,
  },
});

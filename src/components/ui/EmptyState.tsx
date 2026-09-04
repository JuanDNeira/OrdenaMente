import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../../theme';
import { Text } from './Text';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.iconWrapper}>
        <Ionicons name={icon} size={48} color={Colors.textTertiary} />
      </View>
      <Text variant="headingSmall" color={Colors.textSecondary} align="center" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="bodyMedium" color={Colors.textTertiary} align="center" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="secondary"
          size="sm"
          style={styles.action}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[16],
    paddingHorizontal: Spacing[8],
  },
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundTertiary,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  title: {
    marginBottom: Spacing[2],
  },
  description: {
    marginBottom: Spacing[5],
  },
  action: {
    minWidth: 160,
  },
});

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Spacing, FontFamily, FontSize } from '../../theme';
import { Text } from './Text';

interface TagBadgeProps {
  label: string;
  color: string;
  onRemove?: () => void;
  onPress?: () => void;
  selected?: boolean;
  size?: 'sm' | 'md';
}

export function TagBadge({
  label,
  color,
  onRemove,
  onPress,
  selected = false,
  size = 'md',
}: TagBadgeProps) {
  const bgColor = `${color}22`;
  const borderColor = selected ? color : `${color}55`;
  const textColor = color;

  const content = (
    <View
      style={[
        styles.badge,
        size === 'sm' && styles.badgeSm,
        { backgroundColor: bgColor, borderColor },
        selected && styles.selected,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[
          styles.label,
          size === 'sm' && styles.labelSm,
          { color: textColor, fontFamily: FontFamily.medium },
        ]}
      >
        {label}
      </Text>
      {onRemove && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={12} color={textColor} style={styles.removeIcon} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityLabel={label}
        accessibilityState={{ checked: selected }}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    marginRight: Spacing[2],
    marginBottom: Spacing[2],
  },
  badgeSm: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 4,
  },
  selected: {
    borderWidth: 1.5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    marginRight: 6,
  },
  label: {
    fontSize: FontSize.sm,
  },
  labelSm: {
    fontSize: FontSize.xs,
  },
  removeIcon: {
    marginLeft: 4,
  },
});

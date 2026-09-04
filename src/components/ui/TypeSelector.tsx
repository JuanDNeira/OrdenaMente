import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, FontFamily, FontSize } from '../../theme';
import { Text } from './Text';
import type { ContainerType } from '../../types/common';
import { CONTAINER_TYPE_LABELS, CONTAINER_TYPE_ICONS } from '../../types/common';

interface TypeSelectorProps {
  value: ContainerType;
  onChange: (type: ContainerType) => void;
}

const TYPES: ContainerType[] = ['box', 'suitcase', 'drawer', 'shelf', 'bag', 'other'];

export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {TYPES.map((type) => {
        const isSelected = value === type;
        const iconName = CONTAINER_TYPE_ICONS[type] as React.ComponentProps<typeof Ionicons>['name'];
        return (
          <TouchableOpacity
            key={type}
            onPress={() => onChange(type)}
            activeOpacity={0.75}
            style={[
              styles.typeItem,
              isSelected && styles.typeItemSelected,
            ]}
            accessibilityRole="radio"
            accessibilityLabel={CONTAINER_TYPE_LABELS[type]}
            accessibilityState={{ selected: isSelected }}
          >
            <View
              style={[
                styles.iconWrapper,
                isSelected && styles.iconWrapperSelected,
              ]}
            >
              <Ionicons
                name={iconName}
                size={22}
                color={isSelected ? Colors.textPrimary : Colors.textTertiary}
              />
            </View>
            <Text
              style={[
                styles.typeLabel,
                { color: isSelected ? Colors.primary : Colors.textTertiary },
              ]}
            >
              {CONTAINER_TYPE_LABELS[type]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing[1],
    paddingBottom: Spacing[1],
  },
  typeItem: {
    alignItems: 'center',
    marginRight: Spacing[3],
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundTertiary,
    minWidth: 72,
  },
  typeItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGlow,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  iconWrapperSelected: {
    backgroundColor: Colors.primary,
  },
  typeLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});

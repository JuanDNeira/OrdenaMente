import React from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing } from '../../theme';

interface ColorPickerProps {
  value: string | undefined;
  onChange: (color: string) => void;
  colors?: string[];
}

const DEFAULT_COLORS = Colors.containerTags;

export function ColorPicker({ value, onChange, colors = DEFAULT_COLORS }: ColorPickerProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {colors.map((color) => {
        const isSelected = value === color;
        return (
          <TouchableOpacity
            key={color}
            onPress={() => onChange(color)}
            activeOpacity={0.8}
            style={[
              styles.swatch,
              { backgroundColor: color },
              isSelected && styles.swatchSelected,
            ]}
            accessibilityRole="radio"
            accessibilityLabel={`Color ${color}`}
            accessibilityState={{ selected: isSelected }}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            )}
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
    alignItems: 'center',
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    marginRight: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: Colors.textPrimary,
    transform: [{ scale: 1.15 }],
  },
});

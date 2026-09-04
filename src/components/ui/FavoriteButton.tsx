import React, { useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../theme';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: number;
}

export function FavoriteButton({ isFavorite, onToggle, size = 22 }: FavoriteButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Bounce animation
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.35, useNativeDriver: true, speed: 80, bounciness: 6 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 80, bounciness: 6 }),
    ]).start();
    onToggle();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      accessibilityState={{ selected: isFavorite }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={size}
          color={isFavorite ? Colors.secondary : Colors.textTertiary}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

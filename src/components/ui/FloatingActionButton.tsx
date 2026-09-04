import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius, Shadows } from '../../theme';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  gradient?: readonly [string, string];
  size?: number;
  bottom?: number;
  right?: number;
  accessibilityLabel?: string;
}

export function FloatingActionButton({
  onPress,
  icon = 'add',
  gradient = Colors.gradients.primary,
  size = 60,
  bottom = 90,
  right = 20,
  accessibilityLabel = 'Crear nuevo',
}: FloatingActionButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { bottom, right, width: size, height: size, transform: [{ scale: scaleAnim }] },
        Shadows.primaryGlow,
      ]}
    >
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: size / 2 }]}
        >
          <Ionicons name={icon} size={size * 0.43} color={Colors.textPrimary} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  button: {
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

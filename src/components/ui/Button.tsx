import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, ComponentSize, Spacing, FontFamily, FontSize } from '../../theme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const sizeStyle = {
    sm: styles.sizeSm,
    md: styles.sizeMd,
    lg: styles.sizeLg,
  }[size];

  const textSize = {
    sm: FontSize.sm,
    md: FontSize.base,
    lg: FontSize.md,
  }[size];

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.8}
        style={[styles.base, sizeStyle, isDisabled && styles.disabled, style]}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <LinearGradient
          colors={Colors.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.md }]}
        />
        {loading ? (
          <ActivityIndicator color={Colors.textPrimary} size="small" />
        ) : (
          <>
            {icon}
            <Text
              style={{
                fontFamily: FontFamily.semiBold,
                fontSize: textSize,
                color: Colors.textPrimary,
                marginLeft: icon ? Spacing[2] : 0,
              }}
            >
              {label}
            </Text>
          </>
        )}
      </TouchableOpacity>
    );
  }

  const variantStyle = {
    secondary: styles.secondary,
    ghost: styles.ghost,
    danger: styles.danger,
  }[variant as 'secondary' | 'ghost' | 'danger'];

  const textColor = {
    secondary: Colors.primary,
    ghost: Colors.textSecondary,
    danger: Colors.error,
  }[variant as 'secondary' | 'ghost' | 'danger'];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      style={[styles.base, sizeStyle, variantStyle, isDisabled && styles.disabled, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={{
              fontFamily: FontFamily.semiBold,
              fontSize: textSize,
              color: textColor,
              marginLeft: icon ? Spacing[2] : 0,
            }}
          >
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  sizeSm: {
    height: ComponentSize.buttonHeightSm,
    paddingHorizontal: Spacing[4],
  },
  sizeMd: {
    height: ComponentSize.buttonHeight,
    paddingHorizontal: Spacing[6],
  },
  sizeLg: {
    height: ComponentSize.buttonHeight + 8,
    paddingHorizontal: Spacing[8],
  },
  secondary: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: Colors.glass,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  danger: {
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  disabled: {
    opacity: 0.5,
  },
});

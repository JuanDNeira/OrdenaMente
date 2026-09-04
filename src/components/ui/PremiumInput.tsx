import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, BorderRadius, Spacing, FontFamily, FontSize, ComponentSize } from '../../theme';
import { Text } from './Text';

interface PremiumInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  rightIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  multiline?: boolean;
  numberOfLines?: number;
}

export function PremiumInput({
  label,
  error,
  hint,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  multiline = false,
  numberOfLines = 1,
  value,
  onFocus,
  onBlur,
  ...rest
}: PremiumInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    setIsFocused(true);
    Animated.timing(labelAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(labelAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start();
    }
    onBlur?.(e);
  };

  const borderColor = error
    ? Colors.error
    : isFocused
    ? Colors.borderFocus
    : Colors.border;

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 6],
  });
  const labelFontSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [FontSize.base, FontSize.xs],
  });
  const labelColor = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.textTertiary, isFocused ? Colors.primary : Colors.textSecondary],
  });

  const inputHeight = multiline ? numberOfLines * 24 + 32 : ComponentSize.inputHeight;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View
        style={[
          styles.container,
          { borderColor, height: multiline ? inputHeight : ComponentSize.inputHeight },
          isFocused && styles.focusedContainer,
        ]}
      >
        {icon && (
          <View style={styles.leftIcon}>
            <Ionicons
              name={icon}
              size={18}
              color={isFocused ? Colors.primary : Colors.textTertiary}
            />
          </View>
        )}

        <View style={[styles.inputWrapper, icon && styles.inputWithIcon]}>
          <Animated.Text
            style={[
              styles.label,
              { top: labelTop, fontSize: labelFontSize, color: labelColor },
            ]}
          >
            {label}
          </Animated.Text>
          <TextInput
            style={[
              styles.input,
              multiline && styles.multilineInput,
              { paddingTop: multiline ? 24 : 20 },
            ]}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholderTextColor={Colors.textTertiary}
            selectionColor={Colors.primary}
            multiline={multiline}
            numberOfLines={multiline ? numberOfLines : undefined}
            textAlignVertical={multiline ? 'top' : 'center'}
            accessibilityLabel={label}
            accessibilityHint={error ?? hint}
            {...rest}
          />
        </View>

        {rightIcon && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Acción del campo"
          >
            <Ionicons name={rightIcon} size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={Colors.error} />
          <Text variant="caption" color={Colors.error} style={styles.errorText} accessibilityRole="alert">
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" color={Colors.textTertiary} style={styles.hint}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing[4],
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundTertiary,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  focusedContainer: {
    backgroundColor: Colors.surface,
  },
  leftIcon: {
    paddingLeft: Spacing[4],
    paddingRight: Spacing[2],
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    paddingHorizontal: Spacing[4],
  },
  inputWithIcon: {
    paddingLeft: Spacing[2],
  },
  label: {
    position: 'absolute',
    left: Spacing[4],
    fontFamily: FontFamily.medium,
    zIndex: 1,
  },
  input: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    paddingBottom: Spacing[2],
    paddingHorizontal: 0,
  },
  multilineInput: {
    minHeight: 80,
  },
  rightIcon: {
    paddingHorizontal: Spacing[4],
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing[1],
    marginLeft: Spacing[1],
  },
  errorText: {
    marginLeft: 4,
  },
  hint: {
    marginTop: Spacing[1],
    marginLeft: Spacing[1],
  },
});

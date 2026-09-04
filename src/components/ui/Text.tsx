import React from 'react';
import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';
import { Colors, TextStyles } from '../../theme';

type TextVariant = keyof typeof TextStyles;

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

export function Text({
  variant = 'bodyMedium',
  color = Colors.textPrimary,
  align = 'left',
  style,
  ...props
}: TextProps) {
  return (
    <RNText
      style={[
        TextStyles[variant],
        { color, textAlign: align },
        style,
      ]}
      {...props}
    />
  );
}

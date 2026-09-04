import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function ScreenContainer({
  children,
  scrollable = false,
  style,
  contentStyle,
  edges = ['top', 'left', 'right'],
}: ScreenContainerProps) {
  if (scrollable) {
    return (
      <SafeAreaView style={[styles.safe, style]} edges={edges}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, style]} edges={edges}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[20], // espacio para tab bar
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing[4],
  },
});

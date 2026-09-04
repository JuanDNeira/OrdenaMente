import React, { useState, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, FontFamily, FontSize, BorderRadius } from '../theme';
import { Text } from '../components/ui';

import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';

type TabName = 'Home' | 'Dashboard';

const TABS: {
  name: TabName;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconActive: React.ComponentProps<typeof Ionicons>['name'];
}[] = [
  { name: 'Home', label: 'Inicio', icon: 'cube-outline', iconActive: 'cube' },
  { name: 'Dashboard', label: 'Panel', icon: 'bar-chart-outline', iconActive: 'bar-chart' },
];

function TabItem({
  tab,
  focused,
  onPress,
}: {
  tab: (typeof TABS)[number];
  focused: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.88, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 10 }).start();

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected: focused }}
    >
      <Animated.View
        style={[
          styles.tabIconWrapper,
          focused && styles.tabIconWrapperActive,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons
          name={focused ? tab.iconActive : tab.icon}
          size={22}
          color={focused ? Colors.primary : Colors.textTertiary}
        />
      </Animated.View>
      <Text style={[styles.tabLabel, { color: focused ? Colors.primary : Colors.textTertiary }]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function TabNavigator() {
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  const insets = useSafeAreaInsets();

  const handleTabPress = useCallback((name: TabName) => {
    if (name !== activeTab) {
      Haptics.selectionAsync();
      setActiveTab(name);
    }
  }, [activeTab]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'Home' && <HomeScreen />}
        {activeTab === 'Dashboard' && <DashboardScreen />}
      </View>

      <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom || Spacing[2] }]}>
        <View style={styles.tabBarInner}>
          {TABS.map((tab) => (
            <TabItem
              key={tab.name}
              tab={tab}
              focused={activeTab === tab.name}
              onPress={() => handleTabPress(tab.name)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { flex: 1 },
  tabBarContainer: {
    backgroundColor: Colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabBarInner: { flexDirection: 'row', paddingTop: Spacing[2] },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing[1] },
  tabIconWrapper: { width: 44, height: 32, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapperActive: { backgroundColor: Colors.primaryGlow },
  tabLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, marginTop: 2 },
});

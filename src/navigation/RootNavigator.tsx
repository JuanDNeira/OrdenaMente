import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppProvider from '../providers/AppProvider';

import TabNavigator from './TabNavigator';
import OnboardingScreen, { ONBOARDING_KEY } from '../screens/OnboardingScreen';
import {
  NavigationContext,
  type RouteName,
  type RouteParams,
  type NavigationState,
} from './NavigationContext';

// Re-export so existing imports from RootNavigator still work
export { useAppNavigation } from './NavigationContext';
export type { RouteName, RouteParams, NavigationState };

// ─── Screen transition wrapper ────────────────────────────────────────────────
function ScreenTransition({
  children,
  routeKey,
}: {
  children: React.ReactNode;
  routeKey: string;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(18);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [routeKey, fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}

// ─── Lazy screen loader — breaks the import cycle ─────────────────────────────
// Screens are required lazily inside renderScreen() so they are never
// statically imported at module-evaluation time, which is what causes cycles.
function renderScreen(route: RouteName) {
  switch (route) {
    case 'MainTabs': {
      return <TabNavigator />;
    }
    case 'ContainerDetail': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ContainerDetailScreen = require('../screens/ContainerDetailScreen').default;
      return <ContainerDetailScreen />;
    }
    case 'Search': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SearchScreen = require('../screens/SearchScreen').default;
      return <SearchScreen />;
    }
    case 'CreateContainer': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const CreateContainerScreen = require('../screens/CreateContainerScreen').default;
      return <CreateContainerScreen />;
    }
    case 'EditContainer': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const EditContainerScreen = require('../screens/EditContainerScreen').default;
      return <EditContainerScreen />;
    }
    case 'CreateItem': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const CreateItemScreen = require('../screens/CreateItemScreen').default;
      return <CreateItemScreen />;
    }
    case 'EditItem': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const EditItemScreen = require('../screens/EditItemScreen').default;
      return <EditItemScreen />;
    }
    case 'Dashboard': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const DashboardScreen = require('../screens/DashboardScreen').default;
      return <DashboardScreen />;
    }
    case 'Settings': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SettingsScreen = require('../screens/SettingsScreen').default;
      return <SettingsScreen />;
    }
    case 'Tags': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const TagsScreen = require('../screens/TagsScreen').default;
      return <TagsScreen />;
    }
    case 'Locations': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const LocationsScreen = require('../screens/LocationsScreen').default;
      return <LocationsScreen />;
    }
    // ── Módulo Reciclador Inteligente ──────────────────────────────────────
    case 'EcoHub': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const EcoHubScreen = require('../screens/EcoHubScreen').default;
      return <EcoHubScreen />;
    }
    case 'EcoClassify': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const EcoClassifyScreen = require('../screens/EcoClassifyScreen').default;
      return <EcoClassifyScreen />;
    }
    case 'EcoItemDetail': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const EcoItemDetailScreen = require('../screens/EcoItemDetailScreen').default;
      return <EcoItemDetailScreen />;
    }
    case 'EcoHistory': {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const EcoHistoryScreen = require('../screens/EcoHistoryScreen').default;
      return <EcoHistoryScreen />;
    }
    default:
      return <TabNavigator />;
  }
}

// ─── Root Navigator ───────────────────────────────────────────────────────────
export default function RootNavigator() {
  const [history, setHistory] = useState<NavigationState[]>([{ route: 'MainTabs' }]);
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // Check onboarding status once on mount
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    }).catch(() => setOnboardingDone(true)); // on error, skip onboarding
  }, []);

  const current = history[history.length - 1];
  const routeKey = `${current.route}-${history.length}`;

  const navigate = useCallback((route: RouteName, params?: RouteParams) => {
    setHistory((prev) => [...prev, { route, params }]);
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  // Still loading onboarding state
  if (onboardingDone === null) return null;

  return (
    <AppProvider>
      <NavigationContext.Provider
        value={{
          navigate,
          goBack,
          currentRoute: current.route,
          params: current.params,
        }}
      >
        <View style={styles.container}>
          {!onboardingDone ? (
            <OnboardingScreen onDone={() => setOnboardingDone(true)} />
          ) : (
            <ScreenTransition routeKey={routeKey}>
              {renderScreen(current.route)}
            </ScreenTransition>
          )}
        </View>
      </NavigationContext.Provider>
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
});

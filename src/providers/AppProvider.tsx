import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { initializeDb } from '../database/db';
import { Colors } from '../theme/colors';
import { useUIStore } from '../store/uiStore';

SplashScreen.preventAutoHideAsync();

interface AppProviderProps {
  children: React.ReactNode;
}

export default function AppProvider({ children }: AppProviderProps) {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const loadTheme = useUIStore((s) => s.loadTheme);

  useEffect(() => {
    Promise.all([
      initializeDb(),
      loadTheme(),
    ])
      .then(() => setDbReady(true))
      .catch((err) => {
        console.error('App init failed:', err);
        setDbReady(true);
      });
  }, [loadTheme]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && dbReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, dbReady]);

  const isReady = (fontsLoaded || fontError) && dbReady;

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {children}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

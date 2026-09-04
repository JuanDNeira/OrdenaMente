import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { Text } from '../components/ui';
import { Colors, Spacing, BorderRadius, FontFamily, FontSize, Shadows } from '../theme';
import { useAppNavigation } from '../navigation/NavigationContext';
import { useContainerStore } from '../store/containerStore';
import { useUIStore } from '../store/uiStore';
import { shareBackup, importDatabase, getStorageInfo } from '../utils/exportImport';
import { ContainerRepository } from '../database/repositories/ContainerRepository';

// ─── Animated theme toggle ────────────────────────────────────────────────────
function AnimatedThemeToggle({ active }: { active: boolean }) {
  const thumbPos = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(thumbPos, {
      toValue: active ? 1 : 0,
      useNativeDriver: false,
      speed: 20,
      bounciness: 4,
    }).start();
  }, [active, thumbPos]);

  const translateX = thumbPos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const trackColor = thumbPos.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  return (
    <View style={toggleStyles.wrapper}>
      <Animated.View style={[toggleStyles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[toggleStyles.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  wrapper: { justifyContent: 'center' },
  track: {
    width: 44,
    height: 24,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  thumb: {
    width: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.textPrimary,
  },
});

// ─── App version ──────────────────────────────────────────────────────────────
const APP_VERSION = '1.0.0';

// ─── Settings row ─────────────────────────────────────────────────────────────
function SettingsRow({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  onPress,
  rightElement,
  destructive,
  loading,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  destructive?: boolean;
  loading?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 60, bounciness: 4 }).start();
  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 8 }).start();

  const content = (
    <Animated.View style={[styles.settingsRow, { transform: [{ scale: scaleAnim }] }]}>
      <View style={[styles.settingsRowIcon, { backgroundColor: iconBg }]}>
        {loading ? (
          <ActivityIndicator size="small" color={iconColor} />
        ) : (
          <Ionicons name={icon} size={18} color={iconColor} />
        )}
      </View>
      <View style={styles.settingsRowInfo}>
        <Text
          variant="labelLarge"
          color={destructive ? Colors.error : Colors.textPrimary}
        >
          {title}
        </Text>
        {subtitle && (
          <Text variant="caption" color={Colors.textTertiary} style={styles.settingsRowSubtitle}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement ?? (
        onPress ? <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} /> : null
      )}
    </Animated.View>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
      accessibilityState={{ disabled: loading }}
    >
      {content}
    </TouchableOpacity>
  );
}

// ─── Settings section ─────────────────────────────────────────────────────────
function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text variant="labelSmall" color={Colors.textTertiary} style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.sectionCard}>
        {children}
      </View>
    </View>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const { goBack, navigate } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const { loadContainers } = useContainerStore();
  const { isDarkMode, toggleTheme } = useUIStore();

  const [storageInfo, setStorageInfo] = useState({
    containerCount: 0,
    itemCount: 0,
    tagCount: 0,
    locationCount: 0,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(12)).current;

  const loadInfo = useCallback(async () => {
    try {
      const info = await getStorageInfo();
      setStorageInfo(info);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    loadInfo();
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(contentSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [loadInfo, contentFade, contentSlide]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await shareBackup();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert('Error al exportar', e instanceof Error ? e.message : 'Inténtalo de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    // Find the most recent backup in the cache directory
    Alert.alert(
      'Importar respaldo',
      'Primero exporta un respaldo desde esta pantalla. El archivo más reciente en el directorio de caché será importado.\n\nEsto reemplazará TODOS los datos actuales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Buscar respaldo',
          onPress: async () => {
            try {
              const cacheDir = FileSystem.cacheDirectory ?? '';
              const files = await FileSystem.readDirectoryAsync(cacheDir);
              const backups = files
                .filter((f) => f.startsWith('san-alejo-backup-') && f.endsWith('.json'))
                .sort()
                .reverse();

              if (backups.length === 0) {
                Alert.alert(
                  'Sin respaldo',
                  'No se encontró ningún archivo de respaldo. Exporta primero desde esta pantalla y luego importa.'
                );
                return;
              }

              const latestFile = backups[0];
              const fileUri = `${cacheDir}${latestFile}`;

              Alert.alert(
                'Confirmar importación',
                `Se importará: ${latestFile}\n\nEsto reemplazará todos los datos actuales. ¿Continuar?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Importar',
                    style: 'destructive',
                    onPress: async () => {
                      setIsImporting(true);
                      try {
                        const { imported } = await importDatabase(fileUri);
                        await loadContainers();
                        await loadInfo();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        Alert.alert(
                          'Importación exitosa',
                          `Se importaron ${imported} registros correctamente.`
                        );
                      } catch (e) {
                        Alert.alert('Error al importar', e instanceof Error ? e.message : 'Archivo inválido.');
                      } finally {
                        setIsImporting(false);
                      }
                    },
                  },
                ]
              );
            } catch (e) {
              Alert.alert('Error', 'No se pudo acceder al directorio de archivos.');
            }
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      'Limpiar todos los datos',
      'Se eliminarán todos los contenedores, ítems y tags. Las ubicaciones se conservarán. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar todo',
          style: 'destructive',
          onPress: async () => {
            try {
              await ContainerRepository.deleteAllData();
              await loadContainers();
              await loadInfo();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              Alert.alert('Datos eliminados', 'Todos los datos han sido eliminados.');
            } catch {
              Alert.alert('Error', 'No se pudieron eliminar los datos.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={goBack}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text variant="labelSmall" color={Colors.textTertiary} style={styles.headerLabel}>
            CONFIGURACIÓN
          </Text>
          <Text variant="headingSmall" color={Colors.textPrimary}>Ajustes</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <Animated.ScrollView
        style={[styles.scroll, { opacity: contentFade, transform: [{ translateY: contentSlide }] }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Storage info */}
        <SettingsSection title="ALMACENAMIENTO">
          <View style={styles.storageGrid}>
            <View style={styles.storageItem}>
              <Text variant="headingMedium" color={Colors.primary}>{storageInfo.containerCount}</Text>
              <Text variant="caption" color={Colors.textTertiary}>Contenedores</Text>
            </View>
            <View style={styles.storageDivider} />
            <View style={styles.storageItem}>
              <Text variant="headingMedium" color={Colors.accent}>{storageInfo.itemCount}</Text>
              <Text variant="caption" color={Colors.textTertiary}>Ítems</Text>
            </View>
            <View style={styles.storageDivider} />
            <View style={styles.storageItem}>
              <Text variant="headingMedium" color={Colors.secondary}>{storageInfo.tagCount}</Text>
              <Text variant="caption" color={Colors.textTertiary}>Tags</Text>
            </View>
            <View style={styles.storageDivider} />
            <View style={styles.storageItem}>
              <Text variant="headingMedium" color={Colors.warning}>{storageInfo.locationCount}</Text>
              <Text variant="caption" color={Colors.textTertiary}>Lugares</Text>
            </View>
          </View>
        </SettingsSection>

        {/* Organización */}
        <SettingsSection title="ORGANIZACIÓN">
          <SettingsRow
            icon="pricetag-outline"
            iconColor={Colors.secondary}
            iconBg={`${Colors.secondary}22`}
            title="Gestionar etiquetas"
            subtitle="Crear, editar y eliminar tags"
            onPress={() => navigate('Tags')}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="location-outline"
            iconColor={Colors.warning}
            iconBg={`${Colors.warning}22`}
            title="Gestionar ubicaciones"
            subtitle="Crear, editar y eliminar lugares"
            onPress={() => navigate('Locations')}
          />
        </SettingsSection>

        {/* Datos */}
        <SettingsSection title="DATOS">
          <SettingsRow
            icon="share-outline"
            iconColor={Colors.accent}
            iconBg={`${Colors.accent}22`}
            title="Exportar respaldo"
            subtitle="Compartir JSON con todos los datos"
            onPress={handleExport}
            loading={isExporting}
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="download-outline"
            iconColor={Colors.primary}
            iconBg={Colors.primaryGlow}
            title="Importar respaldo"
            subtitle="Restaurar desde último backup exportado"
            onPress={handleImport}
            loading={isImporting}
          />
        </SettingsSection>

        {/* Zona peligrosa */}
        <SettingsSection title="ZONA PELIGROSA">
          <SettingsRow
            icon="trash-outline"
            iconColor={Colors.error}
            iconBg={Colors.errorLight}
            title="Limpiar todos los datos"
            subtitle="Elimina contenedores, ítems y tags"
            onPress={handleClearData}
            destructive
          />
        </SettingsSection>

        {/* Apariencia */}
        <SettingsSection title="APARIENCIA">
          <SettingsRow
            icon={isDarkMode ? 'moon' : 'sunny'}
            iconColor={isDarkMode ? Colors.primary : Colors.warning}
            iconBg={isDarkMode ? Colors.primaryGlow : `${Colors.warning}22`}
            title="Tema"
            subtitle={isDarkMode ? 'Oscuro (activo)' : 'Claro (próximamente)'}
            onPress={() => {
              Haptics.selectionAsync();
              toggleTheme();
            }}
            rightElement={<AnimatedThemeToggle active={isDarkMode} />}
          />
        </SettingsSection>

        {/* Acerca de */}
        <SettingsSection title="ACERCA DE">
          <SettingsRow
            icon="cube-outline"
            iconColor={Colors.primary}
            iconBg={Colors.primaryGlow}
            title="OrdenaMente"
            subtitle="Organizador personal de objetos"
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="code-slash-outline"
            iconColor={Colors.textSecondary}
            iconBg={Colors.backgroundTertiary}
            title="Versión"
            rightElement={
              <Text variant="labelSmall" color={Colors.textTertiary}>{APP_VERSION}</Text>
            }
          />
          <View style={styles.rowDivider} />
          <SettingsRow
            icon="server-outline"
            iconColor={Colors.textSecondary}
            iconBg={Colors.backgroundTertiary}
            title="Base de datos"
            subtitle="SQLite local — sin nube"
          />
        </SettingsSection>

        <View style={styles.bottomSpacer} />
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    letterSpacing: 2,
    marginBottom: 1,
  },
  headerRight: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[8],
  },
  section: {
    marginBottom: Spacing[5],
  },
  sectionTitle: {
    letterSpacing: 2,
    marginBottom: Spacing[2],
    marginLeft: Spacing[1],
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
  },
  settingsRowIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  settingsRowInfo: {
    flex: 1,
  },
  settingsRowSubtitle: {
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing[4] + 36 + Spacing[3],
  },
  // Storage grid
  storageGrid: {
    flexDirection: 'row',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[2],
  },
  storageItem: {
    flex: 1,
    alignItems: 'center',
  },
  storageDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing[2],
  },
  bottomSpacer: {
    height: Spacing[8],
  },
});

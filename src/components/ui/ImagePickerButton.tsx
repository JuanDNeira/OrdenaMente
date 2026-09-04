import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { Colors, BorderRadius, Spacing } from '../../theme';
import { Text } from './Text';

interface ImagePickerButtonProps {
  uri?: string;
  onImageSelected: (uri: string) => void;
  onImageRemoved?: () => void;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const SIZES = {
  sm: { container: 72, icon: 24 },
  md: { container: 100, icon: 32 },
  lg: { container: 140, icon: 40 },
} as const;

export function ImagePickerButton({
  uri,
  onImageSelected,
  onImageRemoved,
  size = 'md',
  label = 'Agregar imagen',
}: ImagePickerButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const dim = SIZES[size];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para seleccionar imágenes.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsLoading(true);
      try {
        // Resize to max 800px to keep storage small
        const manipulated = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onImageSelected(manipulated.uri);
      } catch {
        Alert.alert('Error', 'No se pudo procesar la imagen.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleLongPress = () => {
    if (!uri || !onImageRemoved) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Imagen', '¿Qué deseas hacer?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cambiar imagen', onPress: pickImage },
      { text: 'Eliminar imagen', style: 'destructive', onPress: onImageRemoved },
    ]);
  };

  if (uri) {
    return (
      <TouchableOpacity
        onPress={pickImage}
        onLongPress={handleLongPress}
        activeOpacity={0.85}
        style={[styles.imageContainer, { width: dim.container, height: dim.container }]}
        accessibilityRole="imagebutton"
        accessibilityLabel="Cambiar imagen"
        accessibilityHint="Mantén presionado para más opciones"
      >
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius: BorderRadius.lg }]}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={Colors.textPrimary} />
          </View>
        )}
        <View style={styles.editBadge}>
          <Ionicons name="camera" size={12} color={Colors.textPrimary} />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={pickImage}
      activeOpacity={0.75}
      style={[styles.placeholder, { width: dim.container, height: dim.container }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (
        <>
          <Ionicons name="camera-outline" size={dim.icon} color={Colors.textTertiary} />
          {size !== 'sm' && (
            <Text variant="caption" color={Colors.textTertiary} align="center" style={styles.placeholderLabel}>
              {label}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.backgroundTertiary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[1],
  },
  placeholderLabel: {
    marginTop: Spacing[1],
    paddingHorizontal: Spacing[2],
  },
});

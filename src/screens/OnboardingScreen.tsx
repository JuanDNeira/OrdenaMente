import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text } from '../components/ui';
import { Colors, Spacing, BorderRadius, FontFamily, FontSize } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const ONBOARDING_KEY = 'san_alejo_onboarding_done';

interface OnboardingSlide {
  id: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  title: string;
  description: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'cube',
    color: Colors.primary,
    title: 'Organiza tus cosas',
    description: 'Crea contenedores para cajas, cajones, estantes y más. Encuentra cualquier objeto en segundos.',
  },
  {
    id: '2',
    icon: 'images',
    color: Colors.accent,
    title: 'Fotos reales',
    description: 'Agrega imágenes a tus contenedores e ítems para identificarlos visualmente de un vistazo.',
  },
  {
    id: '3',
    icon: 'heart',
    color: Colors.secondary,
    title: 'Favoritos y tags',
    description: 'Marca lo más importante como favorito y usa etiquetas de colores para agrupar por categoría.',
  },
  {
    id: '4',
    icon: 'search',
    color: Colors.warning,
    title: 'Búsqueda poderosa',
    description: 'Encuentra cualquier ítem por nombre, descripción, tag o ubicación. Todo en un solo lugar.',
  },
];

// ─── Animated dot ─────────────────────────────────────────────────────────────
function AnimatedDot({ active }: { active: boolean }) {
  const widthAnim = useRef(new Animated.Value(active ? 20 : 8)).current;
  const opacityAnim = useRef(new Animated.Value(active ? 1 : 0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: active ? 20 : 8,
        useNativeDriver: false,
        speed: 20,
        bounciness: 6,
      }),
      Animated.timing(opacityAnim, {
        toValue: active ? 1 : 0.4,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [active, widthAnim, opacityAnim]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: widthAnim,
          opacity: opacityAnim,
          backgroundColor: active ? Colors.primary : Colors.border,
        },
      ]}
    />
  );
}

interface OnboardingScreenProps {
  onDone: () => void;
}

export default function OnboardingScreen({ onDone }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  // Per-slide fade animations
  const slideAnims = useRef(SLIDES.map(() => new Animated.Value(0))).current;

  const isLast = currentIndex === SLIDES.length - 1;

  // Animate the first slide in on mount
  useEffect(() => {
    Animated.timing(slideAnims[0], {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [slideAnims]);

  const handleNext = async () => {
    Haptics.selectionAsync();
    if (isLast) {
      Animated.sequence([
        Animated.spring(buttonScale, { toValue: 0.92, useNativeDriver: true, speed: 80 }),
        Animated.spring(buttonScale, { toValue: 1, useNativeDriver: true, speed: 80 }),
      ]).start();
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      onDone();
    } else {
      const next = currentIndex + 1;
      // Fade out current, scroll, fade in next
      Animated.timing(slideAnims[currentIndex], {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        flatListRef.current?.scrollToIndex({ index: next, animated: false });
        setCurrentIndex(next);
        Animated.timing(slideAnims[next], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  const handleSkip = async () => {
    Haptics.selectionAsync();
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <Animated.View
      style={[
        styles.slide,
        { opacity: slideAnims[index] },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${item.color}22`, borderColor: `${item.color}44` }]}>
        <LinearGradient
          colors={[`${item.color}33`, `${item.color}11`]}
          style={[StyleSheet.absoluteFill, { borderRadius: 80 }]}
        />
        <Ionicons name={item.icon} size={64} color={item.color} />
      </View>
      <Text variant="headingLarge" color={Colors.textPrimary} align="center" style={styles.slideTitle}>
        {item.title}
      </Text>
      <Text variant="bodyMedium" color={Colors.textSecondary} align="center" style={styles.slideDesc}>
        {item.description}
      </Text>
    </Animated.View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Omitir introducción"
        >
          <Text variant="labelMedium" color={Colors.textTertiary}>Omitir</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.flatList}
      />

      {/* Animated dots */}
      <View style={styles.dotsRow} accessibilityRole="tablist">
        {SLIDES.map((_, i) => (
          <AnimatedDot key={i} active={i === currentIndex} />
        ))}
      </View>

      {/* CTA button */}
      <Animated.View style={[styles.buttonWrapper, { transform: [{ scale: buttonScale }] }]}>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleNext}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Empezar a usar OrdenaMente' : `Siguiente, paso ${currentIndex + 2} de ${SLIDES.length}`}
        >
          <LinearGradient
            colors={Colors.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: BorderRadius.xl }]}
          />
          <Text style={styles.ctaText}>
            {isLast ? 'Empezar' : 'Siguiente'}
          </Text>
          <Ionicons
            name={isLast ? 'checkmark' : 'arrow-forward'}
            size={18}
            color={Colors.textPrimary}
            style={styles.ctaIcon}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
    minHeight: 44,
    justifyContent: 'center',
  },
  flatList: {
    flex: 1,
    width: SCREEN_WIDTH,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[8],
    overflow: 'hidden',
  },
  slideTitle: {
    marginBottom: Spacing[4],
  },
  slideDesc: {
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[6],
  },
  dot: {
    height: 8,
    borderRadius: BorderRadius.full,
  },
  buttonWrapper: {
    width: SCREEN_WIDTH - Spacing[8] * 2,
    marginBottom: Spacing[6],
  },
  ctaButton: {
    height: 56,
    borderRadius: BorderRadius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  ctaIcon: {
    marginLeft: Spacing[2],
  },
});

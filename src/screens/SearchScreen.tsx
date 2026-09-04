import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, SkeletonSearchResult, TagBadge } from '../components/ui';
import { Colors, Spacing, BorderRadius, FontFamily, FontSize, ComponentSize, Shadows } from '../theme';
import { useAppNavigation } from '../navigation/NavigationContext';
import { ContainerRepository } from '../database/repositories/ContainerRepository';
import { ItemRepository } from '../database/repositories/ItemRepository';
import { TagRepository } from '../database/repositories/TagRepository';
import type { Container } from '../types/Container';
import type { Item } from '../types/Item';
import type { Tag } from '../types/Tag';
import { CONTAINER_TYPE_LABELS, CONTAINER_TYPE_ICONS } from '../types/common';

const RECENTS_KEY = 'san_alejo_recent_searches';
const MAX_RECENTS = 8;
const DEBOUNCE_MS = 280;

// ─── Filter types ─────────────────────────────────────────────────────────────
type FilterType = 'all' | 'containers' | 'items' | 'favorites';
type SortType = 'relevance' | 'name' | 'recent';

const FILTERS: { key: FilterType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { key: 'all', label: 'Todo', icon: 'apps-outline' },
  { key: 'containers', label: 'Contenedores', icon: 'cube-outline' },
  { key: 'items', label: 'Ítems', icon: 'pricetag-outline' },
  { key: 'favorites', label: 'Favoritos', icon: 'heart-outline' },
];

// ─── Persistent recents ───────────────────────────────────────────────────────
async function loadRecents(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

async function saveRecent(query: string, current: string[]): Promise<string[]> {
  const trimmed = query.trim();
  if (!trimmed) return current;
  const updated = [trimmed, ...current.filter((r) => r !== trimmed)].slice(0, MAX_RECENTS);
  try { await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(updated)); } catch {}
  return updated;
}

async function clearRecents(): Promise<void> {
  try { await AsyncStorage.removeItem(RECENTS_KEY); } catch {}
}

// ─── Animated result row ──────────────────────────────────────────────────────
function ResultRow({ children, index }: { children: React.ReactNode; index: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, delay: index * 35, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 200, delay: index * 35, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Container result ─────────────────────────────────────────────────────────
const ContainerResult = React.memo(function ContainerResult({
  container, onPress, index,
}: { container: Container; onPress: () => void; index: number }) {
  const accentColor = container.color_tag ?? Colors.primary;
  const iconName = CONTAINER_TYPE_ICONS[container.type] as React.ComponentProps<typeof Ionicons>['name'];
  return (
    <ResultRow index={index}>
      <TouchableOpacity
        style={styles.resultCard}
        onPress={onPress}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${container.name}, ${CONTAINER_TYPE_LABELS[container.type]}${container.is_favorite ? ', favorito' : ''}`}
      >
        <View style={[styles.resultIconWrapper, { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}44` }]}>
          <Ionicons name={iconName} size={20} color={accentColor} />
        </View>
        <View style={styles.resultInfo}>
          <View style={styles.resultTitleRow}>
            <Text variant="labelLarge" color={Colors.textPrimary} numberOfLines={1} style={styles.resultTitle}>
              {container.name}
            </Text>
            {container.is_favorite && (
              <Ionicons name="heart" size={12} color={Colors.secondary} style={styles.favIcon} />
            )}
          </View>
          <Text variant="caption" color={Colors.textTertiary} style={styles.resultSub}>
            {CONTAINER_TYPE_LABELS[container.type]}
            {container.description ? ` · ${container.description}` : ''}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
      </TouchableOpacity>
    </ResultRow>
  );
});

// ─── Item result ──────────────────────────────────────────────────────────────
const ItemResult = React.memo(function ItemResult({ item, index }: { item: Item; index: number }) {
  return (
    <ResultRow index={index}>
      <View style={styles.resultCard}>
        <View style={[styles.resultIconWrapper, styles.itemIconWrapper]}>
          <Ionicons name="pricetag" size={18} color={Colors.accent} />
        </View>
        <View style={styles.resultInfo}>
          <View style={styles.resultTitleRow}>
            <Text variant="labelLarge" color={Colors.textPrimary} numberOfLines={1} style={styles.resultTitle}>
              {item.name}
            </Text>
            {item.is_favorite && (
              <Ionicons name="heart" size={12} color={Colors.secondary} style={styles.favIcon} />
            )}
          </View>
          {item.description ? (
            <Text variant="caption" color={Colors.textTertiary} numberOfLines={1} style={styles.resultSub}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>×{item.quantity}</Text>
        </View>
      </View>
    </ResultRow>
  );
});

// ─── SearchScreen ─────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const { goBack, navigate } = useAppNavigation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQueryState] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('relevance');
  const [recents, setRecents] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [containers, setContainers] = useState<Container[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const hasQuery = query.trim().length > 0 || selectedTagIds.length > 0 || activeFilter === 'favorites';

  useEffect(() => {
    loadRecents().then(setRecents);
    TagRepository.findAll().then(setAllTags).catch(() => {});
  }, []);

  const runSearch = useCallback(async (q: string, tagIds: string[], filter: FilterType) => {
    setIsSearching(true);
    try {
      const trimmed = q.trim();
      let newContainers: Container[] = [];
      let newItems: Item[] = [];

      if (filter === 'favorites' && !trimmed && tagIds.length === 0) {
        // Favorites-only browse — load all favorites
        newContainers = await ContainerRepository.findFavorites();
      } else if (tagIds.length > 0 && !trimmed) {
        // Tag-only search
        if (filter !== 'items') {
          newContainers = await ContainerRepository.findByTagIds(tagIds);
        }
      } else if (trimmed) {
        // Text search
        if (filter !== 'items') {
          newContainers = await ContainerRepository.search(trimmed);
        }
        if (filter !== 'containers' && filter !== 'favorites') {
          newItems = await ItemRepository.search(trimmed);
        }
        // Filter by tags if any selected
        if (tagIds.length > 0 && newContainers.length > 0) {
          const tagFiltered = await ContainerRepository.findByTagIds(tagIds);
          const tagFilteredIds = new Set(tagFiltered.map((c) => c.id));
          newContainers = newContainers.filter((c) => tagFilteredIds.has(c.id));
        }
      }

      // Apply favorites filter on text results
      if (filter === 'favorites' && trimmed) {
        newContainers = newContainers.filter((c) => c.is_favorite);
        newItems = newItems.filter((i) => i.is_favorite);
      }

      setContainers(newContainers);
      setItems(newItems);
    } catch {
      setContainers([]);
      setItems([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => runSearch(q, selectedTagIds, activeFilter), DEBOUNCE_MS);
  }, [runSearch, selectedTagIds, activeFilter]);

  const handleFilterPress = useCallback((filter: FilterType) => {
    setActiveFilter(filter);
    Haptics.selectionAsync();
    runSearch(query, selectedTagIds, filter);
  }, [query, selectedTagIds, runSearch]);
  const handleTagToggle = useCallback((tagId: string) => {
    Haptics.selectionAsync();
    setSelectedTagIds((prev) => {
      const next = prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId];
      runSearch(query, next, activeFilter);
      return next;
    });
  }, [query, activeFilter, runSearch]);

  const handleContainerPress = useCallback(async (containerId: string) => {
    const updated = await saveRecent(query, recents);
    setRecents(updated);
    Keyboard.dismiss();
    navigate('ContainerDetail', { containerId });
  }, [query, recents, navigate]);

  const handleRecentPress = useCallback((recent: string) => {
    setQueryState(recent);
    Haptics.selectionAsync();
    runSearch(recent, selectedTagIds, activeFilter);
  }, [runSearch, selectedTagIds, activeFilter]);

  const handleClearRecents = useCallback(async () => {
    await clearRecents();
    setRecents([]);
    Haptics.selectionAsync();
  }, []);

  const handleClear = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setQueryState('');
    setContainers([]);
    setItems([]);
    setSelectedTagIds([]);
    inputRef.current?.focus();
  }, []);

  // Sort results
  const sortedContainers = [...containers].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'recent') return b.updated_at - a.updated_at;
    return 0;
  });
  const sortedItems = [...items].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'recent') return b.updated_at - a.updated_at;
    return 0;
  });

  const filteredContainers = activeFilter === 'items' ? [] : sortedContainers;
  const filteredItems = (activeFilter === 'containers' || activeFilter === 'favorites') ? [] : sortedItems;
  const hasResults = filteredContainers.length > 0 || filteredItems.length > 0;
  const totalResults = filteredContainers.length + filteredItems.length;

  // ─── Idle state ──────────────────────────────────────────────────────────────
  const renderIdleState = () => (
    <ScrollView
      style={styles.idleScroll}
      contentContainerStyle={styles.idleContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Tag quick filters */}
      {allTags.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <View style={[styles.sectionAccent, { backgroundColor: Colors.secondary }]} />
            <Text variant="labelMedium" color={Colors.textTertiary} style={styles.sectionTitle}>
              FILTRAR POR TAG
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll}>
            {allTags.map((tag) => (
              <TagBadge
                key={tag.id}
                label={tag.name}
                color={tag.color}
                selected={selectedTagIds.includes(tag.id)}
                onPress={() => handleTagToggle(tag.id)}
                size="sm"
              />
            ))}
          </ScrollView>
        </>
      )}

      {/* Recent searches */}
      {recents.length > 0 && (
        <>
          <View style={[styles.sectionRow, styles.sectionRowSpaced]}>
            <View style={styles.sectionAccent} />
            <Text variant="labelMedium" color={Colors.textTertiary} style={styles.sectionTitle}>
              RECIENTES
            </Text>
            <TouchableOpacity onPress={handleClearRecents} activeOpacity={0.7}>
              <Text variant="caption" color={Colors.textTertiary}>Limpiar</Text>
            </TouchableOpacity>
          </View>
          {recents.map((recent, i) => (
            <TouchableOpacity
              key={`${recent}-${i}`}
              style={styles.recentItem}
              onPress={() => handleRecentPress(recent)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={16} color={Colors.textTertiary} style={styles.recentIcon} />
              <Text variant="bodyMedium" color={Colors.textSecondary} style={styles.recentText}>
                {recent}
              </Text>
              <Ionicons name="arrow-up-outline" size={14} color={Colors.textTertiary} style={styles.recentArrow} />
            </TouchableOpacity>
          ))}
        </>
      )}

      {recents.length === 0 && selectedTagIds.length === 0 && (
        <View style={styles.hintState}>
          <View style={styles.hintIconWrapper}>
            <Ionicons name="search" size={32} color={Colors.textTertiary} />
          </View>
          <Text variant="headingSmall" color={Colors.textSecondary} align="center" style={styles.hintTitle}>
            Busca en OrdenaMente
          </Text>
          <Text variant="bodyMedium" color={Colors.textTertiary} align="center">
            Por nombre, descripción, tags o favoritos
          </Text>
        </View>
      )}
    </ScrollView>
  );

  // ─── Results ──────────────────────────────────────────────────────────────────
  const renderResults = () => (
    <ScrollView
      style={styles.resultsScroll}
      contentContainerStyle={styles.resultsContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Sort + count row */}
      <View style={styles.resultsMetaRow}>
        <Text variant="caption" color={Colors.textTertiary}>
          {totalResults} resultado{totalResults !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => { setShowSortMenu((v) => !v); Haptics.selectionAsync(); }}
          activeOpacity={0.75}
        >
          <Ionicons name="swap-vertical-outline" size={14} color={Colors.textSecondary} />
          <Text variant="caption" color={Colors.textSecondary} style={styles.sortLabel}>
            {sortBy === 'relevance' ? 'Relevancia' : sortBy === 'name' ? 'Nombre' : 'Reciente'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sort menu */}
      {showSortMenu && (
        <View style={styles.sortMenu}>
          {(['relevance', 'name', 'recent'] as SortType[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.sortMenuItem, sortBy === s && styles.sortMenuItemActive]}
              onPress={() => { setSortBy(s); setShowSortMenu(false); Haptics.selectionAsync(); }}
              activeOpacity={0.75}
            >
              <Text variant="labelSmall" color={sortBy === s ? Colors.primary : Colors.textSecondary}>
                {s === 'relevance' ? 'Relevancia' : s === 'name' ? 'Nombre A-Z' : 'Más reciente'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tag filters active */}
      {selectedTagIds.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagsScroll} style={styles.activeTagsRow}>
          {allTags.filter((t) => selectedTagIds.includes(t.id)).map((tag) => (
            <TagBadge
              key={tag.id}
              label={tag.name}
              color={tag.color}
              selected
              onRemove={() => handleTagToggle(tag.id)}
              size="sm"
            />
          ))}
        </ScrollView>
      )}

      {/* Containers section */}
      {filteredContainers.length > 0 && (
        <>
          <View style={styles.sectionRow}>
            <View style={[styles.sectionAccent, { backgroundColor: Colors.primary }]} />
            <Text variant="labelMedium" color={Colors.textTertiary} style={styles.sectionTitle}>
              CONTENEDORES ({filteredContainers.length})
            </Text>
          </View>
          {filteredContainers.map((c, i) => (
            <ContainerResult
              key={c.id}
              container={c}
              index={i}
              onPress={() => handleContainerPress(c.id)}
            />
          ))}
        </>
      )}

      {/* Items section */}
      {filteredItems.length > 0 && (
        <>
          <View style={[styles.sectionRow, filteredContainers.length > 0 && styles.sectionRowSpaced]}>
            <View style={[styles.sectionAccent, { backgroundColor: Colors.accent }]} />
            <Text variant="labelMedium" color={Colors.textTertiary} style={styles.sectionTitle}>
              ÍTEMS ({filteredItems.length})
            </Text>
          </View>
          {filteredItems.map((item, i) => (
            <ItemResult key={item.id} item={item} index={filteredContainers.length + i} />
          ))}
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Search bar */}
      <View style={styles.searchBarRow}>
        <View style={styles.inputWrapper}>
          <Ionicons
            name={isSearching ? 'sync-outline' : 'search-outline'}
            size={18}
            color={hasQuery ? Colors.primary : Colors.textTertiary}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Buscar por nombre, descripción, tags..."
            placeholderTextColor={Colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            selectionColor={Colors.primary}
          />
          {(hasQuery) && (
            <TouchableOpacity onPress={handleClear} activeOpacity={0.7} style={styles.clearButton} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
              <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={goBack} style={styles.cancelButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Cancelar búsqueda">
          <Text variant="labelMedium" color={Colors.primary}>Cancelar</Text>
        </TouchableOpacity>
      </View>

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filtersRow}
      >
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => handleFilterPress(filter.key)}
              activeOpacity={0.75}
              accessibilityRole="tab"
              accessibilityLabel={filter.label}
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons
                name={filter.icon}
                size={13}
                color={isActive ? Colors.textPrimary : Colors.textTertiary}
                style={styles.filterChipIcon}
              />
              <Text style={[styles.filterChipText, { color: isActive ? Colors.textPrimary : Colors.textTertiary }]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content */}
      {!hasQuery && renderIdleState()}
      {hasQuery && isSearching && (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2, 3].map((i) => <SkeletonSearchResult key={i} />)}
        </View>
      )}
      {hasQuery && !isSearching && !hasResults && (
        <View style={styles.noResultsWrapper}>
          <View style={styles.noResultsIcon}>
            <Ionicons name="file-tray-outline" size={36} color={Colors.textTertiary} />
          </View>
          <Text variant="headingSmall" color={Colors.textSecondary} align="center" style={styles.noResultsTitle}>
            Sin resultados
          </Text>
          <Text variant="bodyMedium" color={Colors.textTertiary} align="center">
            {query ? `Nada para "${query}"` : 'Prueba con otro filtro'}
          </Text>
        </View>
      )}
      {hasQuery && !isSearching && hasResults && renderResults()}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[3],
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    height: ComponentSize.inputHeight,
    paddingHorizontal: Spacing[3],
    marginRight: Spacing[3],
    ...Shadows.sm,
  },
  searchIcon: { marginRight: Spacing[2] },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  clearButton: { padding: 4 },
  cancelButton: { paddingVertical: Spacing[2], paddingLeft: Spacing[1] },
  filtersRow: { maxHeight: 44, marginBottom: Spacing[2] },
  filtersContent: { paddingHorizontal: Spacing[4], alignItems: 'center' },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3],
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundTertiary,
    marginRight: Spacing[2],
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipIcon: { marginRight: 5 },
  filterChipText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm },
  // Idle
  idleScroll: { flex: 1 },
  idleContent: { paddingHorizontal: Spacing[4], paddingTop: Spacing[2], paddingBottom: Spacing[20] },
  tagsScroll: { paddingBottom: Spacing[2] },
  activeTagsRow: { marginBottom: Spacing[2] },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing[3] },
  sectionRowSpaced: { marginTop: Spacing[5] },
  sectionAccent: {
    width: 3, height: 14, borderRadius: BorderRadius.full,
    backgroundColor: Colors.textTertiary, marginRight: Spacing[3],
  },
  sectionTitle: { letterSpacing: 2, flex: 1 },
  recentItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: Spacing[3],
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  recentIcon: { marginRight: Spacing[3] },
  recentText: { flex: 1 },
  recentArrow: { transform: [{ rotate: '45deg' }] },
  hintState: { alignItems: 'center', paddingTop: Spacing[16] },
  hintIconWrapper: {
    width: 72, height: 72, borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundTertiary, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[4],
  },
  hintTitle: { marginBottom: Spacing[2] },
  // Skeleton
  skeletonContainer: { paddingHorizontal: Spacing[4], paddingTop: Spacing[3] },
  // No results
  noResultsWrapper: {
    alignItems: 'center',
    paddingTop: Spacing[16],
    paddingHorizontal: Spacing[8],
    paddingBottom: Spacing[20],
  },
  noResultsIcon: {
    width: 72, height: 72, borderRadius: BorderRadius.full,
    backgroundColor: Colors.backgroundTertiary, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[4],
  },
  noResultsTitle: { marginBottom: Spacing[2] },
  // Results
  resultsScroll: { flex: 1 },
  resultsContent: { paddingHorizontal: Spacing[4], paddingBottom: Spacing[20] },
  resultsMetaRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing[3],
  },
  sortButton: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing[3], paddingVertical: 5,
  },
  sortLabel: { marginLeft: 4 },
  sortMenu: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border,
    marginBottom: Spacing[3], overflow: 'hidden',
  },
  sortMenuItem: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3] },
  sortMenuItemActive: { backgroundColor: Colors.primaryGlow },
  // Result cards
  resultCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing[3], marginBottom: Spacing[2],
  },
  resultIconWrapper: {
    width: 40, height: 40, borderRadius: BorderRadius.md,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: Spacing[3],
  },
  itemIconWrapper: { backgroundColor: `${Colors.accent}18`, borderColor: `${Colors.accent}33` },
  resultInfo: { flex: 1 },
  resultTitleRow: { flexDirection: 'row', alignItems: 'center' },
  resultTitle: { flex: 1 },
  favIcon: { marginLeft: Spacing[2] },
  resultSub: { marginTop: 2 },
  quantityBadge: {
    backgroundColor: `${Colors.accent}18`, borderWidth: 1, borderColor: `${Colors.accent}44`,
    paddingHorizontal: Spacing[2], paddingVertical: 4,
    borderRadius: BorderRadius.sm, marginLeft: Spacing[2],
  },
  quantityText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.accent },
});

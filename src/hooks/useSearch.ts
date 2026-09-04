import { useState, useCallback, useRef } from 'react';
import { ContainerRepository } from '../database/repositories/ContainerRepository';
import { ItemRepository } from '../database/repositories/ItemRepository';
import type { Container } from '../types/Container';
import type { Item } from '../types/Item';

interface SearchResults {
  containers: Container[];
  items: Item[];
}

const DEBOUNCE_MS = 300;

export function useSearch() {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResults>({ containers: [], items: [] });
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults({ containers: [], items: [] });
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const [containers, items] = await Promise.all([
        ContainerRepository.search(q),
        ItemRepository.search(q),
      ]);
      // Containers first, then items — per spec Property 9
      setResults({ containers, items });
    } catch {
      setResults({ containers: [], items: [] });
    } finally {
      setIsSearching(false);
    }
  }, []);

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => search(q), DEBOUNCE_MS);
    },
    [search]
  );

  const clearSearch = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setQueryState('');
    setResults({ containers: [], items: [] });
    setIsSearching(false);
  }, []);

  return { query, setQuery, results, isSearching, clearSearch };
}

import { useCallback, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useUIStore } from '@/stores/uiStore';

export function useGlobalSearch() {
  const {
    globalSearchQuery,
    setGlobalSearchQuery,
    searchResults,
    setSearchResults,
    clearSearchResults,
    isSearchDropdownOpen,
    setSearchDropdownOpen,
  } = useUIStore();

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults({ projects: [], tasks: [], isLoading: false });
      return;
    }

    setSearchResults({ isLoading: true });

    try {
      const [projects, tasks] = await Promise.all([
        api.searchProjectsLocal(query),
        api.searchTasksAcrossProjects(query),
      ]);

      setSearchResults({
        projects: projects.slice(0, 5),
        tasks: tasks.slice(0, 10),
        isLoading: false,
      });
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults({ projects: [], tasks: [], isLoading: false });
    }
  }, [setSearchResults]);

  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.length < 2) {
      setSearchResults({ projects: [], tasks: [], isLoading: false });
      setSearchDropdownOpen(false);
      return;
    }

    setSearchResults({ isLoading: true });
    setSearchDropdownOpen(true);

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  }, [performSearch, setSearchResults, setSearchDropdownOpen]);

  const handleSearchChange = useCallback((query: string) => {
    setGlobalSearchQuery(query);
    debouncedSearch(query);
  }, [setGlobalSearchQuery, debouncedSearch]);

  const handleClearSearch = useCallback(() => {
    clearSearchResults();
    setSearchDropdownOpen(false);
  }, [clearSearchResults, setSearchDropdownOpen]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    query: globalSearchQuery,
    results: searchResults,
    isOpen: isSearchDropdownOpen,
    setIsOpen: setSearchDropdownOpen,
    handleSearchChange,
    handleClearSearch,
  };
}

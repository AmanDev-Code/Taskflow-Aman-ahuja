import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Task, Project } from '@/types';

interface SearchResults {
  projects: Project[];
  tasks: Task[];
  isLoading: boolean;
}

interface UIStore {
  // Search
  globalSearchQuery: string;
  setGlobalSearchQuery: (query: string) => void;
  searchResults: SearchResults;
  setSearchResults: (results: Partial<SearchResults>) => void;
  clearSearchResults: () => void;
  isSearchDropdownOpen: boolean;
  setSearchDropdownOpen: (open: boolean) => void;
  
  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Modals
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  
  // View preferences
  projectViewMode: 'grid' | 'list';
  setProjectViewMode: (mode: 'grid' | 'list') => void;
  
  boardViewMode: 'board' | 'list' | 'calendar';
  setBoardViewMode: (mode: 'board' | 'list' | 'calendar') => void;
}

const initialSearchResults: SearchResults = {
  projects: [],
  tasks: [],
  isLoading: false,
};

export const useUIStore = create<UIStore>()(
  devtools(
    (set) => ({
      globalSearchQuery: '',
      setGlobalSearchQuery: (query) => set({ globalSearchQuery: query }),
      searchResults: initialSearchResults,
      setSearchResults: (results) => set((state) => ({
        searchResults: { ...state.searchResults, ...results },
      })),
      clearSearchResults: () => set({ 
        searchResults: initialSearchResults,
        globalSearchQuery: '',
      }),
      isSearchDropdownOpen: false,
      setSearchDropdownOpen: (open) => set({ isSearchDropdownOpen: open }),
      
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      
      isCommandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
      
      projectViewMode: 'grid',
      setProjectViewMode: (mode) => set({ projectViewMode: mode }),
      
      boardViewMode: 'board',
      setBoardViewMode: (mode) => set({ boardViewMode: mode }),
    }),
    { name: 'ui-store' }
  )
);

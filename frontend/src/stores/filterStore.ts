import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface FilterStore {
  // Task filters
  statusFilter: string[];
  priorityFilter: string[];
  assigneeFilter: string[];
  tagFilter: string[];
  
  setStatusFilter: (statuses: string[]) => void;
  setPriorityFilter: (priorities: string[]) => void;
  setAssigneeFilter: (assignees: string[]) => void;
  setTagFilter: (tags: string[]) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;
  
  // Sort
  sortBy: 'created_at' | 'due_date' | 'priority' | 'title';
  sortOrder: 'asc' | 'desc';
  setSortBy: (field: 'created_at' | 'due_date' | 'priority' | 'title') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
}

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

export const useFilterStore = create<FilterStore>()(
  devtools(
    persist(
      (set, get) => ({
        statusFilter: [],
        priorityFilter: [],
        assigneeFilter: [],
        tagFilter: [],
        
        setStatusFilter: (statuses) => set({ statusFilter: statuses }),
        setPriorityFilter: (priorities) => set({ priorityFilter: priorities }),
        setAssigneeFilter: (assignees) => set({ assigneeFilter: assignees }),
        setTagFilter: (tags) => set({ tagFilter: tags }),
        clearFilters: () => set({ 
          statusFilter: [], 
          priorityFilter: [], 
          assigneeFilter: [],
          tagFilter: [],
        }),
        hasActiveFilters: () => {
          const state = get();
          return (
            (state.statusFilter?.length ?? 0) > 0 ||
            (state.priorityFilter?.length ?? 0) > 0 ||
            (state.assigneeFilter?.length ?? 0) > 0 ||
            (state.tagFilter?.length ?? 0) > 0
          );
        },
        
        sortBy: 'created_at',
        sortOrder: 'desc',
        setSortBy: (field) => set({ sortBy: field }),
        setSortOrder: (order) => set({ sortOrder: order }),
      }),
      {
        name: 'filter-store',
        merge: (persistedState, currentState) => {
          const persisted = (persistedState as Partial<FilterStore>) || {};
          return {
            ...currentState,
            ...persisted,
            statusFilter: asStringArray(persisted.statusFilter),
            priorityFilter: asStringArray(persisted.priorityFilter),
            assigneeFilter: asStringArray(persisted.assigneeFilter),
            tagFilter: asStringArray(persisted.tagFilter),
          };
        },
      }
    ),
    { name: 'filter-store' }
  )
);

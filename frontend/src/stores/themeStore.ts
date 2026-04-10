import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface ThemeStore {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

const applyTheme = (isDark: boolean) => {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeStore>()(
  devtools(
    persist(
      (set) => ({
        isDarkMode: true,

        toggleTheme: () => {
          set((state) => {
            const newMode = !state.isDarkMode;
            applyTheme(newMode);
            return { isDarkMode: newMode };
          });
        },

        setTheme: (isDark: boolean) => {
          applyTheme(isDark);
          set({ isDarkMode: isDark });
        },
      }),
      {
        name: 'theme-storage',
        onRehydrateStorage: () => (state) => {
          const isDark = state?.isDarkMode ?? true;
          applyTheme(isDark);
        },
      }
    ),
    { name: 'theme-store' }
  )
);

applyTheme(true);

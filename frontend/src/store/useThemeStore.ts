import { create } from 'zustand';

type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('vite-ui-theme') as Theme) || 'system',
  setTheme: (theme) => {
    localStorage.setItem('vite-ui-theme', theme);
    set({ theme });
  },
}));

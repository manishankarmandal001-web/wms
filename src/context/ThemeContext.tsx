import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {}
});

export const THEME_STORAGE_KEY = 'wms_screen_theme_v1';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default is light by user requirement: "by Defould light rakhon"
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') return saved;
      return 'light'; // DEFAULT LIGHT
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.remove('bg-slate-100', 'text-slate-800');
        document.body.classList.add('bg-slate-950', 'text-slate-100');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('bg-slate-950', 'text-slate-100');
        document.body.classList.add('bg-slate-100', 'text-slate-800');
      }
    } catch (e) {
      console.warn('Theme storage update error', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

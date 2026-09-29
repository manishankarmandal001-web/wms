import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'navbar' | 'admin' | 'floating' | 'compact';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'navbar', className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  if (variant === 'admin') {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title={isLight ? 'Switch to Dark Mode (Screen Dim)' : 'Switch to Light Mode (Default Screen Bright)'}
        aria-label="Toggle screen theme"
        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
          isLight
            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shadow-2xs'
            : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-750 shadow-2xs'
        } ${className}`}
      >
        {isLight ? (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-600 animate-in spin-in-180 duration-300" />
            <span className="hidden sm:inline">Light Mode</span>
            <span className="sm:hidden">Light</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-indigo-400 animate-in spin-in-180 duration-300" />
            <span className="hidden sm:inline">Dark Mode</span>
            <span className="sm:hidden">Dark</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      aria-label="Toggle screen theme"
      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
        isLight
          ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
          : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white shadow-2xs'
      } ${className}`}
    >
      {isLight ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden md:inline">Dark Mode</span>
        </>
      )}
    </button>
  );
};

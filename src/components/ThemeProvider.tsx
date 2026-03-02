'use client';

import { useEffect } from 'react';
import { useAgentStore } from '@/store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { settings } = useAgentStore();

  useEffect(() => {
    const root = document.documentElement;

    // Add transition class for smooth theme changes
    root.classList.add('theme-transition');

    // Apply theme via data-theme attribute
    root.setAttribute('data-theme', settings.theme);

    // Also set dark class for components that rely on it
    const isDarkTheme = settings.theme === 'dark' || settings.theme === 'midnight' || settings.theme === 'slate';
    if (isDarkTheme) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Remove transition class after animation completes
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);

    return () => clearTimeout(timeout);
  }, [settings.theme]);

  return <>{children}</>;
}

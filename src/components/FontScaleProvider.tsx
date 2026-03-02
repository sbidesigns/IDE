'use client';

import { useEffect } from 'react';
import { useAgentStore } from '@/store';

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useAgentStore();

  useEffect(() => {
    // Apply font scale as CSS custom property
    const root = document.documentElement;
    root.style.setProperty('--font-scale', String(settings.fontScale || 1));
    
    // Also set font-size on root for rem-based scaling
    const baseFontSize = 16 * (settings.fontScale || 1);
    root.style.fontSize = `${baseFontSize}px`;
  }, [settings.fontScale]);

  return <>{children}</>;
}

'use client';

import { Loader2 } from 'lucide-react';

interface SectionLoaderProps {
  message?: string;
  className?: string;
}

export function SectionLoader({ message = 'Loading...', className = '' }: SectionLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 gap-3 ${className}`}>
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">{message}</span>
    </div>
  );
}

'use client';

import { useAgentStore, type AppSettings, type AppTheme } from '@/store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Archive,
  Bell,
  Settings as SettingsIcon,
  Type,
  Sun,
  Moon,
  Check,
  Monitor,
  Palette,
} from 'lucide-react';

// Theme configurations with visual previews
const themes: {
  id: AppTheme;
  name: string;
  description: string;
  preview: {
    bg: string;
    card: string;
    primary: string;
    isDark: boolean;
  };
}[] = [
  {
    id: 'unthemed',
    name: 'Unthemed',
    description: 'Raw system colors',
    preview: {
      bg: 'bg-white',
      card: 'bg-white',
      primary: 'bg-black',
      isDark: false,
    },
  },
  {
    id: 'default',
    name: 'Default',
    description: 'Original balanced colors',
    preview: {
      bg: 'bg-slate-50',
      card: 'bg-white',
      primary: 'bg-indigo-500',
      isDark: false,
    },
  },
  {
    id: 'light',
    name: 'Light',
    description: 'Clean, bright white',
    preview: {
      bg: 'bg-white',
      card: 'bg-gray-50',
      primary: 'bg-blue-400',
      isDark: false,
    },
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Classic dark mode',
    preview: {
      bg: 'bg-zinc-900',
      card: 'bg-zinc-800',
      primary: 'bg-blue-400',
      isDark: true,
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Dark grey professional',
    preview: {
      bg: 'bg-slate-800',
      card: 'bg-slate-700',
      primary: 'bg-slate-300',
      isDark: true,
    },
  },
  {
    id: 'sand',
    name: 'Sand',
    description: 'Warm beige tones',
    preview: {
      bg: 'bg-amber-50',
      card: 'bg-orange-50',
      primary: 'bg-amber-500',
      isDark: false,
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep blue-black',
    preview: {
      bg: 'bg-blue-950',
      card: 'bg-slate-900',
      primary: 'bg-blue-400',
      isDark: true,
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Soft blue tones',
    preview: {
      bg: 'bg-sky-50',
      card: 'bg-cyan-50',
      primary: 'bg-cyan-400',
      isDark: false,
    },
  },
];

export function SettingsPanel() {
  const { settingsOpen, setSettingsOpen, settings, updateSettings } = useAgentStore();

  const handleToggle = (key: keyof AppSettings, value: boolean | number) => {
    updateSettings({ [key]: value });
  };

  const fontScaleLabels = [
    { value: 0.75, label: 'XS' },
    { value: 0.875, label: 'S' },
    { value: 1, label: 'M' },
    { value: 1.125, label: 'L' },
    { value: 1.25, label: 'XL' },
    { value: 1.5, label: 'XXL' },
  ];

  // Convert font scale to slider value (0-5 index)
  const getSliderIndex = (scale: number) => {
    const index = fontScaleLabels.findIndex(f => f.value === scale);
    return index >= 0 ? index : 2; // Default to M (index 2)
  };

  // Get current theme info
  const currentTheme = themes.find(t => t.id === settings.theme) || themes[0];

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Theme Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                {currentTheme.preview.isDark ? (
                  <Moon className="h-4 w-4 text-primary" />
                ) : (
                  <Sun className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1">
                <Label className="font-medium">Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Choose your preferred visual theme
                </p>
              </div>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-2 gap-2 px-1">
              {themes.map((theme) => {
                const isSelected = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => updateSettings({ theme: theme.id })}
                    className={`
                      relative flex items-start gap-2 p-2.5 rounded-lg border-2 transition-all text-left
                      ${isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    {/* Theme Preview */}
                    <div className={`w-10 h-10 rounded-md ${theme.preview.bg} border border-border/50 flex-shrink-0 overflow-hidden`}>
                      <div className={`h-5 ${theme.preview.card} flex items-center justify-center`}>
                        <div className={`w-3 h-1.5 rounded-sm ${theme.preview.primary}`} />
                      </div>
                      <div className="h-5 flex items-center justify-center px-1">
                        <div className={`w-full h-0.5 rounded ${theme.preview.isDark ? 'bg-white/20' : 'bg-black/10'}`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{theme.name}</span>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">{theme.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Scale Slider */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Type className="h-4 w-4 text-blue-500" />
              </div>
              <div className="flex-1">
                <Label className="font-medium">Text Size</Label>
                <p className="text-xs text-muted-foreground">
                  Adjust the text size throughout the app
                </p>
              </div>
              <span className="text-sm font-mono font-medium text-primary">
                {fontScaleLabels.find(f => f.value === settings.fontScale)?.label || 'M'}
              </span>
            </div>

            <div className="px-2">
              <Slider
                value={[getSliderIndex(settings.fontScale)]}
                onValueChange={([value]) => {
                  const newScale = fontScaleLabels[value]?.value || 1;
                  updateSettings({ fontScale: newScale });
                }}
                max={fontScaleLabels.length - 1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
                {fontScaleLabels.map((f) => (
                  <span key={f.value} className="w-4 text-center">{f.label}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ZIP Backup Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Archive className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label htmlFor="zip-backup" className="font-medium">
                  Create ZIP Backup
                </Label>
                <p className="text-xs text-muted-foreground">
                  Save a ZIP archive on every checkpoint
                </p>
              </div>
            </div>
            <Switch
              id="zip-backup"
              checked={settings.autoCreateZipBackup}
              onCheckedChange={(checked) => handleToggle('autoCreateZipBackup', checked)}
            />
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Bell className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <Label htmlFor="notifications" className="font-medium">
                  Show Notifications
                </Label>
                <p className="text-xs text-muted-foreground">
                  Display toast notifications for actions
                </p>
              </div>
            </div>
            <Switch
              id="notifications"
              checked={settings.showNotifications}
              onCheckedChange={(checked) => handleToggle('showNotifications', checked)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setSettingsOpen(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

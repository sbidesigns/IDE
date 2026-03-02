'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { useAgentStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  History,
  Archive,
  RotateCcw,
  Clock,
  FileText,
  HardDrive,
  Loader2,
  RefreshCw,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import type { Version } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function VersionBrowser() {
  const { currentProject, versions, setVersions } = useAgentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [rollbackVersion, setRollbackVersion] = useState<Version | null>(null);

  const loadVersions = useCallback(async () => {
    if (!currentProject) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/versions?project=${currentProject.name}`);
      const data = await response.json();
      if (data.success) {
        setVersions(data.data);
      }
    } catch {
      toast.error('Failed to load versions');
    }
    setIsLoading(false);
  }, [currentProject, setVersions]);

  useEffect(() => {
    startTransition(() => {
      void loadVersions();
    });
  }, [loadVersions]);

  const createVersion = async () => {
    if (!currentProject) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject.name,
          description: `Version created at ${new Date().toLocaleString()}`,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setVersions([data.data, ...versions]);
        toast.success(`Version ${data.data.versionNumber} created`);
      } else {
        toast.error(data.error || 'Failed to create version');
      }
    } catch {
      toast.error('Failed to create version');
    }
    setIsCreating(false);
  };

  const handleRollback = async () => {
    if (!rollbackVersion) return;

    try {
      const response = await fetch('/api/versions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: rollbackVersion.id }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Version restored successfully');
        loadVersions();
        window.location.reload();
      } else {
        toast.error(data.error || 'Failed to restore version');
      }
    } catch {
      toast.error('Failed to restore version');
    }
    setRollbackVersion(null);
  };

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
        No project selected
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold">Version History</h3>
          <p className="text-xs text-muted-foreground">
            Current: {currentProject.currentVersion}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={loadVersions}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={createVersion} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Archive className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>No versions yet</p>
            <p className="text-xs mt-1">Create a checkpoint before making changes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => (
              <div
                key={version.id}
                className={cn(
                  'p-3 bg-card border border-border rounded-lg',
                  version.versionNumber === currentProject.currentVersion &&
                    'border-primary/50 bg-primary/5'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          version.versionNumber === currentProject.currentVersion
                            ? 'default'
                            : 'outline'
                        }
                        className="font-mono"
                      >
                        {version.versionNumber}
                      </Badge>
                      {version.versionNumber === currentProject.currentVersion && (
                        <Badge variant="secondary" className="text-[10px]">
                          Current
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(version.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {version.fileCount} files
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatBytes(version.size)}
                      </span>
                    </div>
                  </div>
                  {version.versionNumber !== currentProject.currentVersion && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRollbackVersion(version)}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
                {version.description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {version.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!rollbackVersion} onOpenChange={() => setRollbackVersion(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Restore Version
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore the project to version {rollbackVersion?.versionNumber}.
              The current state will be backed up before restoration.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback}>
              Restore Version
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

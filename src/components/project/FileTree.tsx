'use client';

import { useState, useCallback, useEffect, startTransition, useRef } from 'react';
import { useAgentStore } from '@/store';
import { cn } from '@/lib/utils';
import type { FileInfo } from '@/types';
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  FileJson,
  File,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const getFileIcon = (file: FileInfo) => {
  if (file.type === 'folder') return null;
  
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
      return <FileCode className="h-4 w-4 text-yellow-500" />;
    case 'json':
      return <FileJson className="h-4 w-4 text-yellow-600" />;
    case 'md':
      return <FileText className="h-4 w-4 text-blue-400" />;
    case 'py':
      return <FileCode className="h-4 w-4 text-green-500" />;
    case 'css':
      return <FileCode className="h-4 w-4 text-blue-500" />;
    case 'html':
      return <FileCode className="h-4 w-4 text-orange-500" />;
    default:
      return <File className="h-4 w-4 text-muted-foreground" />;
  }
};

interface FileTreeItemProps {
  file: FileInfo;
  level: number;
  onSelect: (file: FileInfo) => void;
  onDoubleClick?: (file: FileInfo) => void;
  selectedPath: string | null;
  onRefresh: () => void;
  refreshKey?: number;  // Used to force refresh of children
}

function FileTreeItem({ file, level, onSelect, onDoubleClick, selectedPath, onRefresh, refreshKey }: FileTreeItemProps) {
  const { currentProject } = useAgentStore();
  const [isOpen, setIsOpen] = useState(false);  // Start collapsed
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file');
  const [loadedChildren, setLoadedChildren] = useState<FileInfo[] | null>(null);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [loadedRefreshKey, setLoadedRefreshKey] = useState(refreshKey);

  const isFolder = file.type === 'folder';
  const isSelected = selectedPath === file.path;

  // Derive children from props or loaded state
  // Reset when refresh key changes
  const children = (refreshKey === loadedRefreshKey && loadedChildren)
    ? loadedChildren
    : (file.children || []);

  // Load children function
  const loadChildren = useCallback(async () => {
    if (!currentProject || !isFolder) return;
    
    setIsLoadingChildren(true);
    try {
      const response = await fetch(`/api/files?project=${currentProject.name}&path=${encodeURIComponent(file.path)}`);
      const data = await response.json();
      if (data.success) {
        setLoadedChildren(data.data || []);
        setLoadedRefreshKey(refreshKey);
      }
    } catch (error) {
      console.error('Failed to load children:', error);
    }
    setIsLoadingChildren(false);
  }, [currentProject, file.path, isFolder, refreshKey]);

  // Handle folder toggle - load children on first open
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // Load children when opening if not loaded or refresh key changed
    if (newIsOpen && isFolder && (loadedChildren === null || refreshKey !== loadedRefreshKey)) {
      loadChildren();
    }
  }, [isOpen, isFolder, loadedChildren, loadChildren, refreshKey, loadedRefreshKey]);

  const handleRename = async () => {
    if (!currentProject || newName === file.name) {
      setIsEditing(false);
      return;
    }

    try {
      const response = await fetch('/api/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject.name,
          path: file.path,
          newName,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Renamed successfully');
        onRefresh();
      } else {
        toast.error(data.error || 'Failed to rename');
      }
    } catch {
      toast.error('Failed to rename');
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!currentProject) return;
    if (!confirm(`Delete "${file.name}"?`)) return;

    try {
      const response = await fetch(
        `/api/files?project=${currentProject.name}&path=${encodeURIComponent(file.path)}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Deleted successfully');
        onRefresh();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleCreateNew = async () => {
    if (!currentProject || !newFileName) return;

    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject.name,
          path: `${file.path}/${newFileName}`,
          type: newFileType,
          content: newFileType === 'file' ? '' : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Created successfully');
        setShowNewFileDialog(false);
        setNewFileName('');
        setNewFileType('file'); // Reset to default
        onRefresh();
      } else {
        toast.error(data.error || 'Failed to create');
      }
    } catch {
      toast.error('Failed to create');
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer group',
          'hover:bg-accent/50 transition-colors',
          isSelected && 'bg-accent'
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => !isFolder && onSelect(file)}
        onDoubleClick={() => !isFolder && onDoubleClick?.(file)}
      >
        {isFolder ? (
          <button
            onClick={handleToggle}
            className="p-0.5 hover:bg-accent rounded"
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {isFolder ? (
          isOpen ? (
            <FolderOpen className="h-4 w-4 text-yellow-500" />
          ) : (
            <Folder className="h-4 w-4 text-yellow-500" />
          )
        ) : (
          getFileIcon(file)
        )}

        {isEditing ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="h-6 text-sm px-1 flex-1"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm truncate flex-1">{file.name}</span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-accent rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {isFolder && (
              <>
                <DropdownMenuItem onClick={() => {
                  setNewFileType('file');
                  setShowNewFileDialog(true);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setNewFileType('folder');
                  setShowNewFileDialog(true);
                }}>
                  <Folder className="h-4 w-4 mr-2" />
                  New Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isFolder && isOpen && (
        <div>
          {isLoadingChildren || loadedChildren === null ? (
            // Show loading state while loading OR if we haven't loaded this folder yet
            <div className="py-1 px-2 text-xs text-muted-foreground flex items-center gap-1" style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}>
              <span className="animate-spin">◌</span>
              Loading...
            </div>
          ) : children.length > 0 ? (
            children.map((child) => (
              <FileTreeItem
                key={child.path}
                file={child}
                level={level + 1}
                onSelect={onSelect}
                onDoubleClick={onDoubleClick}
                selectedPath={selectedPath}
                onRefresh={onRefresh}
                refreshKey={refreshKey}
              />
            ))
          ) : (
            <div className="py-1 px-2 text-xs text-muted-foreground" style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}>
              Empty folder
            </div>
          )}
        </div>
      )}

      <Dialog open={showNewFileDialog} onOpenChange={(open) => {
        setShowNewFileDialog(open);
        if (!open) {
          setNewFileName('');
          setNewFileType('file'); // Reset to default when dialog closes
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New {newFileType === 'file' ? 'File' : 'Folder'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={newFileType === 'file' ? 'filename.ts' : 'folder-name'}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewFileDialog(false);
              setNewFileName('');
              setNewFileType('file');
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateNew}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FileTree() {
  const { currentProject, setActiveFile, setFileContent, activeFile, fileRefreshKey, refreshFiles, focusEditor } = useAgentStore();
  const [projectFiles, setProjectFiles] = useState<FileInfo[]>([]);
  
  // Root-level new file/folder state
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file');
  const [isCreating, setIsCreating] = useState(false);

  const loadFiles = useCallback(async () => {
    if (!currentProject) return;
    
    try {
      const response = await fetch(`/api/files?project=${currentProject.name}&path=`);
      const data = await response.json();
      if (data.success) {
        setProjectFiles(data.data || []);
      }
    } catch {
      setProjectFiles(currentProject.files || []);
    }
  }, [currentProject]);

  useEffect(() => {
    if (currentProject) {
      startTransition(() => {
        void loadFiles();
      });
    }
  }, [currentProject?.name, loadFiles, fileRefreshKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentProject) {
        loadFiles();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentProject, loadFiles]);

  const handleSelectFile = useCallback(async (file: FileInfo) => {
    if (!currentProject || file.type === 'folder') return;

    try {
      const response = await fetch(
        `/api/files?project=${currentProject.name}&path=${encodeURIComponent(file.path)}`
      );
      const data = await response.json();

      if (data.success && data.data.content !== undefined) {
        setActiveFile(data.data);
        setFileContent(data.data.content);
      }
    } catch {
      toast.error('Failed to load file');
    }
  }, [currentProject, setActiveFile, setFileContent]);

  // Double-click to open file and focus editor
  const handleDoubleClickFile = useCallback(async (file: FileInfo) => {
    if (!currentProject || file.type === 'folder') return;

    try {
      const response = await fetch(
        `/api/files?project=${currentProject.name}&path=${encodeURIComponent(file.path)}`
      );
      const data = await response.json();

      if (data.success && data.data.content !== undefined) {
        setActiveFile(data.data);
        setFileContent(data.data.content);
        focusEditor(); // Focus editor panel
      }
    } catch {
      toast.error('Failed to load file');
    }
  }, [currentProject, setActiveFile, setFileContent, focusEditor]);

  // Create root-level file/folder
  const handleCreateNew = async () => {
    if (!currentProject || !newFileName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject.name,
          path: newFileName.trim(),
          type: newFileType,
          content: newFileType === 'file' ? '' : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Created successfully');
        setShowNewFileDialog(false);
        setNewFileName('');
        setNewFileType('file');
        refreshFiles();
      } else {
        toast.error(data.error || 'Failed to create');
      }
    } catch {
      toast.error('Failed to create');
    }
    setIsCreating(false);
  };

  // Use store's refreshFiles for onRefresh callback
  const refresh = () => refreshFiles();

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
        No project selected
      </div>
    );
  }

  const files = projectFiles.length > 0 ? projectFiles : (currentProject.files || []);

  return (
    <>
      {/* Root-level New File/Folder buttons */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border/50">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs"
          onClick={() => {
            setNewFileType('file');
            setShowNewFileDialog(true);
          }}
        >
          <Plus className="h-3 w-3 mr-1" />
          New File
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-xs"
          onClick={() => {
            setNewFileType('folder');
            setShowNewFileDialog(true);
          }}
        >
          <Folder className="h-3 w-3 mr-1" />
          New Folder
        </Button>
      </div>

      <div key={fileRefreshKey} className="h-full overflow-y-auto py-2">
        {files.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm p-4">
            No files yet
          </div>
        ) : (
          files.map((file) => (
            <FileTreeItem
              key={file.path}
              file={file}
              level={0}
              onSelect={handleSelectFile}
              onDoubleClick={handleDoubleClickFile}
              selectedPath={activeFile?.path || null}
              onRefresh={refresh}
              refreshKey={fileRefreshKey}
            />
          ))
        )}
      </div>

      {/* Root-level new file/folder dialog */}
      <Dialog open={showNewFileDialog} onOpenChange={(open) => {
        setShowNewFileDialog(open);
        if (!open) {
          setNewFileName('');
          setNewFileType('file');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New {newFileType === 'file' ? 'File' : 'Folder'}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder={newFileType === 'file' ? 'filename.ts' : 'folder-name'}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewFileDialog(false);
              setNewFileName('');
              setNewFileType('file');
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateNew} disabled={!newFileName.trim() || isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

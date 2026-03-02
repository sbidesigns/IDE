'use client';

import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { useAgentStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SectionLoader } from '@/components/ui/section-loader';
import {
  FolderTree,
  Brain,
  History,
  Search,
  Users,
  Plus,
  Trash2,
  Folder,
  Loader2,
  ChevronLeft,
  Download,
  MoreHorizontal,
  Check,
  RefreshCw,
} from 'lucide-react';
import type { Project } from '@/types';
import { FileTree } from './project/FileTree';
import { MemoryPanel } from './memory/MemoryPanel';
import { VersionBrowser } from './project/VersionBrowser';
import { SearchPanel } from './search/SearchPanel';
import { MeetingsPanel } from './meetings/MeetingsPanel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
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
import { Label } from '@/components/ui/label';

export function Sidebar() {
  const {
    _hasHydrated,
    sidebarOpen,
    setSidebarOpen,
    activeTab,
    setActiveTab,
    currentProject,
    setCurrentProject,
    projects,
    setProjects,
    refreshFiles,
    fileRefreshKey,
  } = useAgentStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importName, setImportName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialLoadDone = useRef(false);

  // Check if mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch {
      toast.error('Failed to load projects');
    }
    setIsLoading(false);
  }, [setProjects]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      startTransition(() => {
        void loadProjects();
      });
    }
  }, []);

  const createProject = async () => {
    if (!newProjectName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setProjects([data.data, ...projects]);
        setCurrentProject(data.data);
        setShowNewProject(false);
        setNewProjectName('');
        toast.success(`Project "${data.data.name}" created`);
      } else {
        toast.error(data.error || 'Failed to create project');
      }
    } catch {
      toast.error('Failed to create project');
    }
    setIsCreating(false);
  };

  const deleteProject = async (projectName: string) => {
    if (!confirm(`Delete project "${projectName}"? This will archive it.`)) return;

    try {
      const response = await fetch(`/api/projects?name=${projectName}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setProjects(projects.filter((p) => p.name !== projectName));
        if (currentProject?.name === projectName) {
          setCurrentProject(null);
        }
        toast.success('Project archived');
      } else {
        toast.error(data.error || 'Failed to delete project');
      }
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const downloadProject = async () => {
    if (!currentProject) return;
    
    try {
      const versionResponse = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentProject.name }),
      });
      
      const versionData = await versionResponse.json();
      if (versionData.success) {
        toast.success(`Created version ${versionData.data.versionNumber}`);
        loadProjects();
      }
    } catch {
      toast.error('Failed to download project');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      if (importName) {
        formData.append('name', importName);
      }

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        loadProjects();
        setCurrentProject(data.data.project);
        setShowImport(false);
        setImportFile(null);
        setImportName('');
        toast.success(data.data.message);
      } else {
        toast.error(data.error || 'Import failed');
      }
    } catch {
      toast.error('Failed to import project');
    }
    setIsImporting(false);
  };

  if (!sidebarOpen) {
    return (
      <div className="w-12 border-r border-border flex flex-col items-center py-4 gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setSidebarOpen(true)}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4 rotate-180" />
        </Button>
        <Button
          size="icon"
          variant={activeTab === 'files' ? 'default' : 'ghost'}
          onClick={() => {
            setActiveTab('files');
            setSidebarOpen(true);
          }}
          className="h-8 w-8"
        >
          <FolderTree className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={activeTab === 'memory' ? 'default' : 'ghost'}
          onClick={() => {
            setActiveTab('memory');
            setSidebarOpen(true);
          }}
          className="h-8 w-8"
        >
          <Brain className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={activeTab === 'versions' ? 'default' : 'ghost'}
          onClick={() => {
            setActiveTab('versions');
            setSidebarOpen(true);
          }}
          className="h-8 w-8"
        >
          <History className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={activeTab === 'search' ? 'default' : 'ghost'}
          onClick={() => {
            setActiveTab('search');
            setSidebarOpen(true);
          }}
          className="h-8 w-8"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant={activeTab === 'meetings' ? 'default' : 'ghost'}
          onClick={() => {
            setActiveTab('meetings');
            setSidebarOpen(true);
          }}
          className="h-8 w-8"
        >
          <Users className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-sidebar">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold tracking-tight">Projects</h2>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowNewProject(true)}
                className="h-7 w-7"
                title="New Project"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowImport(true)}
                className="h-7 w-7"
                title="Import Project"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSidebarOpen(false)}
                className="h-7 w-7"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-24">
            {!_hasHydrated ? (
              <SectionLoader message="Loading projects..." />
            ) : isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                No projects yet
              </div>
            ) : (
              <div className="space-y-1">
                {projects.map((project) => (
                  <div
                    key={project.name}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-md cursor-pointer group',
                      currentProject?.name === project.name
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-accent'
                    )}
                    onClick={() => setCurrentProject(project)}
                  >
                    <Folder className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm truncate flex-1">{project.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {project.currentVersion}
                    </Badge>
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
                        <DropdownMenuItem onClick={downloadProject}>
                          <Download className="h-4 w-4 mr-2" />
                          Create Checkpoint
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteProject(project.name)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-5 mx-3 mt-2">
            <TabsTrigger value="files" className="text-xs">
              <FolderTree className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger value="memory" className="text-xs">
              <Brain className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger value="versions" className="text-xs">
              <History className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger value="search" className="text-xs">
              <Search className="h-3.5 w-3.5" />
            </TabsTrigger>
            <TabsTrigger value="meetings" className="text-xs">
              <Users className="h-3.5 w-3.5" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="files" className="flex-1 m-0 flex flex-col">
            <div className="flex items-center justify-between px-2 py-1 border-b border-border/50">
              <span className="text-xs text-muted-foreground">
                {currentProject ? currentProject.name : 'No project'}
              </span>
              <Button
                size="icon"
                variant="ghost"
                onClick={refreshFiles}
                className="h-6 w-6"
                title="Refresh files"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <FileTree />
            </div>
          </TabsContent>
          <TabsContent value="memory" className="flex-1 m-0">
            <MemoryPanel />
          </TabsContent>
          <TabsContent value="versions" className="flex-1 m-0">
            <VersionBrowser />
          </TabsContent>
          <TabsContent value="search" className="flex-1 m-0">
            <SearchPanel />
          </TabsContent>
          <TabsContent value="meetings" className="flex-1 m-0">
            <MeetingsPanel />
          </TabsContent>
        </Tabs>

        {currentProject && (
          <div className="p-3 border-t border-border bg-muted/30">
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Version</span>
                <span className="font-mono">{currentProject.currentVersion}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span>Files</span>
                <span>{countFiles(currentProject.files)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="my-project-name"
              onKeyDown={(e) => e.key === 'Enter' && createProject()}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Use lowercase letters, numbers, and hyphens only
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProject(false)}>
              Cancel
            </Button>
            <Button
              onClick={createProject}
              disabled={!newProjectName.trim() || isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Project</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">ZIP File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportFile(file);
                    if (!importName) {
                      const nameFromFile = file.name.replace('.zip', '').replace(/_v\d+\.\d+.*$/, '');
                      setImportName(nameFromFile);
                    }
                  }
                }}
                className="w-full mt-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Project Name (optional)</Label>
              <Input
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="Auto-generated from file name"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowImport(false);
              setImportFile(null);
              setImportName('');
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || isImporting}
            >
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function countFiles(files: Project['files']): number {
  let count = 0;
  for (const file of files) {
    if (file.type === 'file') {
      count++;
    } else if (file.children) {
      count += countFiles(file.children);
    }
  }
  return count;
}

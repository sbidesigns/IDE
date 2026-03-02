'use client';

import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { useAgentStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Anchor,
  Brain,
  Clock,
  Target,
  AlertTriangle,
  Lightbulb,
  Plus,
  Trash2,
  RefreshCw,
  Save,
} from 'lucide-react';
import type { MemoryAnchor, ProjectMemory } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const anchorTypeConfig = {
  decision: { icon: Target, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  context: { icon: Brain, color: 'text-green-500', bg: 'bg-green-500/10' },
  constraint: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  goal: { icon: Lightbulb, color: 'text-purple-500', bg: 'bg-purple-500/10' },
};

const importanceConfig = {
  high: { color: 'border-red-500/50 bg-red-500/5' },
  medium: { color: 'border-yellow-500/50 bg-yellow-500/5' },
  low: { color: 'border-gray-500/50 bg-gray-500/5' },
};

export function MemoryPanel() {
  const { currentProject, projectMemory, setProjectMemory } = useAgentStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showAddAnchor, setShowAddAnchor] = useState(false);
  const [newAnchor, setNewAnchor] = useState({
    content: '',
    type: 'context' as MemoryAnchor['type'],
    importance: 'medium' as MemoryAnchor['importance'],
  });
  const [editContext, setEditContext] = useState('');
  const initialLoadDone = useRef(false);

  const loadMemory = useCallback(async () => {
    if (!currentProject) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/memory?project=${currentProject.name}`);
      const data = await response.json();
      if (data.success) {
        setProjectMemory(data.data);
        setEditContext(data.data.context || '');
      }
    } catch {
      toast.error('Failed to load memory');
    }
    setIsLoading(false);
  }, [currentProject, setProjectMemory]);

  useEffect(() => {
    if (currentProject && !initialLoadDone.current) {
      initialLoadDone.current = true;
      startTransition(() => {
        void loadMemory();
      });
    }
    if (!currentProject) {
      initialLoadDone.current = false;
    }
  }, [currentProject?.name, loadMemory]);

  useEffect(() => {
    initialLoadDone.current = false;
  }, [currentProject?.name]);

  const saveMemory = async (memory: ProjectMemory) => {
    if (!currentProject) return;

    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentProject.name, memory }),
      });
      const data = await response.json();
      if (data.success) {
        setProjectMemory(data.data);
        toast.success('Memory saved');
      }
    } catch {
      toast.error('Failed to save memory');
    }
  };

  const addAnchor = async () => {
    if (!currentProject || !newAnchor.content.trim()) return;

    try {
      const response = await fetch('/api/memory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject.name,
          anchor: newAnchor,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setProjectMemory((prev) =>
          prev ? { ...prev, anchors: [...prev.anchors, data.data] } : null
        );
        setShowAddAnchor(false);
        setNewAnchor({ content: '', type: 'context', importance: 'medium' });
        toast.success('Anchor added');
      }
    } catch {
      toast.error('Failed to add anchor');
    }
  };

  const deleteAnchor = async (anchorId: string) => {
    if (!currentProject) return;

    try {
      const response = await fetch(
        `/api/memory?project=${currentProject.name}&anchorId=${anchorId}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (data.success) {
        setProjectMemory(data.data);
        toast.success('Anchor deleted');
      }
    } catch {
      toast.error('Failed to delete anchor');
    }
  };

  const updateContext = () => {
    if (!projectMemory) return;
    saveMemory({ ...projectMemory, context: editContext });
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
        <h3 className="text-sm font-semibold">Project Memory</h3>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={loadMemory} disabled={isLoading}>
            <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
          </Button>
          <Button size="sm" onClick={() => setShowAddAnchor(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Anchor
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Project Context</h4>
          <Textarea
            value={editContext}
            onChange={(e) => setEditContext(e.target.value)}
            placeholder="Describe the project context..."
            className="min-h-[80px] text-sm"
          />
          <Button size="sm" variant="outline" onClick={updateContext} className="mt-2">
            <Save className="h-3 w-3 mr-1" />
            Save Context
          </Button>
        </div>

        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Memory Anchors ({projectMemory?.anchors.length || 0})
          </h4>
          
          {projectMemory?.anchors.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No memory anchors yet
            </div>
          ) : (
            <div className="space-y-2">
              {projectMemory?.anchors.map((anchor) => {
                const typeConfig = anchorTypeConfig[anchor.type];
                const impConfig = importanceConfig[anchor.importance];
                const Icon = typeConfig.icon;

                return (
                  <div
                    key={anchor.id}
                    className={cn(
                      'p-3 rounded-lg border',
                      impConfig.color,
                      'border'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          'p-1.5 rounded',
                          typeConfig.bg
                        )}
                      >
                        <Icon className={cn('h-3.5 w-3.5', typeConfig.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px]">
                            {anchor.type}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-0.5" />
                            {new Date(anchor.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{anchor.content}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAnchor(anchor.id)}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {projectMemory?.keyDecisions && projectMemory.keyDecisions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Key Decisions
            </h4>
            <div className="space-y-1">
              {projectMemory.keyDecisions.map((decision, idx) => (
                <div
                  key={idx}
                  className="text-sm p-2 bg-muted/50 rounded flex items-start gap-2"
                >
                  <Target className="h-3 w-3 mt-1 text-blue-500 flex-shrink-0" />
                  <span>{decision}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddAnchor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-4 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Memory Anchor</h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Content</label>
                <Textarea
                  value={newAnchor.content}
                  onChange={(e) =>
                    setNewAnchor((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="What should the AI remember?"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Type</label>
                  <Select
                    value={newAnchor.type}
                    onValueChange={(v) =>
                      setNewAnchor((prev) => ({ ...prev, type: v as MemoryAnchor['type'] }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="decision">Decision</SelectItem>
                      <SelectItem value="context">Context</SelectItem>
                      <SelectItem value="constraint">Constraint</SelectItem>
                      <SelectItem value="goal">Goal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Importance</label>
                  <Select
                    value={newAnchor.importance}
                    onValueChange={(v) =>
                      setNewAnchor((prev) => ({
                        ...prev,
                        importance: v as MemoryAnchor['importance'],
                      }))
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowAddAnchor(false)}>
                Cancel
              </Button>
              <Button onClick={addAnchor} disabled={!newAnchor.content.trim()}>
                <Anchor className="h-3 w-3 mr-1" />
                Add Anchor
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

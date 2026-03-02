'use client';

import { useEffect, useState } from 'react';
import { useAgentStore } from '@/store';
import { Sidebar } from '@/components/Sidebar';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { CodeEditor } from '@/components/project/CodeEditor';
import { SettingsPanel } from '@/components/SettingsPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot,
  PanelRightClose,
  Menu,
  X,
  Settings,
  Archive,
  MessageSquare,
  Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentPage() {
  const {
    currentProject,
    sidebarOpen,
    setSidebarOpen,
    settings,
    setSettingsOpen,
    activeFile,
    editorPanelOpen,
    editorFocused,
    setEditorPanelOpen,
    setEditorFocused,
  } = useAgentStore();

  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setEditorFocused(false);
        setEditorPanelOpen(false);
        setSidebarOpen(false); // Always close sidebar on mobile
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setSidebarOpen, setEditorPanelOpen, setEditorFocused]);

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-2 md:px-4 flex-shrink-0 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile menu toggle */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-base md:text-lg font-semibold tracking-tight hidden sm:block">
            AI Agent Platform
          </h1>
          <Badge variant="outline" className="text-[10px] hidden md:flex font-mono">
            Beta
          </Badge>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {currentProject && (
            <Badge variant="secondary" className="text-xs hidden sm:flex font-medium">
              {currentProject.name}
            </Badge>
          )}

          {/* ZIP Backup indicator */}
          {settings.autoCreateZipBackup && (
            <div className="hidden md:flex items-center gap-1 text-xs text-green-500">
              <Archive className="h-3 w-3" />
              <span>ZIP</span>
            </div>
          )}

          {/* View Mode Toggle */}
          <div className="hidden md:flex items-center border border-border rounded-md p-0.5">
            <Button
              size="sm"
              variant={!editorFocused ? 'secondary' : 'ghost'}
              onClick={() => setEditorFocused(false)}
              className="h-6 px-2 text-xs"
              title="Chat view"
            >
              <MessageSquare className="h-3 w-3 mr-1" />
              Chat
            </Button>
            <Button
              size="sm"
              variant={editorFocused ? 'secondary' : 'ghost'}
              onClick={() => setEditorFocused(true)}
              className="h-6 px-2 text-xs"
              title="Editor focus"
            >
              <Code2 className="h-3 w-3 mr-1" />
              Editor
            </Button>
          </div>

          {/* Settings Button */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setSettingsOpen(true)}
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Right panel toggle (desktop) */}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 hidden md:flex"
            onClick={() => setEditorPanelOpen(!editorPanelOpen)}
            title={editorPanelOpen ? 'Hide editor panel' : 'Show editor panel'}
          >
            <PanelRightClose className={cn('h-4 w-4 transition-transform', editorPanelOpen && 'rotate-180')} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="absolute inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar */}
        <div
          className={cn(
            'h-full bg-sidebar flex-shrink-0 transition-all duration-300',
            isMobile ? 'absolute left-0 top-0 z-50 w-80' : 'relative border-r border-border',
            sidebarOpen
              ? 'translate-x-0'
              : isMobile
              ? '-translate-x-full'
              : 'w-12'
          )}
          style={!isMobile ? { width: sidebarOpen ? '18rem' : '3rem' } : {}}
        >
          <Sidebar />
        </div>

        {/* Chat Area */}
        <div
          className={cn(
            'min-w-0 overflow-hidden transition-all duration-300',
            editorFocused ? 'w-0' : 'flex-1',
            isMobile && 'w-full'
          )}
        >
          <ChatWindow />
        </div>

        {/* Right Panel (Editor) */}
        <div
          className={cn(
            'h-full border-l border-border overflow-hidden',
            isMobile
              ? 'absolute right-0 top-0 w-full z-30 transition-transform duration-300'
              : 'hidden md:block',
            editorPanelOpen
              ? isMobile
                ? 'translate-x-0'
                : editorFocused
                ? 'flex-1'
                : 'w-[28rem] flex-shrink-0'
              : isMobile
              ? 'translate-x-full'
              : 'w-0'
          )}
        >
          {editorPanelOpen && <CodeEditor />}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      {isMobile && (
        <div className="h-14 border-t border-border flex items-center justify-around px-2 bg-card flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center h-auto py-1.5 gap-0.5"
            onClick={() => {
              setSidebarOpen(true);
              setEditorPanelOpen(false);
            }}
          >
            <Menu className="h-4 w-4" />
            <span className="text-[10px]">Files</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'flex flex-col items-center h-auto py-1.5 gap-0.5',
              !editorPanelOpen && 'text-primary'
            )}
            onClick={() => {
              setEditorPanelOpen(false);
              setSidebarOpen(false);
            }}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-[10px]">Chat</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'flex flex-col items-center h-auto py-1.5 gap-0.5',
              editorPanelOpen && 'text-primary'
            )}
            onClick={() => {
              setEditorPanelOpen(true);
              setSidebarOpen(false);
            }}
            disabled={!activeFile}
          >
            <Code2 className="h-4 w-4" />
            <span className="text-[10px]">Editor</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center h-auto py-1.5 gap-0.5"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-4 w-4" />
            <span className="text-[10px]">Settings</span>
          </Button>
        </div>
      )}

      {/* Settings Panel */}
      <SettingsPanel />
    </div>
  );
}

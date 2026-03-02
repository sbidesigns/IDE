'use client';

import { useState, useCallback, useEffect, useMemo, useRef, startTransition } from 'react';
import { useAgentStore } from '@/store';
import { useIsMobile } from '@/hooks/use-mobile';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Save,
  X,
  RotateCcw,
  FileText,
  Maximize2,
  Minimize2,
  Edit3,
  Search,
  Replace,
  ChevronUp,
  ChevronDown,
  XCircle,
  FileCode,
  FileType,
  WrapText,
  Copy,
  Check,
  Download,
  Settings2,
  Eye,
  Code,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const getLanguage = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    css: 'css',
    html: 'html',
    json: 'json',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    java: 'java',
    go: 'go',
    rs: 'rust',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    scss: 'scss',
    less: 'less',
    vue: 'vue',
    svelte: 'svelte',
    php: 'php',
    rb: 'ruby',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    r: 'r',
    lua: 'lua',
    perl: 'perl',
    dockerfile: 'docker',
    makefile: 'makefile',
  };
  return langMap[ext || ''] || 'text';
};

// Check if file can be previewed visually
const canPreviewFile = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const previewableExtensions = ['html', 'htm', 'svg', 'xhtml'];
  return previewableExtensions.includes(ext || '');
};

const getFileIcon = (filename: string): React.ReactNode => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, React.ReactNode> = {
    js: <FileCode className="h-4 w-4 text-yellow-500" />,
    jsx: <FileCode className="h-4 w-4 text-yellow-500" />,
    ts: <FileCode className="h-4 w-4 text-blue-500" />,
    tsx: <FileCode className="h-4 w-4 text-blue-500" />,
    py: <FileCode className="h-4 w-4 text-green-500" />,
    css: <FileCode className="h-4 w-4 text-purple-500" />,
    html: <FileCode className="h-4 w-4 text-orange-500" />,
    json: <FileType className="h-4 w-4 text-yellow-600" />,
    md: <FileType className="h-4 w-4 text-gray-500" />,
  };
  return iconMap[ext || ''] || <FileText className="h-4 w-4 text-muted-foreground" />;
};

// Proper line numbers with synchronized scrolling
function EditorWithLineNumbers({
  value,
  onChange,
  className,
  textareaRef,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const lines = value.split('\n');
  const lineCount = lines.length;
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Consistent line height in pixels (0.875rem * 1.6 = 14px * 1.6 = 22.4px)
  const lineHeight = 22.4;

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  return (
    <div className={cn('flex h-full overflow-hidden', className)}>
      {/* Line numbers - scrolls in sync */}
      <div 
        ref={lineNumbersRef}
        className="flex-shrink-0 bg-muted/50 border-r border-border select-none overflow-hidden"
        style={{ overflowY: 'hidden' }}
      >
        <div 
          className="text-right text-muted-foreground"
          style={{ 
            fontFamily: 'var(--font-mono), ui-monospace, monospace', 
            fontSize: '0.875rem', 
            lineHeight: `${lineHeight}px`,
            minWidth: '3.5em',
            padding: '16px 12px 16px 12px',
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} style={{ height: `${lineHeight}px` }}>
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      
      {/* Textarea - source of scroll truth */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        className="flex-1 h-full w-full resize-none border-0 rounded-none focus-visible:ring-0 bg-transparent placeholder:text-muted-foreground/50"
        style={{ 
          fontFamily: 'var(--font-mono), ui-monospace, monospace', 
          fontSize: '0.875rem', 
          lineHeight: `${lineHeight}px`,
          padding: '16px',
          overflowY: 'auto'
        }}
        placeholder="Enter file content..."
        spellCheck={false}
        autoFocus
      />
    </div>
  );
}

export function CodeEditor() {
  const {
    currentProject,
    activeFile,
    fileContent,
    setFileContent,
    setActiveFile,
    setProjectState,
    settings,
    setEditorPanelOpen,
  } = useAgentStore();

  const isMobile = useIsMobile();

  // On mobile, auto-close panel when no file is selected
  // This prevents "no file selected" overlay when closing editor
  useEffect(() => {
    if (isMobile && !activeFile) {
      setEditorPanelOpen(false);
    }
  }, [isMobile, activeFile, setEditorPanelOpen]);

  // Derive content from props
  const displayContent = useMemo(() => fileContent || '', [fileContent]);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Find/Replace state
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);

  // Editor options
  const [wordWrap, setWordWrap] = useState(true);

  // Copy state
  const [copied, setCopied] = useState(false);

  // Preview mode for HTML/visual files
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const canPreview = activeFile ? canPreviewFile(activeFile.name) : false;

  // Reset edit state when file changes
  useEffect(() => {
    startTransition(() => {
      setEditContent(displayContent);
      setIsEditing(false);
      setShowFindReplace(false);
      setIsPreviewMode(false);  // Reset preview mode on file change
    });
  }, [displayContent]);

  const hasChanges = isEditing && editContent !== displayContent;

  // Find matches in content
  useEffect(() => {
    if (!findText) {
      setMatchCount(0);
      setCurrentMatch(0);
      return;
    }
    
    const searchContent = matchCase ? editContent : editContent.toLowerCase();
    const searchTerm = matchCase ? findText : findText.toLowerCase();
    const matches = searchContent.split(searchTerm).length - 1;
    setMatchCount(matches);
    setCurrentMatch(matches > 0 ? 1 : 0);
  }, [findText, editContent, matchCase]);

  const handleSave = useCallback(async () => {
    if (!currentProject || !activeFile || editContent === displayContent) return;

    try {
      const response = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject.name,
          path: activeFile.path,
          content: editContent,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setFileContent(editContent);
        setIsEditing(false);
        setProjectState({ pendingChanges: false });
        if (settings.showNotifications) {
          toast.success('File saved');
        }
      } else {
        if (settings.showNotifications) {
          toast.error(data.error || 'Failed to save');
        }
      }
    } catch {
      if (settings.showNotifications) {
        toast.error('Failed to save file');
      }
    }
  }, [currentProject, activeFile, editContent, displayContent, setFileContent, setProjectState, settings.showNotifications]);

  const handleCancel = useCallback(() => {
    setEditContent(displayContent);
    setIsEditing(false);
    setProjectState({ pendingChanges: false });
    setShowFindReplace(false);
  }, [displayContent, setProjectState]);

  const handleClose = useCallback(() => {
    if (editContent !== displayContent && !confirm('Discard unsaved changes?')) return;
    setActiveFile(null);
    setFileContent('');
    setIsEditing(false);
    setIsFullscreen(false);
    setShowFindReplace(false);
    setEditorPanelOpen(false); // Close the panel when file is closed
  }, [editContent, displayContent, setActiveFile, setFileContent, setEditorPanelOpen]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayContent);
    setCopied(true);
    toast.success('Content copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }, [displayContent]);

  const handleDownload = useCallback(() => {
    if (!activeFile) return;
    const blob = new Blob([displayContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('File downloaded');
  }, [activeFile, displayContent]);

  // Find next/previous
  const findNext = useCallback(() => {
    if (matchCount === 0) return;
    setCurrentMatch((prev) => (prev >= matchCount ? 1 : prev + 1));
  }, [matchCount]);

  const findPrev = useCallback(() => {
    if (matchCount === 0) return;
    setCurrentMatch((prev) => (prev <= 1 ? matchCount : prev - 1));
  }, [matchCount]);

  // Replace current/all
  const replaceCurrent = useCallback(() => {
    if (!findText || matchCount === 0) return;
    
    const searchContent = matchCase ? editContent : editContent.toLowerCase();
    const searchTerm = matchCase ? findText : findText.toLowerCase();
    
    let count = 0;
    const newContent = editContent.replace(new RegExp(
      matchCase ? findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'g'
    ), (match) => {
      count++;
      if (count === currentMatch) {
        return replaceText;
      }
      return match;
    });
    
    setEditContent(newContent);
    setProjectState({ pendingChanges: true });
  }, [findText, replaceText, editContent, matchCase, currentMatch, matchCount, setProjectState]);

  const replaceAll = useCallback(() => {
    if (!findText || matchCount === 0) return;
    
    const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flags = matchCase ? 'g' : 'gi';
    const newContent = editContent.replace(new RegExp(escapedFind, flags), replaceText);
    
    setEditContent(newContent);
    setProjectState({ pendingChanges: true });
    toast.success(`Replaced ${matchCount} occurrences`);
  }, [findText, replaceText, editContent, matchCase, matchCount, setProjectState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Cmd/Ctrl + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges) {
          handleSave();
        }
      }
      // Find: Cmd/Ctrl + F
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        if (isEditing) {
          setShowFindReplace(true);
        }
      }
      // Escape
      if (e.key === 'Escape') {
        if (showFindReplace) {
          setShowFindReplace(false);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        } else if (isEditing) {
          handleCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleCancel, hasChanges, isEditing, isFullscreen, showFindReplace]);

  if (!activeFile) {
    // On mobile, don't show "no file selected" message - return null
    // This prevents the overlay issue when closing editor on mobile
    if (isMobile) {
      return null;
    }
    
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-muted/10">
        <FileText className="h-16 w-16 mb-4 opacity-20" />
        <p className="text-sm font-medium mb-1">No file selected</p>
        <p className="text-xs text-muted-foreground">Select a file from the sidebar to view or edit</p>
      </div>
    );
  }

  const language = getLanguage(activeFile.name);

  return (
    <div
      className={cn(
        'flex flex-col bg-card border border-border h-full overflow-hidden',
        isFullscreen
          ? 'fixed inset-0 z-[100] rounded-none'
          : 'rounded-lg'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          {getFileIcon(activeFile.name)}
          <span className="text-sm font-medium truncate max-w-[120px]">
            {activeFile.name}
          </span>
          <Badge variant="outline" className="text-[10px] flex-shrink-0">
            {language}
          </Badge>
          {hasChanges && (
            <Badge variant="secondary" className="text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 flex-shrink-0">
              Modified
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {isEditing ? (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                className="h-7 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!hasChanges} className="h-7 text-xs">
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopy}
                className="h-7 w-7 p-0"
                title="Copy content"
              >
                {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownload}
                className="h-7 w-7 p-0"
                title="Download file"
              >
                <Download className="h-3 w-3" />
              </Button>
              {/* Preview Toggle for HTML/visual files */}
              {canPreview && (
                <Button
                  size="sm"
                  variant={isPreviewMode ? 'default' : 'ghost'}
                  onClick={() => setIsPreviewMode(!isPreviewMode)}
                  className="h-7 w-7 p-0"
                  title={isPreviewMode ? 'Show code' : 'Preview rendered'}
                >
                  {isPreviewMode ? <Code className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="h-7 w-7 p-0"
                title="Edit file"
              >
                <Edit3 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-7 w-7 p-0"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-3 w-3" />
                ) : (
                  <Maximize2 className="h-3 w-3" />
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClose} className="h-7 w-7 p-0" title="Close">
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Find/Replace Panel */}
      {isEditing && showFindReplace && (
        <div className="border-b border-border bg-muted/20 p-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1 flex-1">
              <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="Find..."
                className="h-7 text-xs flex-1"
              />
              {matchCount > 0 && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {currentMatch}/{matchCount}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={findPrev}
                disabled={matchCount === 0}
                className="h-7 w-7 p-0"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={findNext}
                disabled={matchCount === 0}
                className="h-7 w-7 p-0"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowFindReplace(false)}
              className="h-7 w-7 p-0"
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Replace className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <Input
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace..."
              className="h-7 text-xs flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={replaceCurrent}
              disabled={matchCount === 0}
              className="h-7 text-xs"
            >
              Replace
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={replaceAll}
              disabled={matchCount === 0}
              className="h-7 text-xs"
            >
              All
            </Button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isEditing ? (
          <EditorWithLineNumbers
            value={editContent}
            onChange={(value) => {
              setEditContent(value);
              setProjectState({ pendingChanges: true });
            }}
            textareaRef={textareaRef}
            className={cn(!wordWrap && 'overflow-x-auto')}
          />
        ) : isPreviewMode && canPreview ? (
          /* Live Preview for HTML/visual files - uses path-based URL for correct relative path resolution */
          <div className="h-full w-full bg-white">
            <iframe
              src={`/preview/${encodeURIComponent(currentProject?.name || '')}/${activeFile?.path || ''}`}
              className="w-full h-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <SyntaxHighlighter
              language={language}
              style={oneDark}
              customStyle={{
                margin: 0,
                background: 'transparent',
                padding: 0,
                minHeight: '100%',
                fontSize: '0.875rem',
                fontFamily: 'var(--font-mono), ui-monospace, monospace',
                textShadow: 'none',
              }}
              showLineNumbers
              lineNumberStyle={{
                minWidth: '3.5em',
                paddingRight: '1em',
                marginRight: '1em',
                color: 'oklch(0.5 0 0)',
                fontSize: '0.75rem',
                borderRight: '1px solid oklch(0.7 0 0)',
                background: 'oklch(0.97 0 0)',
                textShadow: 'none',
              }}
              wrapLines={wordWrap}
              wrapLongLines={wordWrap}
            >
              {displayContent || ''}
            </SyntaxHighlighter>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>{displayContent.split('\n').length} lines</span>
          <span>{new Blob([displayContent]).size} bytes</span>
          <span className="hidden sm:inline">{language}</span>
        </div>
        <div className="flex items-center gap-1">
          {isEditing && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setWordWrap(!wordWrap)}
                className={cn('h-6 w-6 p-0', wordWrap && 'text-primary')}
                title="Toggle word wrap"
              >
                <WrapText className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowFindReplace(!showFindReplace)}
                className={cn('h-6 w-6 p-0', showFindReplace && 'text-primary')}
                title="Find & Replace"
              >
                <Search className="h-3 w-3" />
              </Button>
            </>
          )}
          {!isEditing && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="h-6 text-xs"
            >
              <Edit3 className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

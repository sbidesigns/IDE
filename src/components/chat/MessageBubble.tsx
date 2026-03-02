'use client';

import { memo, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Message, Source } from '@/types';
import { cn } from '@/lib/utils';
import { 
  User, 
  Bot, 
  ExternalLink, 
  Clock, 
  FileText, 
  Anchor,
  Copy,
  Edit2,
  Trash2,
  RotateCcw,
  RefreshCw,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { useAgentStore } from '@/store';
import { toast } from 'sonner';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: (messageId: string) => void;
  onRollback?: (messageId: string) => void;
  onEditAndRegenerate?: (messageId: string, newContent: string) => void;
}

const CodeBlock = memo(function CodeBlock({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: string }) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  
  // Auto-collapse large code blocks (more than 30 lines)
  const lineCount = code.split('\n').length;
  const isLarge = lineCount > 30;
  const [isExpanded, setIsExpanded] = useState(!isLarge);

  if (!language) {
    return (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayCode = isExpanded ? code : code.split('\n').slice(0, 15).join('\n') + '\n...';
  const hiddenLines = lineCount - 15;

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border/50">
      <div className="bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono">{language}</span>
          {isLarge && (
            <Badge variant="outline" className="text-[10px] py-0 px-1">
              {lineCount} lines
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            <span className="text-xs">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: 'oklch(0.12 0.01 260)',
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: '0.875rem',
            textShadow: 'none',
            maxHeight: isExpanded ? 'none' : '300px',
            overflow: 'hidden',
          }}
          {...props}
        >
          {displayCode}
        </SyntaxHighlighter>
        {!isExpanded && isLarge && (
          <div 
            className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[oklch(0.12_0.01_260)] to-transparent cursor-pointer flex items-end justify-center pb-2"
            onClick={() => setIsExpanded(true)}
          >
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-white/70 hover:text-white hover:bg-white/10"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              Show {hiddenLines} more lines
            </Button>
          </div>
        )}
      </div>
      {isExpanded && isLarge && (
        <div className="bg-muted/50 px-3 py-1 text-xs text-muted-foreground flex items-center justify-center">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-6"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronUp className="h-3 w-3 mr-1" />
            Collapse
          </Button>
        </div>
      )}
    </div>
  );
});

const SourcesList = memo(function SourcesList({ sources }: { sources: Source[] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2">Sources:</p>
      <div className="flex flex-wrap gap-2">
        {sources.map((source, idx) => (
          <a
            key={idx}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs bg-muted/50 hover:bg-muted px-2 py-1 rounded transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="truncate max-w-[150px]">{source.title}</span>
          </a>
        ))}
      </div>
    </div>
  );
});

const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1">
      <span className="typing-dot w-2 h-2 bg-primary rounded-full" />
      <span className="typing-dot w-2 h-2 bg-primary rounded-full" />
      <span className="typing-dot w-2 h-2 bg-primary rounded-full" />
    </div>
  );
});

// Streaming progress indicator with status
const StreamingProgress = memo(function StreamingProgress({ content }: { content: string }) {
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const lineCount = content.split('\n').length;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/30">
      <div className="flex items-center gap-1">
        <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <span>Streaming...</span>
      </div>
      <div className="flex items-center gap-3 text-[10px]">
        <span>{wordCount} words</span>
        <span>{charCount} chars</span>
        <span>{lineCount} lines</span>
      </div>
    </div>
  );
});

// Action button component - icon only on mobile
interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

const ActionButton = memo(function ActionButton({ 
  icon, 
  label, 
  onClick, 
  variant = 'default',
  disabled = false 
}: ActionButtonProps) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "h-7 px-2 text-xs gap-1",
        "md:px-2 md:gap-1",
        variant === 'destructive' && "text-destructive hover:text-destructive hover:bg-destructive/10"
      )}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </Button>
  );
});

export const MessageBubble = memo(function MessageBubble({
  message,
  isStreaming = false,
  onRegenerate,
  onRollback,
  onEditAndRegenerate,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  const { deleteMessage } = useAgentStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedTime = useMemo(() => {
    return new Date(message.timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [message.timestamp]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== message.content) {
      // Show confirmation dialog for regeneration
      setShowEditDialog(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleEditConfirm = () => {
    if (editContent.trim() && editContent !== message.content) {
      // Call the edit and regenerate callback
      onEditAndRegenerate?.(message.id, editContent.trim());
    }
    setIsEditing(false);
    setShowEditDialog(false);
  };

  const handleDelete = () => {
    deleteMessage(message.id);
    toast.success('Message deleted');
    setShowDeleteDialog(false);
  };

  const memoizedContent = useMemo(() => {
    if (isStreaming && !message.content) {
      return <TypingIndicator />;
    }

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              {children}
              <ExternalLink className="h-3 w-3 inline" />
            </a>
          ),
        }}
      >
        {message.content}
      </ReactMarkdown>
    );
  }, [message.content, isStreaming]);

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted/50 px-4 py-2 rounded-full text-xs text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'flex gap-3 message-fade-in',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        <div
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>

        <div
          className={cn(
            'flex-1 max-w-[85%]',
            isUser ? 'flex flex-col items-end' : 'flex flex-col items-start'
          )}
        >
          {isEditing ? (
            <div className="w-full max-w-lg">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEditSave}>
                  Save & Regenerate
                </Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={cn(
                  'rounded-2xl px-4 py-3',
                  isUser
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card border border-border/50 rounded-tl-sm'
                )}
              >
                <div className={cn('markdown-content', isUser && 'text-primary-foreground')}>
                  {memoizedContent}
                </div>
                {/* Streaming cursor for user messages */}
                {isStreaming && isUser && (
                  <span className="inline-block w-2 h-4 bg-primary/50 ml-1 pulse-glow" />
                )}
              </div>
              {/* Streaming progress for AI messages */}
              {isStreaming && !isUser && message.content && (
                <StreamingProgress content={message.content} />
              )}
            </>
          )}

          {/* Timestamp and badges */}
          <div
            className={cn(
              'flex items-center gap-2 mt-1 text-xs text-muted-foreground',
              isUser ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Clock className="h-3 w-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{new Date(message.timestamp).toLocaleString()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span>{formattedTime}</span>

            {(message.filesCreated?.length || message.filesModified?.length) && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <Badge variant="outline" className="text-[10px] py-0 px-1">
                  {(message.filesCreated?.length || 0) + (message.filesModified?.length || 0)} files
                </Badge>
              </div>
            )}

            {message.memoryAnchors && message.memoryAnchors.length > 0 && (
              <div className="flex items-center gap-1">
                <Anchor className="h-3 w-3" />
                <Badge variant="outline" className="text-[10px] py-0 px-1">
                  {message.memoryAnchors.length} anchors
                </Badge>
              </div>
            )}

            {message.confidence !== undefined && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] py-0 px-1',
                  message.confidence > 0.8
                    ? 'border-green-500 text-green-500'
                    : message.confidence > 0.5
                    ? 'border-yellow-500 text-yellow-500'
                    : 'border-red-500 text-red-500'
                )}
              >
                {Math.round(message.confidence * 100)}% confident
              </Badge>
            )}
          </div>

          {/* Action buttons */}
          {!isStreaming && !isEditing && (
            <div
              className={cn(
                'flex items-center gap-0.5 mt-2',
                isUser ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              {/* Copy - available for all messages */}
              <ActionButton
                icon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                label="Copy"
                onClick={handleCopy}
              />

              {isUser ? (
                <>
                  {/* Edit - user messages only */}
                  <ActionButton
                    icon={<Edit2 className="h-3.5 w-3.5" />}
                    label="Edit"
                    onClick={() => setIsEditing(true)}
                  />
                  {/* Delete - user messages */}
                  <ActionButton
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    label="Delete"
                    onClick={() => setShowDeleteDialog(true)}
                    variant="destructive"
                  />
                </>
              ) : (
                <>
                  {/* Rollback - AI messages */}
                  <ActionButton
                    icon={<RotateCcw className="h-3.5 w-3.5" />}
                    label="Rollback"
                    onClick={() => setShowRollbackDialog(true)}
                    variant="destructive"
                  />
                  {/* Delete - AI messages */}
                  <ActionButton
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    label="Delete"
                    onClick={() => setShowDeleteDialog(true)}
                    variant="destructive"
                  />
                  {/* Regenerate - AI messages */}
                  <ActionButton
                    icon={<RefreshCw className="h-3.5 w-3.5" />}
                    label="Regenerate"
                    onClick={() => setShowRegenerateDialog(true)}
                  />
                </>
              )}
            </div>
          )}

          {!isUser && message.sources && message.sources.length > 0 && (
            <SourcesList sources={message.sources} />
          )}
        </div>
      </div>

      {/* Edit Confirmation Dialog */}
      <AlertDialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit & Regenerate</AlertDialogTitle>
            <AlertDialogDescription>
              Editing this message will remove all responses after it and regenerate a new response. 
              A backup checkpoint will be created before making changes.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsEditing(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditConfirm}>
              Edit & Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete this message. This action may affect the conversation context.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this message and all messages after it. 
              This may affect project state and any changes made by the AI.
              A backup checkpoint will be created before rollback.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRollback?.(message.id);
                setShowRollbackDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate Response</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new response. A backup checkpoint will be created 
              with version suffix &quot;.2&quot; before regenerating.
              Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRegenerate?.(message.id);
                setShowRegenerateDialog(false);
              }}
            >
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

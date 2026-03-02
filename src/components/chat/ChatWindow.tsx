'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useAgentStore } from '@/store';
import { MessageBubble } from './MessageBubble';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Trash2,
  Download,
  Search,
  Loader2,
  Sparkles
} from 'lucide-react';
import type { Message, ChatStreamChunk } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ChatWindow() {
  const {
    currentProject,
    messages,
    addMessage,
    updateLastMessage,
    isStreaming,
    setStreaming,
    contextResults,
    projectMemory,
    clearMessages,
    setMessages,
    editMessageAndTruncate,
    settings,
    refreshFiles,
  } = useAgentStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastCheckpointRef = useRef<number>(0);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the proper scrollHeight
      textareaRef.current.style.height = 'auto';
      // Calculate max height for ~10 rows (approx 24px per row + padding)
      const maxHeight = 10 * 24 + 16; // ~256px
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [input]);

  const buildProjectContext = useCallback(() => {
    if (!currentProject) return '';
    
    const parts: string[] = [];
    
    parts.push(`Project: ${currentProject.name}`);
    parts.push(`Version: ${currentProject.currentVersion}`);
    
    if (projectMemory?.anchors && projectMemory.anchors.length > 0) {
      parts.push('\nMemory Anchors:');
      projectMemory.anchors.forEach(anchor => {
        parts.push(`- [${anchor.type}] ${anchor.content}`);
      });
    }
    
    if (projectMemory?.keyDecisions && projectMemory.keyDecisions.length > 0) {
      parts.push('\nKey Decisions:');
      projectMemory.keyDecisions.forEach(decision => {
        parts.push(`- ${decision}`);
      });
    }
    
    return parts.join('\n');
  }, [currentProject, projectMemory]);

  // Create auto-checkpoint after AI response
  const createAutoCheckpoint = useCallback(async () => {
    if (!currentProject) return;
    
    // Debounce checkpoints - only create one every 5 seconds max
    const now = Date.now();
    if (now - lastCheckpointRef.current < 5000) return;
    lastCheckpointRef.current = now;

    try {
      const response = await fetch('/api/versions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project: currentProject.name,
          createArchive: settings.autoCreateZipBackup 
        }),
      });
      const data = await response.json();
      if (data.success && settings.showNotifications) {
        toast.success(`Auto-checkpoint ${data.data.versionNumber} created`);
      }
    } catch {
      console.error('Auto-checkpoint failed');
    }
  }, [currentProject, settings.autoCreateZipBackup, settings.showNotifications]);

  // Extract fresh context after interaction
  const extractFreshContext = useCallback(async (recentMessages: Message[], generateMeeting: boolean = false) => {
    if (!currentProject) return;
    
    try {
      // Get current file list
      const filesResponse = await fetch(`/api/files?project=${currentProject.name}`);
      const filesData = await filesResponse.json();
      const currentFiles = filesData.success 
        ? flattenFiles(filesData.data).map((f: { path: string }) => f.path)
        : [];

      await fetch('/api/context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: currentProject.name,
          messages: recentMessages.map(m => ({ role: m.role, content: m.content })),
          currentFiles,
          generateMeeting,
        }),
      });
    } catch (error) {
      console.error('Context extraction failed:', error);
    }
  }, [currentProject]);

  // Helper to flatten file tree
  const flattenFiles = (files: any[], prefix = ''): any[] => {
    const result: any[] = [];
    for (const file of files) {
      const path = prefix ? `${prefix}/${file.name}` : file.name;
      if (file.type === 'file') {
        result.push({ ...file, path });
      } else if (file.children) {
        result.push(...flattenFiles(file.children, path));
      }
    }
    return result;
  };

  const sendMessage = async (messagesToSend: Message[]) => {
    if (isStreaming) return;

    const userMessage = messagesToSend[messagesToSend.length - 1];
    if (userMessage.role !== 'user') return;

    setStreaming(true);

    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };
    addMessage(assistantMessage);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesToSend,
          projectId: currentProject?.name || 'default',
          projectContext: buildProjectContext(),
          searchResults: contextResults.length > 0 ? contextResults : undefined,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorDetail = 'Failed to send message';
        try {
          const errorData = await response.json();
          errorDetail = errorData.error || errorDetail;
        } catch {
          // Response might be streaming, continue anyway
          console.log('Response status:', response.status, 'but proceeding with stream');
        }
        // Only throw if response body is null and not streaming
        if (!response.body) {
          throw new Error(errorDetail);
        }
      }

      const reader = response.body?.getReader();
      if (!reader) {
        // No reader means no body, which is an error
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let filesChanged: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: ChatStreamChunk = JSON.parse(line.slice(6));
              
              if (data.type === 'content' && data.content) {
                accumulatedContent += data.content;
                updateLastMessage(accumulatedContent);
              } else if (data.type === 'done' && data.content) {
                // Parse files changed from done message
                try {
                  const doneData = JSON.parse(data.content);
                  if (doneData.filesChanged) {
                    filesChanged = doneData.filesChanged;
                  }
                } catch {
                  // Ignore parse errors
                }
              } else if (data.type === 'error') {
                toast.error(data.content || 'An error occurred');
                updateLastMessage(accumulatedContent + '\n\n*An error occurred*');
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Refresh file tree if files were changed
      if (filesChanged.length > 0) {
        refreshFiles();
      }

      // Create auto-checkpoint after successful AI response
      await createAutoCheckpoint();

      // Extract fresh context (non-blocking, after checkpoint)
      const lastMessages = [...messagesToSend, { id: 'temp', role: 'assistant' as const, content: accumulatedContent, timestamp: Date.now() }];
      extractFreshContext(lastMessages).catch(console.error);

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Chat error:', error);
      // Only show toast if we haven't received any content
      const currentMessages = useAgentStore.getState().messages;
      const lastMessage = currentMessages[currentMessages.length - 1];
      if (!lastMessage?.content) {
        toast.error('Failed to get response. Please try again.');
        updateLastMessage('*Failed to get response. Please try again.*');
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    addMessage(userMessage);
    setInput('');
    
    await sendMessage([...messages, userMessage]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const stopStreaming = () => {
    abortControllerRef.current?.abort();
    setStreaming(false);
  };

  const exportConversation = () => {
    const conversation = messages
      .map(m => `[${new Date(m.timestamp).toISOString()}] ${m.role.toUpperCase()}: ${m.content}`)
      .join('\n\n');
    
    const blob = new Blob([conversation], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Conversation exported');
  };

  const handleClearConversation = () => {
    if (confirm('Are you sure you want to clear the conversation? This will not affect your project files.')) {
      clearMessages();
      toast.success('Conversation cleared');
    }
  };

  // Handle rollback - remove message and all after it
  const handleRollback = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Create backup before rollback
    if (currentProject) {
      try {
        await fetch('/api/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            project: currentProject.name,
            createArchive: true,
            suffix: '.2' // Indicate this is a pre-rollback backup
          }),
        });
      } catch {
        console.error('Failed to create pre-rollback backup');
      }
    }

    // Keep only messages before this one
    setMessages(messages.slice(0, messageIndex));
    toast.success('Rolled back conversation');
  };

  // Handle regenerate - delete current AI response and generate new one
  const handleRegenerate = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    // Create backup before regenerate
    if (currentProject) {
      try {
        await fetch('/api/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            project: currentProject.name,
            createArchive: true,
            suffix: '.2'
          }),
        });
      } catch {
        console.error('Failed to create pre-regenerate backup');
      }
    }

    // Remove the AI message and regenerate
    const messagesUpToUser = messages.slice(0, messageIndex);
    setMessages(messagesUpToUser);

    // Find the last user message to regenerate from
    const lastUserMessageIndex = messagesUpToUser.length - 1;
    if (lastUserMessageIndex >= 0 && messagesUpToUser[lastUserMessageIndex].role === 'user') {
      await sendMessage(messagesUpToUser);
    }
  };

  // Handle edit and regenerate - edit user message and regenerate AI response
  const handleEditAndRegenerate = async (messageId: string, newContent: string) => {
    // Create backup before edit
    if (currentProject) {
      try {
        await fetch('/api/versions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            project: currentProject.name,
            createArchive: true,
            description: 'Pre-edit backup'
          }),
        });
      } catch {
        console.error('Failed to create pre-edit backup');
      }
    }

    // Edit the message and remove all after it
    editMessageAndTruncate(messageId, newContent);
    
    // Get the updated messages
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const updatedMessages = messages.slice(0, messageIndex + 1);
    updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], content: newContent };
    
    // Regenerate AI response
    await sendMessage(updatedMessages);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">AI Agent Platform</h2>
            <p className="text-muted-foreground max-w-md">
              {currentProject
                ? `Working on project: ${currentProject.name}`
                : 'Select or create a project to get started'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInput('Help me understand the project structure')}
              >
                Analyze project
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInput('What can you help me with?')}
              >
                Get help
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInput('Search for the latest web development trends')}
              >
                Web search
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={isStreaming && index === messages.length - 1}
                onRollback={handleRollback}
                onRegenerate={handleRegenerate}
                onEditAndRegenerate={handleEditAndRegenerate}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="border-t border-border p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearConversation}
              disabled={messages.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={exportConversation}
              disabled={messages.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            {contextResults.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-500">
                <Search className="h-3 w-3" />
                {contextResults.length} web results in context
              </div>
            )}
          </div>

          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              rows={1}
              className={cn(
                'min-h-[40px] max-h-[256px] pr-12 resize-none overflow-y-auto',
                'bg-card border-border/50 focus:border-primary/50'
              )}
              disabled={isStreaming}
              suppressHydrationWarning
            />
            <div className="absolute right-2 bottom-2">
              {isStreaming ? (
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={stopStreaming}
                  className="h-8 w-8"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!input.trim()}
                  className="h-8 w-8"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

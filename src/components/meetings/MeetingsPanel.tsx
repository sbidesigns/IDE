'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { useAgentStore } from '@/store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  RefreshCw,
  Loader2,
  Calendar,
} from 'lucide-react';
import type { MeetingNote } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function MeetingsPanel() {
  const { currentProject } = useAgentStore();
  const [meetings, setMeetings] = useState<MeetingNote[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [meetingContent, setMeetingContent] = useState<string>('');

  const loadMeetings = useCallback(async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      // Load meeting files from the project
      const response = await fetch(`/api/files?project=${currentProject.name}&path=meetings`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.data)) {
        // Sort by meeting number (descending)
        const sortedMeetings = data.data
          .filter((f: { name: string }) => f.name.startsWith('meeting_') && f.name.endsWith('.md'))
          .sort((a: { name: string }, b: { name: string }) => {
            const numA = parseInt(a.name.match(/meeting_(\d+)/)?.[1] || '0');
            const numB = parseInt(b.name.match(/meeting_(\d+)/)?.[1] || '0');
            return numB - numA;
          });
        
        // Parse meetings
        const parsedMeetings: MeetingNote[] = sortedMeetings.map((file: { name: string; path: string; updatedAt?: number }) => {
          const meetingNum = parseInt(file.name.match(/meeting_(\d+)/)?.[1] || '0');
          return {
            id: file.name,
            projectName: currentProject.name,
            meetingNumber: meetingNum,
            version: `${meetingNum}.0`,
            createdAt: file.updatedAt || Date.now(),
            taskUnderReview: 'Loading...',
            expertsPresent: [],
            debateTranscript: [],
            consensusReached: false,
            decisions: [],
            actionItems: [],
            concernsRaised: [],
            implementationPlan: '',
            estimatedComplexity: 'medium',
            _path: file.path // Store path for loading content
          };
        });
        
        setMeetings(parsedMeetings);
      }
    } catch (error) {
      console.error('Failed to load meetings:', error);
    }
    setIsLoading(false);
  }, [currentProject]);

  useEffect(() => {
    startTransition(() => {
      loadMeetings();
    });
  }, [loadMeetings]);

  const loadMeetingContent = async (meeting: MeetingNote & { _path?: string }) => {
    if (!currentProject || !meeting._path) return;
    
    try {
      const response = await fetch(`/api/files?project=${currentProject.name}&path=${meeting._path}`);
      const data = await response.json();
      
      if (data.success && data.data?.content) {
        setMeetingContent(data.data.content);
        setSelectedMeeting(meeting);
      }
    } catch (error) {
      console.error('Failed to load meeting content:', error);
      toast.error('Failed to load meeting content');
    }
  };

  if (!currentProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <Users className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-xs">Select a project to view meetings</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Expert Meetings</h3>
          <Button
            size="icon"
            variant="ghost"
            onClick={loadMeetings}
            disabled={isLoading}
            className="h-6 w-6"
          >
            <RefreshCw className={cn('h-3 w-3', isLoading && 'animate-spin')} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Debate Gauntlet transcripts
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Meeting List */}
        <div className={cn(
          'flex-shrink-0 border-r border-border transition-all',
          selectedMeeting ? 'w-32' : 'w-full'
        )}>
          <ScrollArea className="h-full">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : meetings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Users className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs text-muted-foreground">No meetings yet</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Meetings are generated during development
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {meetings.map((meeting) => (
                  <button
                    key={meeting.id}
                    onClick={() => loadMeetingContent(meeting as MeetingNote & { _path?: string })}
                    className={cn(
                      'w-full text-left p-2 rounded-md transition-colors',
                      selectedMeeting?.id === meeting.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 flex-shrink-0" />
                      <span className="text-xs font-medium">#{meeting.meetingNumber}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                      <Calendar className="h-2.5 w-2.5" />
                      {new Date(meeting.createdAt).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Meeting Detail */}
        {selectedMeeting && (
          <div className="flex-1 min-w-0">
            <div className="p-2 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  v{selectedMeeting.version}
                </Badge>
                <span className="text-xs font-medium">Meeting #{selectedMeeting.meetingNumber}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedMeeting(null)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
            <ScrollArea className="h-[calc(100%-40px)]">
              <div className="prose prose-sm prose-invert max-w-none p-3">
                <pre className="whitespace-pre-wrap text-xs bg-transparent p-0 border-0 font-mono leading-relaxed">
                  {meetingContent}
                </pre>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

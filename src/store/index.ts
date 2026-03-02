import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Message,
  Project,
  FileInfo,
  ProjectMemory,
  Source,
  Version,
  ProjectState
} from '@/types';

// Visual theme type - affects entire app appearance
export type AppTheme = 'unthemed' | 'default' | 'light' | 'dark' | 'slate' | 'sand' | 'midnight' | 'ocean';

// Settings type
export interface AppSettings {
  autoCreateZipBackup: boolean;    // Create ZIP archive on checkpoint
  showNotifications: boolean;      // Show toast notifications
  fontScale: number;               // Font size scale (0.75 - 1.5, default 1)
  theme: AppTheme;                 // Visual theme
}

interface AgentStore {
  // Hydration state
  _hasHydrated: boolean;

  // Current Session
  currentProject: Project | null;
  messages: Message[];
  isStreaming: boolean;
  
  // Per-project message storage (keyed by project name)
  projectMessages: Record<string, Message[]>;
  
  // UI State
  sidebarOpen: boolean;
  activeTab: 'files' | 'memory' | 'versions' | 'search' | 'meetings';
  activeFile: FileInfo | null;
  fileContent: string;
  settingsOpen: boolean;
  editorPanelOpen: boolean;   // Right panel visibility
  editorFocused: boolean;     // When true, hide chat and show editor full-width
  
  // Search State
  searchResults: Source[];           // All search results from query
  contextResults: Source[];          // Results user added to context (max 50)
  searchQuery: string;
  isSearching: boolean;
  
  // Memory State
  projectMemory: ProjectMemory | null;
  
  // Versions
  versions: Version[];
  
  // Projects List
  projects: Project[];
  
  // Settings
  settings: AppSettings;
  
  // File refresh trigger
  fileRefreshKey: number;
  
  // Actions
  setCurrentProject: (project: Project | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  
  // Message actions
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, newContent: string) => void;
  editMessageAndTruncate: (messageId: string, newContent: string) => void;  // Edit and remove all after
  getMessageIndex: (messageId: string) => number;
  
  setSidebarOpen: (open: boolean) => void;
  setActiveTab: (tab: 'files' | 'memory' | 'versions' | 'search' | 'meetings') => void;
  setActiveFile: (file: FileInfo | null) => void;
  setFileContent: (content: string) => void;
  setSettingsOpen: (open: boolean) => void;
  setEditorPanelOpen: (open: boolean) => void;
  setEditorFocused: (focused: boolean) => void;
  focusEditor: () => void;  // Convenience: opens panel + focuses editor
  
  // Search actions
  setSearchResults: (results: Source[]) => void;
  setSearchQuery: (query: string) => void;
  setSearching: (searching: boolean) => void;
  addToContext: (result: Source) => void;      // Add single result to context
  removeFromContext: (url: string) => void;    // Remove from context
  clearContext: () => void;                    // Clear all context
  clearSearchResults: () => void;              // Clear search results
  
  setProjectMemory: (memory: ProjectMemory | null) => void;
  
  setVersions: (versions: Version[]) => void;
  setProjects: (projects: Project[]) => void;
  
  clearMessages: () => void;
  
  // Project State
  projectState: ProjectState;
  setProjectState: (state: Partial<ProjectState>) => void;
  
  // Auto-save tracking
  lastSaved: number;
  setLastSaved: (timestamp: number) => void;
  
  // Settings Actions
  updateSettings: (settings: Partial<AppSettings>) => void;

  // File refresh
  refreshFiles: () => void;

  // Hydration
  setHasHydrated: (state: boolean) => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      // Hydration state
      _hasHydrated: false,

      // Initial State
      currentProject: null,
      messages: [],
      projectMessages: {},  // Per-project message storage
      isStreaming: false,
      
      sidebarOpen: false,  // Start with sidebar closed (chat as home)
      activeTab: 'files',
      activeFile: null,
      fileContent: '',
      settingsOpen: false,
      editorPanelOpen: true,   // Editor panel visible by default on desktop
      editorFocused: false,    // Chat visible by default
      
      searchResults: [],
      contextResults: [],
      searchQuery: '',
      isSearching: false,
      
      projectMemory: null,
      versions: [],
      projects: [],
      
      // Default Settings
      settings: {
        autoCreateZipBackup: true,
        showNotifications: true,
        fontScale: 1,
        theme: 'unthemed',
      },
      
      projectState: {
        currentFiles: [],
        activeFile: null,
        lastOperation: null,
        pendingChanges: false
      },
      
      lastSaved: 0,
      
      fileRefreshKey: 0,
      
      // Actions
      setCurrentProject: (project) => set((state) => {
        // Save current project's messages before switching
        const updatedProjectMessages = { ...state.projectMessages };
        if (state.currentProject?.name) {
          updatedProjectMessages[state.currentProject.name] = state.messages;
        }
        
        // Load new project's messages (or empty array if new project)
        const newMessages = project?.name 
          ? (updatedProjectMessages[project.name] || [])
          : [];
        
        return { 
          currentProject: project, 
          projectMessages: updatedProjectMessages,
          messages: newMessages,
          activeFile: null,
          fileContent: '',
        };
      }),
      setMessages: (messages) => set({ messages }),
      addMessage: (message) => set((state) => ({ 
        messages: [...state.messages, message] 
      })),
      updateLastMessage: (content) => set((state) => {
        const messages = [...state.messages];
        if (messages.length > 0) {
          messages[messages.length - 1] = {
            ...messages[messages.length - 1],
            content
          };
        }
        return { messages };
      }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      
      // Message actions
      deleteMessage: (messageId) => set((state) => ({
        messages: state.messages.filter(m => m.id !== messageId)
      })),
      editMessage: (messageId, newContent) => set((state) => ({
        messages: state.messages.map(m => 
          m.id === messageId ? { ...m, content: newContent } : m
        )
      })),
      editMessageAndTruncate: (messageId, newContent) => set((state) => {
        const index = state.messages.findIndex(m => m.id === messageId);
        if (index === -1) return state;
        
        // Get messages up to and including the edited one
        const truncatedMessages = state.messages.slice(0, index + 1);
        // Update the last message with new content
        truncatedMessages[index] = { ...truncatedMessages[index], content: newContent };
        
        return { messages: truncatedMessages };
      }),
      getMessageIndex: (messageId) => {
        const state = get();
        return state.messages.findIndex(m => m.id === messageId);
      },
      
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setActiveFile: (file) => set({ activeFile: file }),
      setFileContent: (content) => set({ fileContent: content }),
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      setEditorPanelOpen: (open) => set({ editorPanelOpen: open }),
      setEditorFocused: (focused) => set({ editorFocused: focused }),
      focusEditor: () => set({ editorPanelOpen: true, editorFocused: true, sidebarOpen: false }),
      
      // Search actions
      setSearchResults: (results) => set({ searchResults: results }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearching: (searching) => set({ isSearching: searching }),
      
      addToContext: (result) => set((state) => {
        // Check if already in context
        if (state.contextResults.some(r => r.url === result.url)) {
          return state;
        }
        // Check max limit (50)
        if (state.contextResults.length >= 50) {
          return state;
        }
        return { contextResults: [...state.contextResults, result] };
      }),
      
      removeFromContext: (url) => set((state) => ({
        contextResults: state.contextResults.filter(r => r.url !== url)
      })),
      
      clearContext: () => set({ contextResults: [] }),
      
      clearSearchResults: () => set({ 
        searchResults: [], 
        searchQuery: '' 
      }),
      
      setProjectMemory: (memory) => set({ projectMemory: memory }),
      
      setVersions: (versions) => set({ versions }),
      setProjects: (projects) => set({ projects }),
      
      clearMessages: () => set({ messages: [] }),
      
      setProjectState: (state) => set((prev) => ({
        projectState: { ...prev.projectState, ...state }
      })),
      
      setLastSaved: (timestamp) => set({ lastSaved: timestamp }),
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      
      refreshFiles: () => set((state) => ({ fileRefreshKey: state.fileRefreshKey + 1 })),

      // Hydration setter
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'ai-agent-storage',
      partialize: (state) => ({
        currentProject: state.currentProject,
        messages: state.messages,
        projectMessages: state.projectMessages,
        projectState: state.projectState,
        lastSaved: state.lastSaved,
        sidebarOpen: state.sidebarOpen,
        settings: state.settings,
        contextResults: state.contextResults,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

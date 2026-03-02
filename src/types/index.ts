// Core types for the AI Agent Platform

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  filesCreated?: string[];
  filesModified?: string[];
  memoryAnchors?: MemoryAnchor[];
  confidence?: number;
  sources?: Source[];
}

export interface Source {
  url: string;
  title: string;
  snippet: string;
  favicon?: string;
}

export interface Project {
  name: string;
  path: string;
  createdAt: number;
  updatedAt: number;
  currentVersion: string;
  files: FileInfo[];
}

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileInfo[];
  size?: number;
  updatedAt?: number;
}

export interface ProjectMemory {
  projectName: string;
  anchors: MemoryAnchor[];
  keyDecisions: string[];
  context: string;
}

export interface MemoryAnchor {
  id: string;
  type: 'file' | 'decision' | 'pattern' | 'preference';
  content: string;
  timestamp: number;
  relevance: number;
}

export interface Version {
  id: string;
  projectName: string;
  versionNumber: string;
  createdAt: number;
  description: string;
  archivePath?: string;
  fileCount: number;
  size: number;
  hasArchive?: boolean;
}

export interface ProjectState {
  currentFiles: FileInfo[];
  activeFile: FileInfo | null;
  lastOperation: string | null;
  pendingChanges: boolean;
}

export interface ChatStreamChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
}

export interface FileOperationResponse {
  success: boolean;
  data?: FileInfo | FileInfo[] | { message: string };
  error?: string;
}

// Fresh Context System Types
export interface DevContext {
  projectName: string;
  version: string;
  lastUpdated: number;
  
  // Project Identity
  projectPurpose: string;
  targetDomain: string;
  
  // Current State
  currentPhase: 'planning' | 'development' | 'testing' | 'deployment' | 'maintenance';
  currentTask: string;
  taskStatus: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  
  // Architecture
  techStack: string[];
  architectureDecisions: ArchitectureDecision[];
  fileStructure: FileStructureSummary;
  
  // Progress Tracking
  completedFeatures: string[];
  currentFeatures: string[];
  pendingFeatures: string[];
  knownIssues: string[];
  
  // Constraints & Preferences
  constraints: string[];
  userPreferences: string[];
  
  // Key Context (compressed from conversation)
  essentialContext: string;
}

export interface ArchitectureDecision {
  id: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  timestamp: number;
}

export interface FileStructureSummary {
  description: string;
  keyFiles: string[];
  patterns: string[];
}

// Expert Debate System Types
export interface ExpertPersona {
  id: string;
  role: string;
  expertise: string[];
  perspective: string;
  biases: string[];
}

export interface DebateContribution {
  expertId: string;
  expertRole: string;
  contributionType: 'proposal' | 'critique' | 'refinement' | 'agreement' | 'concern';
  content: string;
  referencesOther?: string;
}

export interface MeetingNote {
  id: string;
  projectName: string;
  meetingNumber: number;
  version: string;
  createdAt: number;
  taskUnderReview: string;
  
  // Expert Debate
  expertsPresent: ExpertPersona[];
  debateTranscript: DebateContribution[];
  
  // Outcomes
  consensusReached: boolean;
  decisions: string[];
  actionItems: string[];
  concernsRaised: string[];
  
  // Implementation
  implementationPlan: string;
  estimatedComplexity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ContextExtractionResult {
  success: boolean;
  context?: DevContext;
  meetingNote?: MeetingNote;
  error?: string;
}

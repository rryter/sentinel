// Status enum for better type safety
export enum AnalysisJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Helper type for IDs
export type AnalysisJobId = number;
export type FileWithViolationsId = number;
export type PatternMatchId = number;

// Common timestamp properties
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

// Base properties for PatternMatch
export interface PatternMatchBase {
  id: PatternMatchId;
  startLine: number;
  endLine: number;
  startCol: number | null;
  endCol: number | null;
  fileWithViolationsId: FileWithViolationsId;
  ruleId: string | null;
  ruleName: string;
  description: string | null;
}

// Derived properties for PatternMatch
export interface PatternMatchDerived {
  lineNumber: number;
  patternName: string;
  location: string;
  metadataContent: Record<string, any>;
  codeSnippet: string | null;
}

// Complete PatternMatch type (composition via type intersection)
export type PatternMatch = PatternMatchBase & PatternMatchDerived & Timestamps;

// Base properties for FileWithViolations
export interface FileWithViolationsBase {
  id: FileWithViolationsId;
  filePath: string;
  analysisJobId: AnalysisJobId;
  displayPath: string;
  jobStatus: AnalysisJobStatus;
}

// Complete FileWithViolations type
export type FileWithViolations = FileWithViolationsBase & Timestamps;

// FileWithViolations with related entities
export interface FileWithViolationsRelations {
  patternMatches: PatternMatch[];
}

// Complete FileWithViolations with relations
export type FileWithViolationsWithRelations = FileWithViolations &
  FileWithViolationsRelations;

// Base properties for AnalysisJob
export interface AnalysisJobBase {
  id: AnalysisJobId;
  projectId: number;
  status: AnalysisJobStatus;
  totalFiles: number | null;
  processedFiles: number | null;
  completedAt: string | null;
  goJobId: string | null;
  processingStatus: string;
}

// Meta information for AnalysisJob
export interface AnalysisJobMeta {
  meta: {
    isComplete: boolean;
    processingTime: number | null;
    createdOn: string;
  };
}

// Complete AnalysisJob type
export type AnalysisJob = AnalysisJobBase & AnalysisJobMeta & Timestamps;

// Related entities for AnalysisJob
export interface AnalysisJobRelations {
  filesWithViolations: FileWithViolations[];
  patternMatches: PatternMatch[];
}

// Complete AnalysisJob with relations
export type AnalysisJobWithRelations = AnalysisJob & AnalysisJobRelations;

// API response types
export interface AnalysisJobResponse {
  data: AnalysisJobWithRelations;
}

export interface AnalysisJobsResponse {
  data: AnalysisJobWithRelations[];
  meta?: {
    totalCount: number;
    page: number;
    perPage: number;
  };
}

// Add this simple job type for list usage
export interface AnalysisJobListItem {
  id: number;
  status: AnalysisJobStatus;
  startTime: string;
  completedTime: string | null;
  projectId: number;
}

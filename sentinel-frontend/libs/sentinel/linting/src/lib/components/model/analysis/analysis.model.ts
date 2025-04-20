export interface AnalysisResults {
  totalFiles: number;
  totalMatches: number;
  matchesByRule: MatchesByRule;
  detailedResult: DetailedResult[];
  groupedMatches: GroupedMatches;
}

export interface DetailedResult {
  filePath: string;
  matches: Match[] | null;
}

export interface Match {
  ruleId: string;
  ruleName: string;
  description: string;
  filePath: string;
  location: Location;
}

export interface Location {
  start: number;
  end: number;
  line: number;
  column: number;
}

export interface ArchitecturalImpact {
  affectsChangeDetection: boolean;
  maintainability: Maintainability;
  potentialMemoryLeak: boolean;
}

export enum Maintainability {
  Low = 'low',
}

export interface GroupedMatches {
  [key: string]: RuleViolation[];
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  description: string;
  filePath: string;
  location: Location;
}

export interface MatchesByRule {
  [ruleName: string]: number;
}

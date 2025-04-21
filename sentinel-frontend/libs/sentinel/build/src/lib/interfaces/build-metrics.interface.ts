export interface BuildMetricsResponse {
  metrics: BuildMetric[];
  filters: BuildMetricsFilters;
}

export interface BuildMetric {
  timestamp: number;
  initial_builds: BuildStats;
  hot_reloads: BuildStats;
  system: SystemMetrics;
}

export interface BuildStats {
  avg_duration_sec: string | null;
  min_duration_sec: number | null;
  max_duration_sec: number | null;
  build_count: number;
  total_errors: number;
  total_warnings: number;
  avg_files_count: number | null;
}

export interface SystemMetrics {
  memory_usage_percent: string;
}

export interface BuildMetricsFilters {
  projects: string[];
  environments: string[];
}

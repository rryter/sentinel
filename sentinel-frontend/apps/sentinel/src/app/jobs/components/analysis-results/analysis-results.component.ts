import { Component, input, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalysisResults } from '../model/analysis/analysis.model';
import { AnalysisJobsService } from 'src/app/api/generated/api/analysis-jobs.service';
import { ApiV1AnalysisJobsGet200ResponseDataInner } from 'src/app/api/generated/model/api-v1-analysis-jobs-get200-response-data-inner';

@Component({
  selector: 'app-analysis-results',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-results.component.html',
})
export class AnalysisResultsComponent implements OnInit {
  @Input() results: ApiV1AnalysisJobsGet200ResponseDataInner | null = null;
  @Input() totalExecutionTimeSeconds = 0;
  jobId = input<number>(0);

  constructor(private analysisJobService: AnalysisJobsService) {}

  ngOnInit(): void {
    this.analysisJobService
      .apiV1AnalysisJobsIdFetchResultsGet({
        id: this.jobId(),
      })
      .subscribe((response) => {
        this.results = response.data;
      });
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatMilliseconds(ms: number): string {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${ms}ms`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(2)}%`;
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  getObjectEntries(obj: any): [string, any][] {
    // Filter out the performance metrics and other non-rule fields
    const keysToFilter = [
      'id', 'project_id', 'status', 'total_files', 'total_matches', 
      'rules_matched', 'completed_at', 'created_at', 'updated_at', 
      'duration', 'files_processed', 'files_per_second_wall_time',
      'cumulative_processing_time_ms', 'avg_time_per_file_ms',
      'files_per_second_cpu_time', 'parallel_cores_used',
      'parallel_speedup_factor', 'parallel_efficiency_percent',
      'files_with_violations', 'pattern_matches'
    ];
    
    const filteredEntries = Object.entries(obj || {})
      .filter(([key]) => !keysToFilter.includes(key));
    
    return filteredEntries;
  }
}

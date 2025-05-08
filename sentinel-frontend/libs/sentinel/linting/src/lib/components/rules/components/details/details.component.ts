import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { BrnTabsDirective } from '@spartan-ng/brain/tabs';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import {
  HlmCardContentDirective,
  HlmCardDescriptionDirective,
  HlmCardDirective,
  HlmCardFooterDirective,
  HlmCardHeaderDirective,
  HlmCardTitleDirective,
} from '@spartan-ng/ui-card-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import {
  HlmTabsComponent,
  HlmTabsContentDirective,
  HlmTabsListComponent,
  HlmTabsTriggerDirective,
} from '@spartan-ng/ui-tabs-helm';
import {
  AnalysisRun,
  AnalysisRunChartComponent,
} from './analysis-run-chart/analysis-run-chart.component';
import { PerformanceMetricsComponent } from './performance-metrics/performance-metrics.component';

@Component({
  selector: 'sen-rule-details',
  imports: [
    CommonModule,
    HlmTabsComponent,
    HlmTabsListComponent,
    HlmTabsTriggerDirective,
    HlmTabsContentDirective,

    HlmCardContentDirective,
    HlmCardDescriptionDirective,
    HlmCardDirective,
    HlmCardFooterDirective,
    HlmCardHeaderDirective,
    HlmCardTitleDirective,

    HlmLabelDirective,
    HlmInputDirective,
    HlmButtonDirective,
    AnalysisRunChartComponent,
    PerformanceMetricsComponent,
  ],
  providers: [BrnTabsDirective],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class RuleDetailsComponent {
  ruleId = input.required<string>();

  // Placeholder for your actual data fetching mechanism
  analysisRunsData: AnalysisRun[] = [
    {
      id: 4,
      project_id: 3,
      status: 'completed',
      created_at: '2025-05-06T19:40:30.211Z',
      updated_at: '2025-05-06T19:42:53.475Z',
      duration: 36,
      total_files: 423,
      total_matches: 167,
      rules_matched: 6,
      files_per_second_wall_time: 14298,
      files_per_second_cpu_time: 0,
      avg_time_per_file_ms: 0,
      cumulative_processing_time_ms: 0,
      parallel_cores_used: 4,
      parallel_speedup_factor: 1,
      parallel_efficiency_percent: 71,
      project: {
        id: 3,
        name: 'sentinel',
        repository_url: 'https://github.com/rryter/sentinel',
        created_at: '2025-05-06T18:17:15.352Z',
        updated_at: '2025-05-06T18:17:15.352Z',
      },
    },
    {
      id: 3,
      project_id: 3,
      status: 'completed',
      created_at: '2025-05-06T19:32:50.255Z',
      updated_at: '2025-05-06T19:34:54.639Z',
      duration: 34,
      total_files: 423,
      total_matches: 209,
      rules_matched: 6,
      files_per_second_wall_time: 15184,
      files_per_second_cpu_time: 0,
      avg_time_per_file_ms: 0,
      cumulative_processing_time_ms: 0,
      parallel_cores_used: 4,
      parallel_speedup_factor: 1,
      parallel_efficiency_percent: 90,
      project: {
        id: 3,
        name: 'sentinel',
        repository_url: 'https://github.com/rryter/sentinel',
        created_at: '2025-05-06T18:17:15.352Z',
        updated_at: '2025-05-06T18:17:15.352Z',
      },
    },
    {
      id: 2,
      project_id: 3,
      status: 'completed',
      created_at: '2025-05-06T19:04:11.799Z',
      updated_at: '2025-05-06T19:04:28.175Z',
      duration: 35,
      total_files: 423,
      total_matches: 209,
      rules_matched: 6,
      files_per_second_wall_time: 14505,
      files_per_second_cpu_time: 0,
      avg_time_per_file_ms: 0,
      cumulative_processing_time_ms: 0,
      parallel_cores_used: 4,
      parallel_speedup_factor: 1,
      parallel_efficiency_percent: 73,
      project: {
        id: 3,
        name: 'sentinel',
        repository_url: 'https://github.com/rryter/sentinel',
        created_at: '2025-05-06T18:17:15.352Z',
        updated_at: '2025-05-06T18:17:15.352Z',
      },
    },
    {
      id: 1,
      project_id: 3,
      status: 'completed',
      created_at: '2025-05-06T19:00:25.161Z',
      updated_at: '2025-05-06T19:00:39.125Z',
      duration: 73,
      total_files: 1384,
      total_matches: 1474,
      rules_matched: 3,
      files_per_second_wall_time: 21012,
      files_per_second_cpu_time: 0,
      avg_time_per_file_ms: 0,
      cumulative_processing_time_ms: 0,
      parallel_cores_used: 24,
      parallel_speedup_factor: 1,
      parallel_efficiency_percent: 33,
      project: {
        id: 3,
        name: 'sentinel',
        repository_url: 'https://github.com/rryter/sentinel',
        created_at: '2025-05-06T18:17:15.352Z',
        updated_at: '2025-05-06T18:17:15.352Z',
      },
    },
  ];
}

import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { AnalysisJobsService } from '@sentinel/api';
import { MarkdownRendererComponent } from '@shared/ui-custom';
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
import {
  HlmTabsComponent,
  HlmTabsContentDirective,
  HlmTabsListComponent,
  HlmTabsTriggerDirective,
} from '@spartan-ng/ui-tabs-helm';
import { map } from 'rxjs';
import { AnalysisRunChartComponent } from './analysis-run-chart/analysis-run-chart.component';
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

    HlmButtonDirective,
    AnalysisRunChartComponent,
    PerformanceMetricsComponent,

    MarkdownRendererComponent,
  ],
  providers: [BrnTabsDirective],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class RuleDetailsComponent {
  serv = inject(AnalysisJobsService);
  ruleId = input.required<string>();

  // Placeholder for your actual data fetching mechanism
  analysisRunsData$ = this.serv.apiV1AnalysisJobsGet().pipe(
    map((a) => {
      return a.data;
    }),
  );
}

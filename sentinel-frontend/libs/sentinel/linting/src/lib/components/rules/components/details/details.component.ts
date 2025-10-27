import { BrnTabs } from '@spartan-ng/brain/tabs';
import { HlmButton } from '@spartan-ng/helm/button';
import {
  HlmCardContent,
  HlmCardDescription,
  HlmCard,
  HlmCardFooter,
  HlmCardHeader,
  HlmCardTitle,
} from '@spartan-ng/helm/card';
import {
  HlmTabs,
  HlmTabsContent,
  HlmTabsList,
  HlmTabsTrigger,
} from '@spartan-ng/helm/tabs';
import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { AnalysisJobsService } from '@sentinel/api';
import { MarkdownRendererComponent } from '@shared/ui-custom';

import { map } from 'rxjs';
import { AnalysisRunChartComponent } from './analysis-run-chart/analysis-run-chart.component';
import { PerformanceMetricsComponent } from './performance-metrics/performance-metrics.component';

@Component({
  selector: 'sen-rule-details',
  imports: [
    CommonModule,
    HlmCardContent,
    HlmCard,
    AnalysisRunChartComponent,
    PerformanceMetricsComponent,
    MarkdownRendererComponent,
  ],
  providers: [BrnTabs],
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

import { Route } from '@angular/router';
import { AnalysisJobListComponent } from './components/analysis-job-list/analysis-job-list.component';
import { CreateAnalysisComponent } from './components/create-analysis/create-analysis.component';
import { AnalysisResultsComponent } from './components/analysis-results/analysis-results.component';

export const lintingRoutes: Route[] = [
  {
    path: '',
    component: AnalysisJobListComponent,
  },
  {
    path: 'create',
    component: CreateAnalysisComponent,
  },
  {
    path: ':jobId/results',
    component: AnalysisResultsComponent,
  },
];

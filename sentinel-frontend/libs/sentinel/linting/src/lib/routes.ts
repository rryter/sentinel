import { Route } from '@angular/router';
import { AnalysisJobListComponent } from './components/analysis-job-list/analysis-job-list.component';
import { CreateAnalysisComponent } from './components/create-analysis/create-analysis.component';
import { AnalysisResultsComponent } from './components/analysis-results/analysis-results.component';
import { RuleListComponent } from './components/rules/components/rules/list/rule-list.component';
import { RuleDetailsComponent } from './components/rules/components/rules/details/details.component';
import { UploaderComponent } from './components/rules/components';

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
  {
    path: 'rules',
    component: RuleListComponent,
  },
  {
    path: 'rules/upload',
    component: UploaderComponent,
  },
  {
    path: 'rules/:ruleId',
    component: RuleDetailsComponent,
  },
];

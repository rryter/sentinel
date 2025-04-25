import { Route } from '@angular/router';
import { LintCreateComponent } from './components/lint-create/lint-create.component';
import { LintDetailComponent } from './components/lint-detail/lint-detail.component';
import { LintListComponent } from './components/lint-list/lint-list.component';
import { LintMetricsComponent } from './components/lint-metrics/lint-metrics.component';
import { LintResultsComponent } from './components/lint-results/lint-results.component';
import { UploaderComponent } from './components/rules/components';
import { RuleDetailsComponent } from './components/rules/components/details/details.component';
import { RuleListComponent } from './components/rules/components/list/rule-list.component';

export const lintingRoutes: Route[] = [
  {
    path: '',
    component: LintListComponent,
  },
  {
    path: 'create',
    component: LintCreateComponent,
  },
  {
    path: ':jobId/results',
    component: LintResultsComponent,
  },
  {
    path: ':jobId/results/:violationId',
    component: LintDetailComponent,
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
  {
    path: 'metrics',
    component: LintMetricsComponent,
  },
];

import { Route } from '@angular/router';
import { LintListComponent } from './components/lint-list/lint-list.component';
import { CreateAnalysisComponent } from './components/create-analysis/create-analysis.component';
import { RuleListComponent } from './components/rules/components/rules/list/rule-list.component';
import { RuleDetailsComponent } from './components/rules/components/rules/details/details.component';
import { UploaderComponent } from './components/rules/components';

export const lintingRoutes: Route[] = [
  {
    path: '',
    component: LintListComponent,
  },
  {
    path: 'create',
    component: CreateAnalysisComponent,
  },
  {
    path: ':jobId/results',
    component: LintListComponent,
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

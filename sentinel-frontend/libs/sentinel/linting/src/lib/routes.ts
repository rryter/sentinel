import { Route } from '@angular/router';
import { LintListComponent } from './components/lint-list/lint-list.component';
import { LintCreateComponent } from './components/lint-create/lint-create.component';
import { RuleListComponent } from './components/rules/components/list/rule-list.component';
import { RuleDetailsComponent } from './components/rules/components/details/details.component';
import { UploaderComponent } from './components/rules/components';

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

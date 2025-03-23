import { Route } from '@angular/router';
import { AppComponent } from './app.component';
import { RuleListComponent } from './rules/components/rules/list/rule-list.component';
import { UploaderComponent } from './rules/components/rules/uploader/uploader.component';
import { RuleDetailsComponent } from './rules/components/rules/details/details.component';
import { CreateAnalysisComponent } from './jobs/components/create-analysis/create-analysis.component';
import { ProjectListComponent } from './projects/components/project-list/project-list.component';
import { ProjectDetailComponent } from './projects/components/project-detail/project-detail.component';
import { AnalysisJobListComponent } from './jobs/components/analysis-job-list/analysis-job-list.component';
import { AnalysisResultsComponent } from './jobs/components/analysis-results/analysis-results.component';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'rules',
    pathMatch: 'full',
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
    path: 'analysis',
    component: AnalysisJobListComponent,
  },
  {
    path: 'analysis/create',
    component: CreateAnalysisComponent,
  },
  {
    path: 'analysis/jobs/:jobId/results',
    component: AnalysisResultsComponent,
  },
  {
    path: 'projects',
    component: ProjectListComponent,
  },
  {
    path: 'projects/:id',
    component: ProjectDetailComponent,
  },
];

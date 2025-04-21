import { Route } from '@angular/router';
import { BuildListComponent } from './build/components/build-list/build-list.component';
import { BuildMetricsComponent } from './containers/build-metrics/build-metrics.component';

export const buildRoutes: Route[] = [
  {
    path: '',
    component: BuildListComponent,
  },
  {
    path: 'metrics',
    component: BuildMetricsComponent,
  },
];

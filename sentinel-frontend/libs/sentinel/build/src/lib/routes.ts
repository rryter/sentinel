import { BuildListComponent } from './build/components/build-list/build-list.component';
import { BuildMetricsComponent } from './containers/build-metrics/build-metrics.component';

import { Route } from '@angular/router';

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

import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import { provideApi, withBackendApiConfiguration } from '@sentinel/api';
import { provideIcons } from '@shared/ui-custom';
import { BarController, Colors, Legend } from 'chart.js';
import { provideCharts } from 'ng2-charts';
import { provideMarkdown } from 'ngx-markdown';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideApi(withBackendApiConfiguration()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withViewTransitions(),
    ),
    provideCharts({ registerables: [BarController, Legend, Colors] }),
    provideHttpClient(),
    provideMarkdown(),
    provideIcons(),
  ],
};

import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { provideMarkdown } from 'ngx-markdown';
import { provideIcons } from '@shared/ui-custom';
import { provideCharts } from 'ng2-charts';
import { BarController, Colors, Legend } from 'chart.js';

export const appConfig: ApplicationConfig = {
  providers: [
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

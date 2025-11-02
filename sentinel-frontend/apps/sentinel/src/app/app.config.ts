import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  provideZoneChangeDetection,
  isDevMode,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideRouter,
  withComponentInputBinding,
  withRouterConfig,
  withViewTransitions,
} from '@angular/router';

import { provideIcons } from '@shared/ui-custom';
import { provideComponentInspector } from '@sentinel/component-inspector';
import { BarController, Colors, Legend } from 'chart.js';
import { provideCharts } from 'ng2-charts';
import { provideMarkdown } from 'ngx-markdown';
import { provideApi, withBackendApiConfiguration } from './api.provider';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideApi(withBackendApiConfiguration()),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
      withViewTransitions(),
    ),
    provideCharts({ registerables: [BarController, Legend, Colors] }),
    provideHttpClient(),
    provideMarkdown(),
    provideIcons(),
    provideAnimations(),
    // Component Inspector (dev mode only)
    ...(isDevMode()
      ? provideComponentInspector({
          filter: {
            include: ['app-*', 'lib-*', 'saas-*', 'sen-*', 'sentinel-*'],
            exclude: ['hlm-*', 'brn-*'], // Exclude Spartan UI
          },
          vscode: {
            editorVariant: 'vscode-insiders',
          },
        })
      : []),
  ],
};

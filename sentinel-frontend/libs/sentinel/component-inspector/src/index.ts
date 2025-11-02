// Services
export * from './lib/services/component-inspector.service';
export * from './lib/services/component-detector.service';
export * from './lib/services/overlay-manager.service';
export * from './lib/services/vscode-integration.service';

// Models
export * from './lib/models/component-info.interface';
export * from './lib/models/inspector-config.interface';

// Utils
export * from './lib/utils/component-metadata.util';
export * from './lib/utils/throttle.util';

// Provider function for easy setup
import { APP_INITIALIZER, Provider, inject } from '@angular/core';
import { ComponentInspectorService } from './lib/services/component-inspector.service';
import type { InspectorConfig, DeepPartial } from './lib/models/inspector-config.interface';

/**
 * Provide the component inspector with automatic initialization
 */
export function provideComponentInspector(
  config?: DeepPartial<InspectorConfig>
): Provider[] {
  return [
    {
      provide: APP_INITIALIZER,
      useFactory: () => {
        const inspector = inject(ComponentInspectorService);
        return () => inspector.initialize(config);
      },
      multi: true,
    },
  ];
}

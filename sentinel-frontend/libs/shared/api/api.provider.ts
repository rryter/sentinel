import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { environment } from '../../../apps/sentinel/src/environments/environment';
import { Configuration, ConfigurationParameters } from './configuration';

export function withBackendApiConfiguration(
  configurationParameters: ConfigurationParameters = {},
): Configuration {
  return new Configuration({
    // overrides
    basePath: environment.apiBaseUrl,
    ...configurationParameters,
  });
}

export function provideApi(
  withConfiguration: Configuration = withBackendApiConfiguration(),
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: Configuration, useValue: withConfiguration },
  ]);
}

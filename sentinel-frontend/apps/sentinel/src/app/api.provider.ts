import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { Configuration, ConfigurationParameters } from '@sentinel/api';
import { environment } from '../environments/environment';

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

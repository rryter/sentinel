import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { Configuration, ConfigurationParameters } from './configuration';

export function withBackendApiConfiguration(
  configurationParameters: ConfigurationParameters = {},
): Configuration {
  return new Configuration({
    // overrides
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

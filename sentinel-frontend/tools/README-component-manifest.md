# Component Manifest Auto-Generation

This directory contains tools for automatically generating and maintaining a component manifest during development.

## Overview

The component manifest system automatically tracks all Angular components in the codebase and generates a JSON manifest file that can be used for runtime component inspection, debugging, and tooling.

## Files

### `esbuild-component-manifest-plugin.ts`

An esbuild plugin that automatically regenerates the component manifest on every build, including hot reloads during development.

### `generate-component-manifest.ts`

A standalone script for manually generating the component manifest. This is useful for CI/CD pipelines or one-off generation.

## How It Works

### Automatic Generation (Development)

The `esbuild-component-manifest-plugin` is integrated into the build pipeline via [apps/sentinel/project.json](apps/sentinel/project.json:31-36). It runs on **every build**, including:

- Initial build when starting the dev server
- Hot reloads when you save a file
- Full rebuilds

This ensures that the component manifest is always up-to-date during development.

The plugin is configured in [apps/sentinel/project.json](apps/sentinel/project.json):

```json
{
  "path": "tools/esbuild-component-manifest-plugin.ts",
  "options": {
    "enabled": true,
    "logToConsole": true
  }
}
```

### Available Options

- **`enabled`** (boolean, default: `true`): Enable/disable the plugin
- **`logToConsole`** (boolean, default: `true`): Log generation progress to console
- **`rootDir`** (string, default: `process.cwd()`): Root directory to search for components
- **`outputPath`** (string, default: `apps/sentinel/src/assets/component-manifest.json`): Output path for manifest
- **`componentPattern`** (string, default: `**/*.component.ts`): Glob pattern for component files
- **`ignorePatterns`** (string[], default: `['**/node_modules/**', '**/dist/**', '**/tmp/**']`): Patterns to ignore

## Output Format

The manifest is generated at [apps/sentinel/src/assets/component-manifest.json](apps/sentinel/src/assets/component-manifest.json) with the following structure:

```json
{
  "generated": "2025-11-02T19:23:49.648Z",
  "components": [
    {
      "className": "BuildListComponent",
      "selector": "app-build-list",
      "filePath": "/Users/rryter/Projects/sentinel/...",
      "relativePath": "libs/sentinel/build/src/lib/.../build-list.component.ts",
      "library": "sentinel/build",
      "line": 6
    }
  ]
}
```

Each component entry includes:

- **`className`**: The TypeScript class name
- **`selector`**: The Angular component selector
- **`filePath`**: Absolute path to the component file
- **`relativePath`**: Path relative to the workspace root
- **`library`**: The library/app the component belongs to (e.g., `sentinel/build`, `shared/ui-custom`)
- **`line`**: Line number where the component class is defined

## Usage in Applications

The manifest is served as a static asset and can be loaded at runtime:

```typescript
import { inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const http = inject(HttpClient);
const manifest$ = http.get<ComponentManifest>(
  '/assets/component-manifest.json',
);
```

This is used by the Component Inspector feature to provide real-time component information and navigation.

## Performance

The manifest generation is highly optimized:

- Uses the TypeScript compiler API for accurate AST parsing
- Only processes `*.component.ts` files
- Typically completes in 50-150ms for ~100 components
- Runs in parallel with the main build process

## Troubleshooting

### Manifest not updating

1. Check that the plugin is enabled in [apps/sentinel/project.json](apps/sentinel/project.json)
2. Verify the dev server is running with hot reload enabled
3. Check the console for `[ComponentManifest]` log messages

### Components missing from manifest

1. Ensure component files match the pattern `**/*.component.ts`
2. Verify the component has a `@Component` decorator with a `selector` property
3. Check that the file is not in an ignored directory (node_modules, dist, tmp)

### Build errors after adding plugin

1. Verify TypeScript and glob dependencies are installed: `npm install --save-dev typescript glob`
2. Check that the plugin file exists at `tools/esbuild-component-manifest-plugin.ts`
3. Review the error message for specific configuration issues

## Development

To modify the plugin:

1. Edit [tools/esbuild-component-manifest-plugin.ts](tools/esbuild-component-manifest-plugin.ts)
2. The changes will take effect on the next build
3. For major changes, consider testing with the manual script first:
   ```bash
   npx nx generate-manifest sentinel
   ```

## Related Features

- **Component Inspector**: Uses the manifest for runtime component inspection
- **VSCode Integration**: Opens component files at the correct line number
- **Build Metrics**: Tracks component counts and build performance

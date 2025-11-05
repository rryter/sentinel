# @twygmbh/component-inspector

A zero-config Angular 19+ component inspector that overlays visual borders on rendered components with clickable handles to open source files in your editor.

[![npm version](https://badge.fury.io/js/@twygmbh%2Fcomponent-inspector.svg)](https://www.npmjs.com/package/@twygmbh/component-inspector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **🔍 Zero Configuration**: Automatically detects all Angular components without manual registration
- **⌨️ Keyboard Toggle**: Press `Ctrl+Shift+I` (or `Cmd+Shift+I` on Mac) to enable/disable
- **🎨 Visual Overlays**: Shows colored borders with component name badges
- **📂 Universal Editor Support**: Click badges to open files in VS Code, IntelliJ, Vim, Sublime, and 20+ other editors
- **🔧 Configurable Filtering**: Show only components matching specific patterns
- **⚡ Performance Optimized**: Lazy rendering, throttling, and intersection observers
- **🔄 Auto-Discovery**: Automatically detects dynamically added components
- **🛠️ esbuild Plugin**: Automatic component manifest generation during build
- **💻 Dev Server**: Built-in VS Code opener server for editor integration

## Installation

```bash
npm install @twygmbh/component-inspector --save-dev
```

**Requirements:**
- Angular 19 or higher
- RxJS 7 or 8

## Quick Start

### 1. Add to Application Config

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideComponentInspector } from '@twygmbh/component-inspector';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    provideComponentInspector(), // Zero config setup!
  ],
};
```

### 2. Configure esbuild Plugin

Add the plugin to your esbuild configuration:

```typescript
// project.json or esbuild config
import { componentManifestPlugin } from '@twygmbh/component-inspector/plugin';

export default {
  plugins: [
    componentManifestPlugin({
      rootDir: process.cwd(),
      outputPath: 'apps/your-app/src/assets/component-manifest.json',
    }),
  ],
};
```

### 3. Start Development Server

Start your Angular dev server and the VS Code opener server:

```bash
# Terminal 1: Angular dev server
npm start

# Terminal 2: VS Code opener server
npx vscode-opener
```

Or combine them in your `package.json`:

```json
{
  "scripts": {
    "dev": "concurrently \"npm start\" \"npx vscode-opener\""
  }
}
```

### 4. Use Inspector

- Navigate to your app in the browser
- Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Shift+I` (Mac)
- You should see colored borders around all components
- Click the component badge to open the file in your editor

## Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+I` (or `Cmd+Shift+I`) | Toggle inspector mode on/off |

### Component Overlays

When inspector mode is active:

- **Blue border**: Indicates component boundary
- **Blue badge**: Shows component selector (e.g., `app-project-list`)
- **Tooltip**: Displays file path on hover
- **Click badge**: Opens source file in your editor (auto-detected)

### Filtering Components

By default, the inspector shows:
- ✅ All Sentinel components (`app-*`, `lib-*`, `saas-*`, `sen-*`, `sentinel-*`)
- ❌ Excludes Spartan UI components (`hlm-*`, `brn-*`)

You can customize filters in `app.config.ts`:

```typescript
provideComponentInspector({
  filter: {
    include: ['app-*', 'my-custom-*'],  // Only show these
    exclude: ['app-excluded-*'],        // Hide these
  },
})
```

## Configuration

Full configuration options:

```typescript
interface InspectorConfig {
  enabled: boolean;

  shortcut: {
    key: string;           // Default: 'I'
    ctrl?: boolean;        // Default: true
    shift?: boolean;       // Default: true
    alt?: boolean;
    meta?: boolean;
  };

  overlay: {
    borderColor: string;        // Default: 'rgb(104, 182, 255)'
    backgroundColor: string;    // Default: 'rgba(104, 182, 255, 0.15)'
    borderWidth: number;        // Default: 2
    zIndex: number;            // Default: 2147483647
  };

  filter: {
    include?: string[];        // Glob patterns
    exclude?: string[];        // Glob patterns
    hideStandalone?: boolean;  // Hide standalone components
  };

  performance: {
    throttleMs: number;              // Default: 200
    debounceMs: number;              // Default: 150
    useLazyRendering: boolean;       // Default: true
    maxVisibleOverlays: number;      // Default: 100
  };

  vscode: {
    enabled: boolean;                // Default: true
    backendUrl: string;              // Default: 'http://localhost:3001/api/dev/editor'
    useFallbackProtocol: boolean;    // Default: true
  };
}
```

### Example Custom Configuration

```typescript
// app.config.ts
provideComponentInspector({
  shortcut: {
    key: 'D',
    ctrl: true,
    shift: true,
  },
  overlay: {
    borderColor: 'rgb(255, 100, 100)',
    backgroundColor: 'rgba(255, 100, 100, 0.1)',
  },
  filter: {
    include: ['app-*'],
    exclude: ['app-test-*'],
  },
})
```

### Plugin Configuration

The esbuild plugin accepts these options:

```typescript
interface PluginOptions {
  enabled?: boolean;           // Default: true
  logToConsole?: boolean;      // Default: true
  rootDir?: string;            // Default: process.cwd()
  outputPath?: string;         // Default: apps/sentinel/src/assets/component-manifest.json
  componentPattern?: string;   // Default: **/*.component.ts
  ignorePatterns?: string[];   // Default: [**/node_modules/**, **/dist/**, **/tmp/**]
}
```

Example:

```typescript
componentManifestPlugin({
  rootDir: process.cwd(),
  outputPath: 'src/assets/component-manifest.json',
  componentPattern: '**/*.component.ts',
  ignorePatterns: ['**/node_modules/**', '**/dist/**'],
  logToConsole: true,
})
```

## How It Works

### 1. Automatic Manifest Generation

The manifest generation happens automatically via the included esbuild plugin:
- **Runs on every build**: Initial build, hot reloads, and full rebuilds
- **TypeScript AST parsing**: Uses TypeScript Compiler API to parse `*.component.ts` files
- **Metadata extraction**: Extracts `@Component` decorator metadata (selector, class name, file paths)
- **JSON output**: Generates manifest at your configured output path
- **Performance**: Typically completes in 50-150ms for ~100 components

The plugin integrates seamlessly with your esbuild configuration and runs in the background.

### 2. Runtime Component Detection

The `ComponentDetectorService`:
- Traverses DOM looking for elements with `__ngContext__` property (Angular Ivy)
- Uses `ng.getComponent()` to extract component instances
- Watches for dynamically added components via MutationObserver
- Enriches with file path data from manifest

### 3. Visual Overlay System

The `OverlayManagerService`:
- Creates absolutely positioned overlay elements
- Uses `getBoundingClientRect()` for positioning
- Smart badge placement (viewport-aware)
- Scroll/resize handlers for repositioning
- IntersectionObserver for lazy rendering

### 4. Editor Integration

Powered by [launch-editor](https://github.com/yyx990803/launch-editor), the same library used in React DevTools.

Two methods supported:

**Method 1: Backend API (Recommended)**
- Automatically detects running editor from process list
- Supports 23+ editors: VS Code, IntelliJ IDEA, WebStorm, PhpStorm, Vim, Emacs, Sublime Text, Atom, and more
- Falls back to `$EDITOR` environment variable
- More reliable, supports line numbers
- Requires server running

**Method 2: vscode:// Protocol (Fallback)**
- Uses `vscode://file/` URL scheme
- Works without server (VS Code only)
- Limited line number support

## Package Structure

The package includes three main parts:

### 1. Angular Library (Main Export)

```typescript
import { provideComponentInspector } from '@twygmbh/component-inspector';
```

Includes:
- Services: `ComponentInspectorService`, `ComponentDetectorService`, `OverlayManagerService`, `VscodeIntegrationService`
- Models: `ComponentInfo`, `InspectorConfig`
- Utilities: Component metadata extraction, throttle/debounce
- Components: Config panel UI

### 2. esbuild Plugin

```typescript
import { componentManifestPlugin } from '@twygmbh/component-inspector/plugin';
```

Generates component manifests during build by:
- Parsing TypeScript AST to find `@Component` decorators
- Extracting metadata (selector, class name, file paths)
- Writing JSON manifest to assets directory

### 3. CLI Tool

```bash
npx vscode-opener
```

Runs a local HTTP server (port 3001) that:
- Accepts file path requests from the browser
- Auto-detects your running editor
- Opens files at specific line numbers
- Supports 23+ editors

### Manifest Generation

The manifest is **automatically regenerated** by the esbuild plugin on every build and hot reload. You don't need to manually regenerate it!

The plugin runs during your build process and:
- Scans all `*.component.ts` files
- Extracts `@Component` decorator metadata
- Generates a JSON manifest in your assets directory
- Typically completes in 50-150ms for ~100 components

### Testing

The inspector only works in development mode (`isDevMode() === true`).

To test:
1. Start your Angular dev server
2. Start the VS Code opener: `npx vscode-opener`
3. Open browser DevTools console to see inspector logs
4. Press `Ctrl+Shift+I` to toggle inspector mode

## Troubleshooting

### Inspector not activating

- **Check console**: Look for `[ComponentInspector] Initialized successfully`
- **Dev mode**: Inspector only works when `isDevMode() === true`
- **Manifest**: Ensure manifest was generated by the esbuild plugin (check your assets directory for `component-manifest.json`)
- **Provider**: Verify you added `provideComponentInspector()` to your app config

### Overlays not appearing

- **Filter config**: Check that your components match the `include` patterns
- **Console errors**: Look for errors in browser DevTools
- **Component detection**: Verify components have `__ngContext__` property (development builds only)

### Editor not opening files

- **Server running**: Ensure `npm run vscode-opener` is running (or use `npm run dev`)
- **Port**: Check that port 3001 is not blocked
- **Editor running**: Ensure your code editor is open (auto-detected from processes)
- **Manual override**: Set `LAUNCH_EDITOR` environment variable (e.g., `LAUNCH_EDITOR=code` or `LAUNCH_EDITOR=webstorm`)
- **Fallback**: If server fails, inspector tries `vscode://` protocol (VS Code only)

### Performance issues

- **Too many components**: Reduce `filter.include` patterns
- **Adjust throttling**: Increase `performance.throttleMs`
- **Disable lazy rendering**: Set `performance.useLazyRendering: false`

## Limitations

- **Development mode only**: Relies on `__ngContext__` which is removed in production
- **File paths**: Requires build-time manifest generation (handled automatically)

## Future Enhancements

- [x] Auto-regenerate manifest on file changes (watch mode) ✅ **Implemented via esbuild plugin**
- [x] Support for other editors (WebStorm, Sublime, etc.) ✅ **Implemented via launch-editor**
- [ ] Component hierarchy visualization
- [ ] Input/output metadata display
- [ ] Performance metrics per component
- [ ] Export component tree as JSON
- [ ] Dark mode overlay theme

## License

MIT

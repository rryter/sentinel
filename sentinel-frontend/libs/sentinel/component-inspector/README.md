# Component Inspector

A zero-config Angular component inspector that overlays visual borders on rendered components with clickable handles to open source files in VS Code.

## Features

- **🔍 Zero Configuration**: Automatically detects all Angular components without manual registration
- **⌨️ Keyboard Toggle**: Press `Ctrl+Shift+I` (or `Cmd+Shift+I` on Mac) to enable/disable
- **🎨 Visual Overlays**: Shows colored borders with component name badges
- **📂 VS Code Integration**: Click badges to open source files directly in VS Code
- **🔧 Configurable Filtering**: Show only components matching specific patterns
- **⚡ Performance Optimized**: Lazy rendering, throttling, and intersection observers
- **🔄 Auto-Discovery**: Automatically detects dynamically added components

## Quick Start

### 1. Component Manifest (Auto-Generated)

The component manifest is **automatically generated** on every build and hot reload during development. No manual action needed!

The manifest maps component classes to file paths and is regenerated automatically at `apps/sentinel/src/assets/component-manifest.json`.

You can also manually trigger generation if needed:
```bash
npx nx run sentinel:generate-manifest
```

### 2. Start VS Code Opener Server (Optional but Recommended)

In a separate terminal, run:

```bash
npm run vscode-opener
```

This starts a Node.js server on port 3001 that handles opening files in VS Code.

### 3. Run the App

```bash
npm start
```

The component manifest will be automatically regenerated on every hot reload as you develop.

### 4. Toggle Inspector

- Navigate to your app in the browser
- Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Shift+I` (Mac)
- You should see colored borders around all components
- Click the component badge to open the file in VS Code

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
- **Click badge**: Opens source file in VS Code

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
// apps/sentinel/src/app/app.config.ts
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

## How It Works

### 1. Automatic Manifest Generation

The manifest generation happens automatically via an esbuild plugin (`esbuild-component-manifest-plugin.ts`):
- **Runs on every build**: Initial build, hot reloads, and full rebuilds
- **TypeScript AST parsing**: Uses TypeScript Compiler API to parse `*.component.ts` files
- **Metadata extraction**: Extracts `@Component` decorator metadata (selector, class name, file paths)
- **JSON output**: Generates manifest at `apps/sentinel/src/assets/component-manifest.json`
- **Performance**: Typically completes in 50-150ms for ~100 components

The plugin is configured in [apps/sentinel/project.json](../../apps/sentinel/project.json) and runs seamlessly in the background.

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

### 4. VS Code Integration

Two methods supported:

**Method 1: Backend API (Recommended)**
- Node.js server executes `code --goto filepath:line`
- More reliable, supports line numbers
- Requires server running

**Method 2: vscode:// Protocol (Fallback)**
- Uses `vscode://file/` URL scheme
- Works without server
- Limited line number support

## Development

### Project Structure

```
libs/sentinel/component-inspector/
├── src/
│   ├── lib/
│   │   ├── services/
│   │   │   ├── component-inspector.service.ts      # Main orchestrator
│   │   │   ├── component-detector.service.ts       # DOM scanning
│   │   │   ├── overlay-manager.service.ts          # Visual overlays
│   │   │   └── vscode-integration.service.ts       # VS Code API
│   │   ├── models/
│   │   │   ├── component-info.interface.ts
│   │   │   └── inspector-config.interface.ts
│   │   └── utils/
│   │       ├── component-metadata.util.ts
│   │       └── throttle.util.ts
│   └── index.ts
└── README.md

tools/
├── generate-component-manifest.ts    # Build-time manifest generator
└── vscode-opener-server.js          # Node.js backend for VS Code
```

### Manifest Generation

The manifest is **automatically regenerated** on every build and hot reload. You don't need to manually regenerate it!

If you need to manually trigger generation (e.g., in CI/CD):

```bash
npx nx run sentinel:generate-manifest
```

For more details, see [tools/README-component-manifest.md](../../../tools/README-component-manifest.md).

### Testing

The inspector only works in development mode (`isDevMode() === true`).

To test:
1. Start the app: `npm start`
2. Start VS Code opener: `npm run vscode-opener`
3. Open browser DevTools console to see inspector logs
4. Press `Ctrl+Shift+I` to toggle

## Troubleshooting

### Inspector not activating

- **Check console**: Look for `[ComponentInspector] Initialized successfully`
- **Dev mode**: Inspector only works when `isDevMode() === true`
- **Manifest**: Ensure manifest was generated (check `apps/sentinel/src/assets/component-manifest.json`)

### Overlays not appearing

- **Filter config**: Check that your components match the `include` patterns
- **Console errors**: Look for errors in browser DevTools
- **Component detection**: Verify components have `__ngContext__` property (development builds only)

### VS Code not opening files

- **Server running**: Ensure `npm run vscode-opener` is running
- **Port**: Check that port 3001 is not blocked
- **VS Code installed**: Verify `code` command is available in terminal
- **Fallback**: If server fails, inspector tries `vscode://` protocol

### Performance issues

- **Too many components**: Reduce `filter.include` patterns
- **Adjust throttling**: Increase `performance.throttleMs`
- **Disable lazy rendering**: Set `performance.useLazyRendering: false`

## Limitations

- **Development mode only**: Relies on `__ngContext__` which is removed in production
- **File paths**: Requires build-time manifest generation (handled automatically)
- **VS Code only**: Currently only supports VS Code (not other editors)

## Future Enhancements

- [x] Auto-regenerate manifest on file changes (watch mode) ✅ **Implemented via esbuild plugin**
- [ ] Support for other editors (WebStorm, Sublime, etc.)
- [ ] Component hierarchy visualization
- [ ] Input/output metadata display
- [ ] Performance metrics per component
- [ ] Export component tree as JSON
- [ ] Dark mode overlay theme

## License

MIT

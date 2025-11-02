# Development Environment Setup

This guide explains the streamlined development workflow for Sentinel Frontend.

## Quick Start

### One Command to Rule Them All

```bash
npm run dev
```

This single command automatically starts:

1. **Angular Dev Server** (port 4200)
   - Hot reload enabled
   - Live component manifest regeneration
   - Build metrics tracking

2. **VS Code Opener Server** (port 3001)
   - Click-to-open component files
   - Direct line number navigation
   - No manual setup required

3. **Component Manifest Auto-Generation**
   - Runs on every build
   - Updates on every hot reload
   - Zero manual intervention

## What You Get

### Automatic Features

✅ **Hot Reload** - Save a file, see changes instantly
✅ **Component Manifest** - Always up-to-date, regenerated automatically
✅ **VS Code Integration** - Click component badges to open files
✅ **Component Inspector** - Press `Ctrl+Shift+I` to visualize components
✅ **Build Metrics** - Performance tracking for every build

### Services Running in Parallel

| Service | Port | Description |
|---------|------|-------------|
| Angular Dev Server | 4200 | Frontend application |
| VS Code Opener | 3001 | File opening API |

## Alternative Commands

If you need to run services individually:

### Dev Server Only
```bash
npm start
# or
npx nx serve sentinel
```

Runs the Angular dev server without the VS Code opener.

### VS Code Opener Only
```bash
npm run vscode-opener
# or
npx nx vscode-opener sentinel
```

Runs the VS Code opener server on port 3001.

### Manual Manifest Generation
```bash
npx nx generate-manifest sentinel
```

Manually trigger component manifest generation (rarely needed since it auto-generates).

## How It Works

### Nx Parallel Execution

The `dev` target in [apps/sentinel/project.json](apps/sentinel/project.json:145-155) uses Nx's `run-commands` executor with parallel execution:

```json
{
  "dev": {
    "executor": "nx:run-commands",
    "options": {
      "commands": [
        "npx nx serve sentinel",
        "npx nx vscode-opener sentinel"
      ],
      "parallel": true,
      "color": true
    }
  }
}
```

Both commands run simultaneously, giving you a complete development environment with one command.

### Component Manifest Plugin

An esbuild plugin ([tools/esbuild-component-manifest-plugin.ts](esbuild-component-manifest-plugin.ts)) automatically regenerates the component manifest on every build:

```typescript
build.onStart(async () => {
  await generateComponentManifest(options);
});
```

This ensures the manifest is always synchronized with your components.

## Component Inspector Usage

Once the dev environment is running:

1. **Open your browser** to `http://localhost:4200`
2. **Press `Ctrl+Shift+I`** (or `Cmd+Shift+I` on Mac)
3. **See colored borders** around all components
4. **Click component badges** to open files in VS Code

See [libs/sentinel/component-inspector/README.md](../libs/sentinel/component-inspector/README.md) for detailed usage.

## Stopping Services

Press `Ctrl+C` in the terminal to stop all services. The parallel execution will gracefully shut down both the dev server and VS Code opener.

## Troubleshooting

### Port Already in Use

If port 4200 or 3001 is already in use:

```bash
# Find process using port
lsof -i :4200
lsof -i :3001

# Kill the process
kill <PID>
```

### VS Code Opener Not Working

1. Verify the server is running: `curl http://localhost:3001/api/dev/editor`
2. Check that `code` command is available: `which code`
3. Install VS Code CLI if missing: Open VS Code → Command Palette → "Shell Command: Install 'code' command in PATH"

### Component Manifest Not Updating

The manifest auto-generates on every build. If it's not updating:

1. Check console output for `[ComponentManifest]` logs
2. Verify the plugin is enabled in [apps/sentinel/project.json](apps/sentinel/project.json:31-36)
3. Try a manual generation: `npx nx generate-manifest sentinel`

### Build Errors

If you encounter build errors:

1. Clear Nx cache: `npx nx reset`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Check for TypeScript errors: `npx tsc --noEmit`

## Configuration

### Disable Auto-Manifest Generation

Edit [apps/sentinel/project.json](apps/sentinel/project.json:31-36):

```json
{
  "path": "tools/esbuild-component-manifest-plugin.ts",
  "options": {
    "enabled": false  // Disable the plugin
  }
}
```

### Change VS Code Opener Port

Set environment variable before running:

```bash
VSCODE_OPENER_PORT=3002 npm run dev
```

Or edit [tools/vscode-opener-server.js](vscode-opener-server.js:13):

```javascript
const PORT = process.env.VSCODE_OPENER_PORT || 3002;
```

### Customize Component Inspector

Edit [apps/sentinel/src/app/app.config.ts](../apps/sentinel/src/app/app.config.ts):

```typescript
provideComponentInspector({
  shortcut: { key: 'D', ctrl: true, shift: true },
  overlay: { borderColor: 'rgb(255, 100, 100)' },
  filter: { include: ['app-*'], exclude: ['app-test-*'] }
})
```

## Related Documentation

- [Component Inspector README](../libs/sentinel/component-inspector/README.md) - Full component inspector guide
- [Component Manifest README](README-component-manifest.md) - Manifest generation details
- [CLAUDE.md](../../CLAUDE.md) - Project-wide development commands

## Summary

**Before:** Multiple terminal windows, manual manifest generation, separate server startup
**Now:** One command (`npm run dev`), everything automatic, instant component inspection

Enjoy the streamlined development experience! 🚀

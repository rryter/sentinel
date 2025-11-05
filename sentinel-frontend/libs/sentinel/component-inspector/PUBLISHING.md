# Publishing Guide for @twygmbh/component-inspector

## Current Status

All files have been prepared for npm publishing:

- ✅ Package structure reorganized (plugin and bin moved to src/)
- ✅ package.json created with @twygmbh scope
- ✅ ng-package.json configured for Angular library build
- ✅ Secondary entry point configured for plugin
- ✅ Build target added to project.json
- ✅ LICENSE (MIT) created
- ✅ CHANGELOG.md created
- ✅ .npmignore configured
- ✅ README.md updated with npm installation instructions

## Prerequisites

The library requires a `.browserslistrc` file (already created) for ng-packagr to work properly.

If you encounter ng-packagr module resolution issues, try:

1. **Clear and reinstall dependencies:**
   ```bash
   cd sentinel-frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Verify ng-packagr version** is compatible with Angular 19

## Building the Library

Once the ng-packagr issue is resolved:

```bash
cd sentinel-frontend
npx nx build component-inspector
```

This will output to: `dist/libs/sentinel/component-inspector/`

## Testing the Build Locally

After building successfully:

```bash
cd dist/libs/sentinel/component-inspector
npm pack
```

This creates a `.tgz` file you can install in a test project:

```bash
cd /path/to/test-project
npm install /path/to/twygmbh-component-inspector-0.1.0.tgz
```

## Publishing to npm

### Prerequisites

1. **Create npm account** (if you don't have one):
   ```bash
   npm adduser
   ```

2. **Create @twygmbh organization** on npmjs.com:
   - Go to https://www.npmjs.com/org/create
   - Create organization: `twygmbh`
   - Add reto@twy.gmbh as owner/member

3. **Login to npm**:
   ```bash
   npm login
   ```

### Publish Steps

1. **Build the library**:
   ```bash
   npx nx build component-inspector
   ```

2. **Navigate to dist**:
   ```bash
   cd dist/libs/sentinel/component-inspector
   ```

3. **Verify contents**:
   ```bash
   npm pack --dry-run
   ```

   Should include:
   - Angular library (fesm2022/, esm2022/)
   - Plugin code (plugin/)
   - CLI tool (bin/)
   - package.json, README.md, LICENSE, CHANGELOG.md
   - TypeScript declarations (*.d.ts)

4. **Publish**:
   ```bash
   npm publish --access public
   ```

5. **Tag release**:
   ```bash
   cd /home/rryter/projects/sentinel
   git add -A
   git commit -m "Prepare @twygmbh/component-inspector v0.1.0 for npm publishing"
   git tag component-inspector-v0.1.0
   git push origin main --tags
   ```

## Post-Publishing

1. **Verify on npm**:
   - Visit: https://www.npmjs.com/package/@twygmbh/component-inspector
   - Check that all files are present
   - Verify README renders correctly

2. **Test installation**:
   ```bash
   npm install @twygmbh/component-inspector
   ```

3. **Create GitHub release**:
   - Go to GitHub repository
   - Create release from tag `component-inspector-v0.1.0`
   - Copy content from CHANGELOG.md

4. **Update main project**:
   - Update sentinel app to use published package instead of local library
   - Update import paths from local to @twygmbh scope

## Package Contents

The published package includes three main parts:

### 1. Angular Library (main export)
```typescript
import { provideComponentInspector } from '@twygmbh/component-inspector';
```

### 2. esbuild Plugin (secondary entry point)
```typescript
import { componentManifestPlugin } from '@twygmbh/component-inspector/plugin';
```

### 3. CLI Tool
```bash
npx vscode-opener
```

## Troubleshooting

### Build fails with module errors

Try clearing node_modules and reinstalling:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Secondary entry point not working

The plugin secondary entry point is configured at:
- `libs/sentinel/component-inspector/plugin/package.json`

Make sure this file exists and ng-packagr processes it.

### Published package missing files

Check `.npmignore` - make sure you're not excluding necessary files.

### npm publish fails with 403

- Make sure you're logged in: `npm whoami`
- Make sure you're a member of @twygmbh organization
- Verify package name isn't already taken

## Future Updates

For subsequent releases:

1. Update version in `package.json`
2. Update `CHANGELOG.md` with new changes
3. Build and test
4. Publish with `npm publish`
5. Tag release: `git tag component-inspector-vX.Y.Z`
6. Push tags: `git push --tags`

## Semantic Versioning

Follow semver:
- `0.1.x` - Patch: Bug fixes
- `0.x.0` - Minor: New features (backwards compatible)
- `x.0.0` - Major: Breaking changes

Current version: `0.1.0` (initial release)

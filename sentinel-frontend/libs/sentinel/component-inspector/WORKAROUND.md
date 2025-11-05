# Build Workaround for ng-packagr Issues

## Current Issue

The workspace has an ng-packagr v21 (next) dependency issue with ES module resolution:

```
require() of ES Module .../find-cache-directory/index.js not supported
```

This affects ALL libraries in the workspace and is a known issue with ng-packagr@21.0.0-next.x and certain Node.js/dependency combinations.

## Solutions (in order of preference)

### Option 1: Downgrade ng-packagr (Recommended)

Use a stable version of ng-packagr instead of the alpha/next version:

```bash
cd sentinel-frontend
npm install ng-packagr@^18.2.0 --save-dev
npx nx build component-inspector
```

### Option 2: Use Different Build Tool

Instead of ng-packagr, use a custom TypeScript + Rollup/esbuild build:

Create `libs/sentinel/component-inspector/build.mjs`:

```javascript
import { build } from 'esbuild';
import { glob } from 'glob';

const files = await glob('src/**/*.ts', {
  ignore: ['**/*.spec.ts', '**/test-setup.ts']
});

await build({
  entryPoints: files,
  outdir: '../../../dist/libs/sentinel/component-inspector',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  bundle: false,
  sourcemap: true,
  external: ['@angular/*', 'rxjs', 'glob', 'launch-editor'],
});

console.log('Build complete!');
```

Run with: `node libs/sentinel/component-inspector/build.mjs`

### Option 3: Patch ng-packagr dependency

The issue is in `find-cache-directory`. Patch it:

```bash
cd sentinel-frontend
npm install patch-package --save-dev
```

Create patch for find-cache-directory or force CommonJS resolution.

### Option 4: Use Node.js with --experimental-require-module

```bash
NODE_OPTIONS="--experimental-require-module" npx nx build component-inspector
```

Note: May not work with all Node versions.

### Option 5: Wait for ng-packagr fix

The issue should be resolved in future ng-packagr releases. Check:
- https://github.com/ng-packagr/ng-packagr/issues
- Angular 21 stable release

## Temporary Manual Publishing

Until the build works, you can manually create a publishable structure:

1. **Copy source files:**
   ```bash
   mkdir -p manual-dist
   cp -r src/lib manual-dist/
   cp -r src/plugin manual-dist/
   cp -r src/bin manual-dist/
   cp src/index.ts manual-dist/
   ```

2. **Compile TypeScript:**
   ```bash
   cd libs/sentinel/component-inspector
   npx tsc --project tsconfig.lib.json --outDir manual-dist
   ```

3. **Copy package files:**
   ```bash
   cp package.json manual-dist/
   cp README.md manual-dist/
   cp LICENSE manual-dist/
   cp CHANGELOG.md manual-dist/
   ```

4. **Publish:**
   ```bash
   cd manual-dist
   npm publish --access public
   ```

## Recommendation

**Try Option 1 first** - downgrading ng-packagr to a stable version is the quickest fix and won't affect your package configuration.

```bash
npm install ng-packagr@^18.2.0 --save-dev
```

Then rebuild:
```bash
npx nx build component-inspector
```

All your package configuration is correct - you just need to resolve the ng-packagr environment issue.

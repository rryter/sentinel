import { Plugin } from 'esbuild';
import * as fs from 'fs';
import { glob } from 'glob';
import * as path from 'path';
import * as ts from 'typescript';

interface ComponentMetadata {
  className: string;
  selector: string;
  filePath: string;
  relativePath: string;
  library?: string;
  line: number;
}

interface ComponentManifest {
  generated: string;
  components: ComponentMetadata[];
}

interface PluginOptions {
  // Whether to enable the plugin (default: true)
  enabled?: boolean;

  // Whether to log to console (default: true)
  logToConsole?: boolean;

  // Root directory to search for components (default: process.cwd())
  rootDir?: string;

  // Output path for the manifest (default: apps/sentinel/src/assets/component-manifest.json)
  outputPath?: string;

  // Glob pattern for component files (default: **/*.component.ts)
  componentPattern?: string;

  // Glob patterns to ignore (default: [node_modules, dist, tmp])
  ignorePatterns?: string[];
}

/**
 * Parse a component file and extract metadata
 */
function parseComponentFile(
  filePath: string,
  rootDir: string,
): ComponentMetadata | null {
  try {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true,
    );

    let componentMetadata: ComponentMetadata | null = null;

    // Traverse AST to find @Component decorators
    function visit(node: ts.Node) {
      if (ts.isClassDeclaration(node) && node.modifiers) {
        const decorator = findComponentDecorator(node.modifiers);

        if (decorator && ts.isCallExpression(decorator.expression)) {
          const args = decorator.expression.arguments;
          if (args && args.length > 0) {
            const metadata = args[0];
            if (ts.isObjectLiteralExpression(metadata)) {
              const selector = extractSelectorFromMetadata(metadata);
              const className = node.name?.text || 'Unknown';

              if (selector) {
                const relativePath = path.relative(rootDir, filePath);
                const library = extractLibraryName(relativePath);
                // Get line after decorator ends (the "export class ComponentName {" line)
                const decoratorEndPos = decorator.getEnd();
                const decoratorEndLine =
                  sourceFile.getLineAndCharacterOfPosition(
                    decoratorEndPos,
                  ).line;
                const line = decoratorEndLine + 2;

                componentMetadata = {
                  className,
                  selector,
                  filePath,
                  relativePath,
                  library,
                  line,
                };
              }
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return componentMetadata;
  } catch (error) {
    console.error(`[ComponentManifest] Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Find @Component decorator in class modifiers
 */
function findComponentDecorator(
  modifiers: ts.NodeArray<ts.ModifierLike>,
): ts.Decorator | undefined {
  return modifiers.find((modifier): modifier is ts.Decorator => {
    if (!ts.isDecorator(modifier)) return false;

    const expression = modifier.expression;
    if (ts.isCallExpression(expression)) {
      const identifier = expression.expression;
      return ts.isIdentifier(identifier) && identifier.text === 'Component';
    }
    return false;
  });
}

/**
 * Extract selector from @Component metadata object
 */
function extractSelectorFromMetadata(
  metadata: ts.ObjectLiteralExpression,
): string | null {
  const selectorProp = metadata.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === 'selector',
  );

  if (selectorProp && ts.isStringLiteral(selectorProp.initializer)) {
    return selectorProp.initializer.text;
  }

  return null;
}

/**
 * Extract library name from relative path
 * e.g., "libs/sentinel/linting/..." -> "sentinel/linting"
 */
function extractLibraryName(relativePath: string): string | undefined {
  const match = relativePath.match(/^libs\/([^/]+\/[^/]+)\//);
  if (match) {
    return match[1];
  }

  // Check if in apps directory
  const appMatch = relativePath.match(/^apps\/([^/]+)\//);
  if (appMatch) {
    return `apps/${appMatch[1]}`;
  }

  return undefined;
}

/**
 * Generate component manifest by parsing all *.component.ts files
 */
async function generateComponentManifest(
  options: Required<PluginOptions>,
): Promise<void> {
  const startTime = performance.now();

  if (options.logToConsole) {
    console.log('[ComponentManifest] 🔄 Regenerating component manifest...');
  }

  const componentFiles = await glob(options.componentPattern, {
    cwd: options.rootDir,
    ignore: options.ignorePatterns,
    absolute: true,
  });

  const components: ComponentMetadata[] = [];

  for (const filePath of componentFiles) {
    const componentMetadata = parseComponentFile(filePath, options.rootDir);
    if (componentMetadata) {
      components.push(componentMetadata);
    }
  }

  const manifest: ComponentManifest = {
    generated: new Date().toISOString(),
    components: components.sort((a, b) => a.selector.localeCompare(b.selector)),
  };

  // Ensure assets directory exists
  const assetsDir = path.dirname(options.outputPath);
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  fs.writeFileSync(options.outputPath, JSON.stringify(manifest, null, 2));

  const duration = Math.round(performance.now() - startTime);
  const relativePath = path.relative(options.rootDir, options.outputPath);

  if (options.logToConsole) {
    console.log(
      `[ComponentManifest] ✅ Generated ${components.length} components in ${duration}ms`,
    );
    console.log(`[ComponentManifest] 📄 ${relativePath}`);
  }
}

/**
 * Creates an esbuild plugin that automatically generates the component manifest
 * on every build (including hot reloads)
 */
export const componentManifestPlugin = (
  options: PluginOptions = {},
): Plugin => {
  const {
    enabled = true,
    logToConsole = true,
    rootDir = process.cwd(),
    outputPath = path.join(
      process.cwd(),
      'apps/sentinel/src/assets/component-manifest.json',
    ),
    componentPattern = '**/*.component.ts',
    ignorePatterns = ['**/node_modules/**', '**/dist/**', '**/tmp/**'],
  } = options;

  // Skip if disabled
  if (!enabled) {
    return {
      name: 'component-manifest-plugin',
      setup() {
        // No setup needed if disabled
      },
    };
  }

  const fullOptions: Required<PluginOptions> = {
    enabled,
    logToConsole,
    rootDir,
    outputPath,
    componentPattern,
    ignorePatterns,
  };

  return {
    name: 'component-manifest-plugin',
    setup(build) {
      // Generate manifest on every build start
      build.onStart(async () => {
        try {
          await generateComponentManifest(fullOptions);
        } catch (error) {
          console.error(
            '[ComponentManifest] ❌ Error generating manifest:',
            error,
          );
          // Don't fail the build, just log the error
        }
      });
    },
  };
};

// Default export for compatibility
export default function (options: PluginOptions = {}): Plugin {
  return componentManifestPlugin(options);
}

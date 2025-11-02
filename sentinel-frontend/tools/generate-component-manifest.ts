#!/usr/bin/env ts-node

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Get directory path (works in both CommonJS and when executed)
const __dirname = process.cwd();

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

/**
 * Generate component manifest by parsing all *.component.ts files
 */
async function generateComponentManifest() {
  console.log('[ComponentManifest] Starting generation...\n');

  const rootDir = __dirname;
  const componentFiles = await glob('**/*.component.ts', {
    cwd: rootDir,
    ignore: ['**/node_modules/**', '**/dist/**', '**/tmp/**'],
    absolute: true,
  });

  console.log(`[ComponentManifest] Found ${componentFiles.length} component files\n`);

  const components: ComponentMetadata[] = [];

  for (const filePath of componentFiles) {
    const componentMetadata = parseComponentFile(filePath, rootDir);
    if (componentMetadata) {
      components.push(componentMetadata);
      console.log(
        `  ✓ ${componentMetadata.className} (${componentMetadata.selector})`
      );
    }
  }

  const manifest: ComponentManifest = {
    generated: new Date().toISOString(),
    components: components.sort((a, b) => a.selector.localeCompare(b.selector)),
  };

  const outputPath = path.join(
    rootDir,
    'apps/sentinel/src/assets/component-manifest.json'
  );

  // Ensure assets directory exists
  const assetsDir = path.dirname(outputPath);
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));

  console.log(`\n[ComponentManifest] ✅ Generated manifest with ${components.length} components`);
  console.log(`[ComponentManifest] 📄 Output: ${path.relative(rootDir, outputPath)}\n`);
}

/**
 * Parse a component file and extract metadata
 */
function parseComponentFile(
  filePath: string,
  rootDir: string
): ComponentMetadata | null {
  try {
    const sourceCode = fs.readFileSync(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      ts.ScriptTarget.Latest,
      true
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
                const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

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
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

/**
 * Find @Component decorator in class modifiers
 */
function findComponentDecorator(
  modifiers: ts.NodeArray<ts.ModifierLike>
): ts.Decorator | undefined {
  return modifiers.find((modifier): modifier is ts.Decorator => {
    if (!ts.isDecorator(modifier)) return false;

    const expression = modifier.expression;
    if (ts.isCallExpression(expression)) {
      const identifier = expression.expression;
      return ts.isIdentifier(identifier) && identifier.text === 'Component';
    }
    return false;
  }) as ts.Decorator | undefined;
}

/**
 * Extract selector from @Component metadata object
 */
function extractSelectorFromMetadata(
  metadata: ts.ObjectLiteralExpression
): string | null {
  const selectorProp = metadata.properties.find(
    (prop): prop is ts.PropertyAssignment =>
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      prop.name.text === 'selector'
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

// Run the script
generateComponentManifest().catch((error) => {
  console.error('[ComponentManifest] ❌ Error generating manifest:', error);
  process.exit(1);
});

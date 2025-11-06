"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.componentManifestPlugin = void 0;
exports.default = default_1;
const fs = __importStar(require("fs"));
const glob_1 = require("glob");
const path = __importStar(require("path"));
const ts = __importStar(require("typescript"));
/**
 * Parse a component file and extract metadata
 */
function parseComponentFile(filePath, rootDir) {
    try {
        const sourceCode = fs.readFileSync(filePath, 'utf-8');
        const sourceFile = ts.createSourceFile(filePath, sourceCode, ts.ScriptTarget.Latest, true);
        let componentMetadata = null;
        // Traverse AST to find @Component decorators
        function visit(node) {
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
                                const decoratorEndLine = sourceFile.getLineAndCharacterOfPosition(decoratorEndPos).line;
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
    }
    catch (error) {
        console.error(`[ComponentManifest] Error parsing ${filePath}:`, error);
        return null;
    }
}
/**
 * Find @Component decorator in class modifiers
 */
function findComponentDecorator(modifiers) {
    return modifiers.find((modifier) => {
        if (!ts.isDecorator(modifier))
            return false;
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
function extractSelectorFromMetadata(metadata) {
    const selectorProp = metadata.properties.find((prop) => ts.isPropertyAssignment(prop) &&
        ts.isIdentifier(prop.name) &&
        prop.name.text === 'selector');
    if (selectorProp && ts.isStringLiteral(selectorProp.initializer)) {
        return selectorProp.initializer.text;
    }
    return null;
}
/**
 * Extract library name from relative path
 * e.g., "libs/sentinel/linting/..." -> "sentinel/linting"
 */
function extractLibraryName(relativePath) {
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
async function generateComponentManifest(options) {
    const startTime = performance.now();
    if (options.logToConsole) {
        console.log('[ComponentManifest] 🔄 Regenerating component manifest...');
    }
    const componentFiles = await (0, glob_1.glob)(options.componentPattern, {
        cwd: options.rootDir,
        ignore: options.ignorePatterns,
        absolute: true,
    });
    const components = [];
    for (const filePath of componentFiles) {
        const componentMetadata = parseComponentFile(filePath, options.rootDir);
        if (componentMetadata) {
            components.push(componentMetadata);
        }
    }
    const manifest = {
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
        console.log(`[ComponentManifest] ✅ Generated ${components.length} components in ${duration}ms`);
        console.log(`[ComponentManifest] 📄 ${relativePath}`);
    }
}
/**
 * Creates an esbuild plugin that automatically generates the component manifest
 * on every build (including hot reloads)
 */
const componentManifestPlugin = (options = {}) => {
    const { enabled = true, logToConsole = true, rootDir = process.cwd(), outputPath = path.join(process.cwd(), 'apps/sentinel/src/assets/component-manifest.json'), componentPattern = '**/*.component.ts', ignorePatterns = ['**/node_modules/**', '**/dist/**', '**/tmp/**'], } = options;
    // Skip if disabled
    if (!enabled) {
        return {
            name: 'component-manifest-plugin',
            setup() {
                // No setup needed if disabled
            },
        };
    }
    const fullOptions = {
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
                }
                catch (error) {
                    console.error('[ComponentManifest] ❌ Error generating manifest:', error);
                    // Don't fail the build, just log the error
                }
            });
        },
    };
};
exports.componentManifestPlugin = componentManifestPlugin;
// Default export for compatibility
function default_1(options = {}) {
    return (0, exports.componentManifestPlugin)(options);
}
//# sourceMappingURL=esbuild-component-manifest-plugin.js.map
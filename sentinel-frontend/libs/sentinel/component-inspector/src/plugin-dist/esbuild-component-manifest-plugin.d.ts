import { Plugin } from 'esbuild';
interface PluginOptions {
    enabled?: boolean;
    logToConsole?: boolean;
    rootDir?: string;
    outputPath?: string;
    componentPattern?: string;
    ignorePatterns?: string[];
}
/**
 * Creates an esbuild plugin that automatically generates the component manifest
 * on every build (including hot reloads)
 */
export declare const componentManifestPlugin: (options?: PluginOptions) => Plugin;
export default function (options?: PluginOptions): Plugin;
export {};
//# sourceMappingURL=esbuild-component-manifest-plugin.d.ts.map
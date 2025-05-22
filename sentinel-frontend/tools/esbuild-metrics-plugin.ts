/// <reference types="node" />
import { execSync } from 'child_process';
import { BuildOptions, BuildResult, Plugin } from 'esbuild';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface BuildMetrics {
  id?: string;
  timestamp: string;
  duration_ms: number;
  is_initial_build: boolean;

  // Machine metrics
  machine_hostname: string;
  machine_platform: string;
  machine_cpu_count: number;
  machine_memory_total: number;
  machine_memory_free: number;

  // Process metrics
  process_node_version: string;
  process_memory: number;

  // Build metrics
  build_files_count: number;
  build_output_dir: string;
  build_error_count: number;
  build_warning_count: number;

  // Workspace info
  workspace_name: string;
  workspace_project: string;
  workspace_environment: string;
  workspace_user: string;

  // Git info
  git_commit_hash: string;
  git_branch_name: string;
}

interface PluginOptions {
  // Rails backend URL to post metrics to
  backendUrl: string;

  // API token for authentication (required)
  apiToken: string;

  // Whether to enable the plugin
  enabled?: boolean;

  // Whether to log metrics to console
  logToConsole?: boolean;

  // Whether to store metrics locally
  storeLocally?: boolean;

  // Maximum number of builds to store
  maxBuildsToStore?: number;

  // Directory to store local metrics
  localStorageDir?: string;

  // Workspace info
  workspace?: {
    name: string;
    project: string;
    environment: string;
  };

  // How often to send metrics (in milliseconds)
  sendInterval?: number;
}

/**
 * Get workspace information from package.json and environment
 */
function getWorkspaceInfo(_buildOptions: BuildOptions) {
  try {
    // Try to find package.json by walking up the directory tree
    let currentDir = process.cwd();
    let packageJsonPath = '';

    while (currentDir !== path.parse(currentDir).root) {
      const possiblePath = path.join(currentDir, 'package.json');
      if (fs.existsSync(possiblePath)) {
        packageJsonPath = possiblePath;
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    // Get workspace name from package.json
    let workspaceName = 'unknown';
    if (packageJsonPath) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      workspaceName = packageJson.name || 'unknown';
    }

    if (!process.env.NX_PROJECT_NAME) {
      console.warn(
        '[Build Metrics] NX_PROJECT_NAME environment variable is not set. Are you running through Nx?',
      );
    }

    return {
      name: process.env.NX_WORKSPACE_NAME || workspaceName,
      project: process.env.NX_PROJECT_NAME || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      user: process.env.USER || os.userInfo().username || 'unknown',
    };
  } catch (error) {
    console.warn('[Build Metrics] Error getting workspace info:', error);
    return {
      name: process.env.NX_WORKSPACE_NAME || 'unknown',
      project: process.env.NX_PROJECT_NAME || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      user: process.env.USER || os.userInfo().username || 'unknown',
    };
  }
}

/**
 * Get Git information (commit hash and branch name)
 */
function getGitInfo(): { commitHash: string; branchName: string } {
  // Use a module-level cache to avoid repeated Git commands
  if ((getGitInfo as any).cache) {
    return (getGitInfo as any).cache;
  }

  try {
    // Execute git commands to get commit hash and branch name
    const commitHash = execSync('git rev-parse HEAD', {
      encoding: 'utf8',
    }).trim();
    const branchName = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf8',
    }).trim();

    const result = {
      commitHash: commitHash || 'unknown',
      branchName: branchName || 'unknown',
    };

    // Cache the result
    (getGitInfo as any).cache = result;
    return result;
  } catch (error) {
    console.warn('[Build Metrics] Error getting Git info:', error);
    const result = { commitHash: 'unknown', branchName: 'unknown' };
    (getGitInfo as any).cache = result;
    return result;
  }
}

/**
 * Creates an esbuild plugin that collects build metrics and sends them to a Rails backend
 */
export const buildMetricsPlugin = (options: PluginOptions): Plugin => {
  const {
    backendUrl,
    apiToken,
    enabled = true,
    logToConsole = true,
    storeLocally = true,
    maxBuildsToStore = 100,
    localStorageDir = path.join(os.homedir(), '.nx-build-metrics'),
    sendInterval = 5000, // 5 seconds
  } = options;

  // Validate required options
  if (!backendUrl) {
    throw new Error('[Build Metrics] backendUrl is required');
  }

  if (!apiToken) {
    throw new Error('[Build Metrics] apiToken is required for authentication');
  }

  // Skip if disabled
  if (!enabled) {
    return {
      name: 'build-metrics-plugin',
      setup() {
        // No setup needed if disabled
      },
    };
  }

  // Create storage directory if it doesn't exist
  if (storeLocally && !fs.existsSync(localStorageDir)) {
    fs.mkdirSync(localStorageDir, { recursive: true });
  }

  // Queue for pending metrics to send
  const metricsQueue: BuildMetrics[] = [];

  // Track if this is the initial build
  let isFirstBuild = true;

  // Track start time
  let buildStartTime = 0;

  // Process file types
  const fileTypes: Record<string, number> = {};

  // Current file count
  let fileCount = 0;

  // If we're already sending metrics, don't start another send
  let isSendingMetrics = false;

  /**
   * Sends queued metrics to the backend
   */
  const sendMetrics = async () => {
    if (isSendingMetrics || metricsQueue.length === 0) return;

    isSendingMetrics = true;
    const metricsToSend = [...metricsQueue];
    metricsQueue.length = 0; // Clear the queue

    try {
      if (logToConsole) {
        console.log(
          `[Build Metrics] Sending ${metricsToSend.length} build metrics to ${backendUrl}`,
        );
      }

      // Validate that metrics can be properly stringified to JSON
      const metricsJson = JSON.stringify({ metrics: metricsToSend });
      if (logToConsole) {
        console.log('[Build Metrics] Sending data:', JSON.parse(metricsJson));
      }

      const response = await fetch(
        `${backendUrl}/api/v1/projects/3/build_metrics`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiToken}`,
          },
          body: JSON.stringify({ metrics: metricsToSend }),
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(
          `Failed to send metrics: ${response.status} ${response.statusText} - ${errorData.error}`,
        );
      }

      const result = await response.json();

      console.log();
      console.log(
        `\x1b[32m[Build Metrics] Successfully sent to ${backendUrl}\x1b[0m`,
        result,
      );
      console.log();

      // Handle any failed metrics
      const failedMetrics =
        result.results?.filter((r) => r.status === 'error') || [];
      if (failedMetrics.length > 0) {
        console.error(
          '[Build Metrics] Some metrics failed to save:',
          failedMetrics,
        );
      }
    } catch (error) {
      // Put metrics back in the queue if sending failed
      metricsQueue.unshift(...metricsToSend);

      console.error('[Build Metrics] Failed to send metrics:', error);
    } finally {
      isSendingMetrics = false;
    }
  };

  /**
   * Stores metrics locally
   */
  const storeMetricsLocally = (metrics: BuildMetrics) => {
    if (!storeLocally) return;

    try {
      const metricsFile = path.join(localStorageDir, 'build-metrics.json');
      let existingMetrics: BuildMetrics[] = [];

      // Read existing metrics if available
      if (fs.existsSync(metricsFile)) {
        const fileContent = fs.readFileSync(metricsFile, 'utf8');
        existingMetrics = JSON.parse(fileContent);
      }

      // Add new metrics
      existingMetrics.push(metrics);

      // Limit the number of stored metrics
      if (existingMetrics.length > maxBuildsToStore) {
        existingMetrics = existingMetrics.slice(-maxBuildsToStore);
      }

      // Write metrics to file
      fs.writeFileSync(metricsFile, JSON.stringify(existingMetrics, null, 2));

      if (logToConsole) {
        console.log(`[Build Metrics] Stored metrics locally at ${metricsFile}`);
      }
    } catch (error) {
      console.error('[Build Metrics] Failed to store metrics locally:', error);
    }
  };

  /**
   * Create build metrics object
   */
  const createBuildMetrics = (
    buildResult: BuildResult,
    duration: number,
  ): Omit<BuildMetrics, 'id'> => {
    // Get entry points from metafile

    // Get output directory from metafile or first output file
    let outputDir = 'unknown';
    if (
      buildResult.metafile?.outputs &&
      Object.keys(buildResult.metafile.outputs).length > 0
    ) {
      outputDir = path.dirname(Object.keys(buildResult.metafile.outputs)[0]);
    } else if (buildResult.outputFiles?.[0]) {
      outputDir = path.dirname(buildResult.outputFiles[0].path);
    }

    // Process file types with double quotes
    const fileTypes: Record<string, number> = {};
    for (const [ext, count] of Object.entries({ ...fileTypes })) {
      fileTypes[ext.replace(/'/g, '"')] = count;
    }

    const extractBuildTarget = (
      target: string,
    ): { project: string; task: string; environment: string } => {
      const [project, task, environment] = target.split(':');
      return {
        project: project || 'unknown',
        task: task || 'unknown',
        environment: environment || 'unknown',
      };
    };

    const buildTarget =
      process.env.NX_BUILD_TARGET || 'unknown:unknown:unknown';
    const { project, environment } = extractBuildTarget(buildTarget);

    // Get Git information
    const { commitHash, branchName } = getGitInfo();

    return {
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      is_initial_build: isFirstBuild,
      machine_hostname: os.hostname(),
      machine_platform: process.platform,
      machine_cpu_count: os.cpus().length,
      machine_memory_total: os.totalmem(),
      machine_memory_free: os.freemem(),
      process_node_version: process.version,
      process_memory: process.memoryUsage().heapUsed,
      build_files_count: fileCount,
      build_output_dir: outputDir.replace(/'/g, '"'),
      build_error_count: buildResult.errors.length,
      build_warning_count: buildResult.warnings.length,
      workspace_name: process.env.NX_WORKSPACE_NAME || 'sentinel',
      workspace_project: project,
      workspace_environment: environment,
      workspace_user: process.env.USER || os.userInfo().username || 'unknown',
      git_commit_hash: commitHash,
      git_branch_name: branchName,
    };
  };

  // Set up interval to periodically send metrics
  const intervalId = setInterval(sendMetrics, sendInterval);

  // Make sure to clean up on process exit
  process.on('exit', () => {
    clearInterval(intervalId);
    // Try to send any remaining metrics
    if (metricsQueue.length > 0) {
      // Use a synchronous approach since we're exiting
      if (storeLocally) {
        const metricsFile = path.join(localStorageDir, 'pending-metrics.json');
        fs.writeFileSync(metricsFile, JSON.stringify(metricsQueue, null, 2));
      }
    }
  });

  return {
    name: 'build-metrics-plugin',
    setup(build) {
      // Get workspace info from build configuration
      const workspace = getWorkspaceInfo(build.initialOptions);

      // Ensure we have metafile output for better metrics
      build.initialOptions.metafile = true;

      // Track build start
      build.onStart(() => {
        buildStartTime = performance.now();
        fileCount = 0;

        // Reset file type counts for this build
        for (const key in fileTypes) {
          delete fileTypes[key];
        }

        if (logToConsole) {
          console.log(
            `[Build Metrics] ${isFirstBuild ? 'Initial' : 'Incremental'} build started`,
          );
        }
      });

      // Track build completion
      build.onEnd(async (result) => {
        const buildEndTime = performance.now();
        const duration = Math.round(buildEndTime - buildStartTime); // Round to ensure integer milliseconds

        const sizeData = await analyzeBundleSize(result); // Removed second argument
        console.log(sizeData.totalSize);

        // Process files from metafile
        if (result.metafile?.inputs) {
          for (const [filePath] of Object.entries(result.metafile.inputs)) {
            fileCount++;
            const ext = path.extname(filePath).toLowerCase();
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;

            if (logToConsole) {
              // console.log(`[Build Metrics] Processing file: ${filePath}`);
            }
          }
        }

        // Create metrics object with workspace info
        const metrics = {
          ...createBuildMetrics(result, duration),
          workspace_name: workspace.name,
          workspace_project: workspace.project,
          workspace_environment: workspace.environment,
          workspace_user: workspace.user,
          workspace_target: 'build', // TODO: read poper target
        };

        // Log metrics
        if (logToConsole) {
          console.log(
            `[Build Metrics] ${isFirstBuild ? 'Initial' : 'Hot reload'} build completed in ${duration}ms`,
          );
          console.log(`[Build Metrics] Processed ${fileCount} files`);
          console.log(`[Build Metrics] File types:`, fileTypes);
          console.log(
            `[Build Metrics] Git branch: ${metrics.git_branch_name}, commit: ${metrics.git_commit_hash.substring(0, 8)}`,
          );

          if (result.errors.length > 0) {
            console.log(
              `[Build Metrics] Build had ${result.errors.length} errors`,
            );
          }
        }

        // Queue metrics for sending
        metricsQueue.push(metrics);

        // Store metrics locally
        storeMetricsLocally(metrics);

        // After first build, update flag
        if (isFirstBuild) {
          isFirstBuild = false;
        }

        // Try to send metrics immediately
        void sendMetrics();
      });
    },
  };
};

// Default export for compatibility
export default function (options: PluginOptions): Plugin {
  return buildMetricsPlugin(options);
}

interface FileDetail {
  path: string;
  rawSize: number;
  gzippedSize: number;
  rawSizeFormatted: string;
  gzippedSizeFormatted: string;
  inputs: string[];
  entryPoint?: string;
  sourceMapPath?: string;
  sourceMapRawSize?: number;
  sourceMapGzippedSize?: number;
  sourceMapRawSizeFormatted?: string;
  sourceMapGzippedSizeFormatted?: string;
  isSourceMap?: boolean; // To explicitly mark if the primary path is a sourcemap (for ungrouped maps)
}

interface SizeInfo {
  raw: number;
  gzipped: number;
  rawFormatted: string;
  gzippedFormatted: string;
}

interface BundleSizeReportData {
  totalSize: {
    js: SizeInfo;
    jsMap: SizeInfo;
    css: SizeInfo;
    cssMap: SizeInfo;
  };
  files: FileDetail[];
  fileCount: number;
}

async function analyzeBundleSize(
  result: BuildResult<BuildOptions>,
): Promise<BundleSizeReportData> {
  const outputs = result.metafile?.outputs || {};
  const totalSizes = {
    js: { raw: 0, gzipped: 0 },
    jsMap: { raw: 0, gzipped: 0 },
    css: { raw: 0, gzipped: 0 },
    cssMap: { raw: 0, gzipped: 0 },
  };
  const fileDetailsMap: Map<string, FileDetail> = new Map();
  const sourceMapDetails: Map<string, Partial<FileDetail>> = new Map();

  for (const [outputPath, output] of Object.entries(outputs)) {
    const fullPath = path.resolve('dist/apps/sentinel/' + outputPath);

    if (!fs.existsSync(fullPath)) continue;

    const stats = fs.statSync(fullPath);
    const rawSize = stats.size;
    const gzippedSize = await getGzippedSize(fullPath);
    const rawSizeFormatted = formatSize(rawSize);
    const gzippedSizeFormatted = formatSize(gzippedSize);
    const inputs = output.inputs ? Object.keys(output.inputs) : [];
    const entryPoint = output.entryPoint;

    if (outputPath.endsWith('.js.map')) {
      totalSizes.jsMap.raw += rawSize;
      totalSizes.jsMap.gzipped += gzippedSize;
      const mainAssetPath = outputPath.replace('.map', '');
      sourceMapDetails.set(mainAssetPath, {
        path: outputPath, // Store original sourcemap path for reference if needed
        rawSize,
        gzippedSize,
        rawSizeFormatted,
        gzippedSizeFormatted,
      });
    } else if (outputPath.endsWith('.css.map')) {
      totalSizes.cssMap.raw += rawSize;
      totalSizes.cssMap.gzipped += gzippedSize;
      const mainAssetPath = outputPath.replace('.map', '');
      sourceMapDetails.set(mainAssetPath, {
        path: outputPath,
        rawSize,
        gzippedSize,
        rawSizeFormatted,
        gzippedSizeFormatted,
      });
    } else if (outputPath.endsWith('.js')) {
      totalSizes.js.raw += rawSize;
      totalSizes.js.gzipped += gzippedSize;
      fileDetailsMap.set(outputPath, {
        path: outputPath,
        rawSize,
        gzippedSize,
        rawSizeFormatted,
        gzippedSizeFormatted,
        inputs,
        entryPoint,
      });
    } else if (outputPath.endsWith('.css')) {
      totalSizes.css.raw += rawSize;
      totalSizes.css.gzipped += gzippedSize;
      fileDetailsMap.set(outputPath, {
        path: outputPath,
        rawSize,
        gzippedSize,
        rawSizeFormatted,
        gzippedSizeFormatted,
        inputs,
        entryPoint,
      });
    } else {
      // Handle other file types (e.g., images, fonts) if necessary, or treat them as individual files
      // For now, add them directly if they are not maps
      if (!outputPath.endsWith('.map')) {
        fileDetailsMap.set(outputPath, {
          path: outputPath,
          rawSize,
          gzippedSize,
          rawSizeFormatted,
          gzippedSizeFormatted,
          inputs,
          entryPoint,
        });
      }
    }
  }

  const finalFileDetails: FileDetail[] = [];
  for (const [mainAssetPath, detail] of fileDetailsMap.entries()) {
    const smDetails = sourceMapDetails.get(mainAssetPath);
    if (smDetails) {
      detail.sourceMapPath = smDetails.path;
      detail.sourceMapRawSize = smDetails.rawSize;
      detail.sourceMapGzippedSize = smDetails.gzippedSize;
      detail.sourceMapRawSizeFormatted = smDetails.rawSizeFormatted;
      detail.sourceMapGzippedSizeFormatted = smDetails.gzippedSizeFormatted;
    }
    finalFileDetails.push(detail);
  }

  // Add any sourcemaps that didn't have a corresponding main asset (orphaned sourcemaps)
  // These might occur if a .map file is generated but its parent is not in the outputs for some reason
  // or if we want to list all files including un-grouped sourcemaps.
  // For this request, we only want grouped files or main files, so we can skip adding orphaned sourcemaps explicitly
  // unless they were already added as 'other' file types.

  // Sort by size (largest first) - main asset size
  finalFileDetails.sort((a, b) => b.rawSize - a.rawSize);

  return {
    totalSize: {
      js: {
        raw: totalSizes.js.raw,
        gzipped: totalSizes.js.gzipped,
        rawFormatted: formatSize(totalSizes.js.raw),
        gzippedFormatted: formatSize(totalSizes.js.gzipped),
      },
      jsMap: {
        raw: totalSizes.jsMap.raw,
        gzipped: totalSizes.jsMap.gzipped,
        rawFormatted: formatSize(totalSizes.jsMap.raw),
        gzippedFormatted: formatSize(totalSizes.jsMap.gzipped),
      },
      css: {
        raw: totalSizes.css.raw,
        gzipped: totalSizes.css.gzipped,
        rawFormatted: formatSize(totalSizes.css.raw),
        gzippedFormatted: formatSize(totalSizes.css.gzipped),
      },
      cssMap: {
        raw: totalSizes.cssMap.raw,
        gzipped: totalSizes.cssMap.gzipped,
        rawFormatted: formatSize(totalSizes.cssMap.raw),
        gzippedFormatted: formatSize(totalSizes.cssMap.gzipped),
      },
    },
    files: finalFileDetails,
    fileCount: finalFileDetails.length,
  };
}

async function getGzippedSize(filePath: string): Promise<number> {
  // Added types for parameters and return
  try {
    const { gzipSync } = await import('zlib');
    const content = fs.readFileSync(filePath);
    return gzipSync(content).length;
  } catch (error) {
    console.warn(
      `Could not calculate gzipped size for ${filePath}:`,
      error.message,
    );
    return 0;
  }
}

function formatSize(bytes: number): string {
  // Added type for parameter and return
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Removed unused writeReport function

function logSizeReport(report: BundleSizeReportData, threshold?: number) {
  // Used BundleSizeReportData
  console.log('\\n📊 Bundle Size Report');
  console.log('='.repeat(50));

  // console.log(`🕒 Build Time: ${report.buildTime}`); // Removed: buildTime is not in BundleSizeReportData
  console.log(`📁 Files: ${report.fileCount}`);
  console.log(
    `📏 Total JS Size: ${report.totalSize.js.rawFormatted} (${report.totalSize.js.gzippedFormatted} gzipped)`, // Corrected path
  );
  console.log(
    `📏 Total CSS Size: ${report.totalSize.css.rawFormatted} (${report.totalSize.css.gzippedFormatted} gzipped)`, // Added CSS total size
  );

  if (threshold && report.totalSize.js.raw > threshold) {
    // Corrected path for JS
    console.warn(
      `⚠️  JS Bundle size (${report.totalSize.js.rawFormatted}) exceeds threshold (${formatSize(threshold)})`, // Corrected path
    );
  }
  // Optionally, add a threshold check for CSS or combined size if needed

  console.log('\\n📋 File Breakdown (Top 5):');
  report.files.slice(0, 5).forEach((file, index) => {
    const icon =
      index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📄';
    let output = `${icon} ${file.path}\n`;
    output += `└─ ${file.rawSizeFormatted} (${file.gzippedSizeFormatted} gzipped)`;

    if (
      file.sourceMapPath &&
      file.sourceMapRawSizeFormatted &&
      file.sourceMapGzippedSizeFormatted
    ) {
      output += `\n  Sourcemap: ${file.sourceMapPath}`;
      output += `\n  └─ ${file.sourceMapRawSizeFormatted} (${file.sourceMapGzippedSizeFormatted} gzipped)`;
    }
    console.log(output);
  });

  // Optionally, add more detailed breakdown for all files or specific groups
  // report.files.forEach((file) => {
  //   console.log(`- ${file.path}: ${file.rawSizeFormatted} (${file.gzippedSizeFormatted} gzipped)`);
  // });
}

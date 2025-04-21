import { Plugin, BuildOptions, BuildResult } from 'esbuild';
import * as os from 'os';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface BuildMetrics {
  id: string;
  timestamp: number;
  duration: number;
  isInitialBuild: boolean;
  machine: {
    hostname: string;
    platform: string;
    cpuCount: number;
    memory: {
      total: number;
      free: number;
    };
  };
  process: {
    nodeVersion: string;
    memory: number;
  };
  build: {
    files: number;
    entryPoints: string[];
    outputDir: string;
    errors: number;
    warnings: number;
    fileTypes: Record<string, number>;
  };
  workspace: {
    name: string;
    project: string;
    environment: string;
    user: string;
  };
}

interface PluginOptions {
  // Rails backend URL to post metrics to
  backendUrl: string;

  // API token for authentication (optional)
  apiToken?: string;

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
 * Generates a unique identifier for the build
 */
function generateBuildId(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Get workspace information from package.json and environment
 */
function getWorkspaceInfo(buildOptions: BuildOptions) {
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

  // Skip if disabled
  if (!enabled) {
    return {
      name: 'build-metrics-plugin',
      setup() {},
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

      //   const response = await fetch(backendUrl, {
      //     method: 'POST',
      //     headers: {
      //       'Content-Type': 'application/json',
      //       ...(apiToken && { Authorization: `Bearer ${apiToken}` }),
      //     },
      //     body: JSON.stringify({ metrics: metricsToSend }),
      //   });

      console.log(metricsToSend);

      //   if (!response.ok) {
      //     throw new Error(
      //       `Failed to send metrics: ${response.status} ${response.statusText}`,
      //     );
      //   }

      if (logToConsole) {
        console.log(
          `[Build Metrics] Successfully sent ${metricsToSend.length} metrics`,
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
  ): BuildMetrics => {
    // Get entry points from metafile
    const entryPoints = buildResult.metafile?.inputs
      ? Object.entries(buildResult.metafile.inputs)
          .filter(([_, input]) =>
            input.imports.some((imp) => imp.kind === 'entry-point'),
          )
          .map(([path]) => path)
      : [];

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

    return {
      id: generateBuildId(),
      timestamp: Date.now(),
      duration,
      isInitialBuild: isFirstBuild,
      machine: {
        hostname: os.hostname(),
        platform: process.platform,
        cpuCount: os.cpus().length,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
        },
      },
      process: {
        nodeVersion: process.version,
        memory: process.memoryUsage().heapUsed,
      },
      build: {
        files: fileCount,
        entryPoints,
        outputDir,
        errors: buildResult.errors.length,
        warnings: buildResult.warnings.length,
        fileTypes: { ...fileTypes }, // Create a copy to avoid reference issues
      },
      workspace: {
        name: process.env.NX_WORKSPACE_NAME || 'sentinel',
        project: process.env.NX_PROJECT_NAME || 'sentinel',
        environment: process.env.NODE_ENV || 'development',
        user: process.env.USER || os.userInfo().username || 'unknown',
      },
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
        const duration = buildEndTime - buildStartTime;

        console.log('result');

        console.log(result.metafile?.inputs);
        console.log(result.metafile?.outputs);

        // Process files from metafile
        if (result.metafile?.inputs) {
          for (const [filePath, info] of Object.entries(
            result.metafile.inputs,
          )) {
            fileCount++;
            const ext = path.extname(filePath).toLowerCase();
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;

            if (logToConsole) {
              console.log(`[Build Metrics] Processing file: ${filePath}`);
            }
          }
        }

        // Create metrics object with workspace info
        const metrics = {
          ...createBuildMetrics(result, duration),
          workspace,
        };

        // Log metrics
        if (logToConsole) {
          console.log(
            `[Build Metrics] ${isFirstBuild ? 'Initial' : 'Hot reload'} build completed in ${duration.toFixed(2)}ms`,
          );
          console.log(`[Build Metrics] Processed ${fileCount} files`);
          console.log(`[Build Metrics] File types:`, fileTypes);

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

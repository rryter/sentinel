/**
 * Deep partial type for configuration
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface InspectorConfig {
  /** Enable/disable inspector */
  enabled: boolean;

  /** Keyboard shortcut configuration */
  shortcut: {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };

  /** Visual styling for overlays */
  overlay: {
    borderColor: string;
    backgroundColor: string;
    borderWidth: number;
    zIndex: number;
    /** Overlay opacity (0.0 to 1.0) */
    opacity?: number;
  };

  /** Component filtering rules */
  filter: {
    /** Only show components matching these patterns (glob-style) */
    include?: string[];
    /** Hide components matching these patterns */
    exclude?: string[];
    /** Hide standalone components */
    hideStandalone?: boolean;
    /** Library filter: map of library name to visibility state */
    libraries?: Record<string, boolean>;
  };

  /** Performance optimization settings */
  performance: {
    /** Throttle mutation observer callbacks (ms) */
    throttleMs: number;
    /** Debounce scroll/resize handlers (ms) */
    debounceMs: number;
    /** Use IntersectionObserver for lazy rendering */
    useLazyRendering: boolean;
    /** Maximum visible overlays at once */
    maxVisibleOverlays: number;
  };

  /** VS Code integration settings */
  vscode: {
    enabled: boolean;
    /** Backend API URL for opening files */
    backendUrl: string;
    /** Fallback to vscode:// protocol if backend unavailable */
    useFallbackProtocol: boolean;
    /** Editor variant: 'vscode' or 'vscode-insiders' */
    editorVariant: 'vscode' | 'vscode-insiders';
  };
}

export const DEFAULT_INSPECTOR_CONFIG: InspectorConfig = {
  enabled: true,
  shortcut: {
    key: 'I',
    ctrl: true,
    shift: true,
  },
  overlay: {
    borderColor: 'rgb(104, 182, 255)',
    backgroundColor: 'rgb(104, 182, 255)',
    borderWidth: 2,
    zIndex: 2147483646,
    opacity: 0.15,
  },
  filter: {
    include: ['@sentinel/**', '@shared/**', 'app-*', 'lib-*', 'saas-*'],
    exclude: ['hlm-*', 'brn-*'], // Exclude Spartan UI components
  },
  performance: {
    throttleMs: 200,
    debounceMs: 150,
    useLazyRendering: true,
    maxVisibleOverlays: 100,
  },
  vscode: {
    enabled: true,
    backendUrl: 'http://localhost:3001/api/dev/editor',
    useFallbackProtocol: true,
    editorVariant: 'vscode',
  },
};

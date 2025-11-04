import {
  Injectable,
  inject,
  signal,
  effect,
  isDevMode,
  ComponentRef,
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
} from '@angular/core';
import { fromEvent } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ComponentDetectorService } from './component-detector.service';
import { OverlayManagerService } from './overlay-manager.service';
import { VscodeIntegrationService } from './vscode-integration.service';
import type { ComponentInfo } from '../models/component-info.interface';
import type { InspectorConfig, DeepPartial } from '../models/inspector-config.interface';
import { DEFAULT_INSPECTOR_CONFIG } from '../models/inspector-config.interface';
import { shouldShowComponent } from '../utils/component-metadata.util';
import { InspectorConfigPanelComponent } from '../components/inspector-config-panel/inspector-config-panel.component';

@Injectable({
  providedIn: 'root',
})
export class ComponentInspectorService {
  private detector = inject(ComponentDetectorService);
  private overlayManager = inject(OverlayManagerService);
  private vscodeIntegration = inject(VscodeIntegrationService);
  private appRef = inject(ApplicationRef);
  private injector = inject(EnvironmentInjector);

  private isActive = signal(false);
  private config = signal<InspectorConfig>(DEFAULT_INSPECTOR_CONFIG);
  private initialized = false;
  private configPanelRef: ComponentRef<InspectorConfigPanelComponent> | null = null;

  constructor() {
    // Only initialize in development mode
    if (!isDevMode()) {
      return;
    }

    // Watch for component changes and update overlays
    effect(() => {
      if (!this.isActive()) return;

      const components = this.detector.getComponents();
      this.updateOverlays(components);
    });
  }

  /**
   * Initialize the component inspector
   */
  async initialize(config?: DeepPartial<InspectorConfig>): Promise<void> {
    if (this.initialized) {
      console.warn('[ComponentInspector] Already initialized');
      return;
    }

    if (!isDevMode()) {
      console.warn('[ComponentInspector] Only available in development mode');
      return;
    }

    // Merge config with defaults
    const fullConfig: InspectorConfig = {
      ...DEFAULT_INSPECTOR_CONFIG,
      ...config,
      shortcut: {
        ...DEFAULT_INSPECTOR_CONFIG.shortcut,
        ...config?.shortcut,
      },
      overlay: {
        ...DEFAULT_INSPECTOR_CONFIG.overlay,
        ...config?.overlay,
      },
      filter: {
        ...DEFAULT_INSPECTOR_CONFIG.filter,
        ...config?.filter,
      },
      performance: {
        ...DEFAULT_INSPECTOR_CONFIG.performance,
        ...config?.performance,
      },
      vscode: {
        ...DEFAULT_INSPECTOR_CONFIG.vscode,
        ...config?.vscode,
      },
    };

    this.config.set(fullConfig);

    // Initialize services
    this.vscodeIntegration.initialize(fullConfig);
    this.overlayManager.initialize(fullConfig, (info) => this.handleComponentClick(info));

    // Load component manifest
    await this.detector.loadManifest('/assets/component-manifest.json');

    // Initialize component detector
    this.detector.initialize(fullConfig.performance.throttleMs);

    // Setup keyboard shortcuts
    this.setupKeyboardShortcut();
    this.setupConfigPanelShortcut();

    // Create config panel component
    this.createConfigPanel();

    this.initialized = true;

    console.log('[ComponentInspector] Initialized successfully');
    console.log(
      `[ComponentInspector] Press ${this.getShortcutDescription()} to toggle inspector mode`
    );
    console.log('[ComponentInspector] Press Ctrl+Shift+C to toggle config panel');
  }

  /**
   * Toggle inspector mode on/off
   */
  toggle(): void {
    this.isActive.update((active) => !active);

    if (this.isActive()) {
      console.log('[ComponentInspector] Inspector mode ENABLED');
      const components = this.detector.getComponents();
      this.updateOverlays(components);
    } else {
      console.log('[ComponentInspector] Inspector mode DISABLED');
      this.overlayManager.removeAllOverlays();
    }
  }

  /**
   * Enable inspector mode
   */
  enable(): void {
    if (!this.isActive()) {
      this.toggle();
    }
  }

  /**
   * Disable inspector mode
   */
  disable(): void {
    if (this.isActive()) {
      this.toggle();
    }
  }

  /**
   * Check if inspector is currently active
   */
  isInspectorActive(): boolean {
    return this.isActive();
  }

  /**
   * Get current configuration
   */
  getConfig(): InspectorConfig {
    return this.config();
  }

  /**
   * Update configuration
   */
  updateConfig(config: DeepPartial<InspectorConfig>): void {
    const currentConfig = this.config();
    const updatedConfig: InspectorConfig = {
      ...currentConfig,
      ...config,
      shortcut: {
        ...currentConfig.shortcut,
        ...config?.shortcut,
      },
      overlay: {
        ...currentConfig.overlay,
        ...config?.overlay,
      },
      filter: {
        ...currentConfig.filter,
        ...config?.filter,
        // Deep merge libraries object
        libraries: {
          ...currentConfig.filter.libraries,
          ...config?.filter?.libraries,
        },
      },
      performance: {
        ...currentConfig.performance,
        ...config?.performance,
      },
      vscode: {
        ...currentConfig.vscode,
        ...config?.vscode,
      },
    };
    this.config.set(updatedConfig);

    // Re-initialize services with new config
    this.vscodeIntegration.initialize(updatedConfig);
    this.overlayManager.initialize(updatedConfig, (info) => this.handleComponentClick(info));

    if (this.isActive()) {
      // Refresh overlays with new config
      const components = this.detector.getComponents();
      this.updateOverlays(components);
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.disable();
    this.detector.destroy();
    this.overlayManager.destroy();
    this.destroyConfigPanel();
    this.initialized = false;
  }

  /**
   * Toggle config panel visibility
   */
  toggleConfigPanel(): void {
    if (this.configPanelRef) {
      this.configPanelRef.instance.toggle();
    }
  }

  /**
   * Update overlays based on detected components
   */
  private updateOverlays(components: Map<Element, ComponentInfo>): void {
    const config = this.config();

    // Track which elements should have overlays
    const shouldHaveOverlay = new Set<Element>();

    // Determine which components should be visible
    components.forEach((info, element) => {
      if (shouldShowComponent(info, config.filter)) {
        shouldHaveOverlay.add(element);
      }
    });

    // Remove overlays that should no longer be shown
    this.overlayManager['overlays'].forEach((_, element) => {
      if (!shouldHaveOverlay.has(element)) {
        this.overlayManager.removeOverlay(element);
      }
    });

    // Create overlays for components that should be shown but don't have one yet
    shouldHaveOverlay.forEach((element) => {
      if (!this.overlayManager['overlays'].has(element)) {
        const info = components.get(element);
        if (info) {
          this.overlayManager.createOverlay(info);
        }
      }
    });
  }

  /**
   * Handle component click
   */
  private handleComponentClick(info: ComponentInfo): void {
    console.log('[ComponentInspector] Component clicked:', info);
    this.vscodeIntegration.openInVSCode(info);
  }

  /**
   * Setup keyboard shortcut listener
   */
  private setupKeyboardShortcut(): void {
    const config = this.config();
    const { key, ctrl, shift, alt, meta } = config.shortcut;

    fromEvent<KeyboardEvent>(window, 'keydown')
      .pipe(
        filter((event) => {
          // Check modifier keys
          const modifiersMatch =
            (!ctrl || event.ctrlKey) &&
            (!shift || event.shiftKey) &&
            (!alt || event.altKey) &&
            (!meta || event.metaKey);

          // Check key
          const keyMatches =
            event.key.toUpperCase() === key.toUpperCase();

          return modifiersMatch && keyMatches;
        })
      )
      .subscribe((event) => {
        event.preventDefault();
        this.toggle();
      });
  }

  /**
   * Get human-readable shortcut description
   */
  private getShortcutDescription(): string {
    const config = this.config();
    const parts: string[] = [];

    if (config.shortcut.ctrl) parts.push('Ctrl');
    if (config.shortcut.shift) parts.push('Shift');
    if (config.shortcut.alt) parts.push('Alt');
    if (config.shortcut.meta) parts.push('Meta');
    parts.push(config.shortcut.key.toUpperCase());

    return parts.join('+');
  }

  /**
   * Setup config panel keyboard shortcut (Ctrl+Shift+C)
   */
  private setupConfigPanelShortcut(): void {
    fromEvent<KeyboardEvent>(window, 'keydown')
      .pipe(
        filter((event) => {
          return (
            event.ctrlKey &&
            event.shiftKey &&
            event.key.toUpperCase() === 'C'
          );
        })
      )
      .subscribe((event) => {
        event.preventDefault();
        this.toggleConfigPanel();
      });
  }

  /**
   * Create config panel component
   */
  private createConfigPanel(): void {
    if (this.configPanelRef) {
      return;
    }

    this.configPanelRef = createComponent(InspectorConfigPanelComponent, {
      environmentInjector: this.injector,
    });

    document.body.appendChild(this.configPanelRef.location.nativeElement);
    this.appRef.attachView(this.configPanelRef.hostView);
  }

  /**
   * Destroy config panel component
   */
  private destroyConfigPanel(): void {
    if (this.configPanelRef) {
      this.appRef.detachView(this.configPanelRef.hostView);
      this.configPanelRef.destroy();
      this.configPanelRef = null;
    }
  }
}

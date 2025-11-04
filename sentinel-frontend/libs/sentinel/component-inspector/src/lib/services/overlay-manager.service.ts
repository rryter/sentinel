import { Injectable } from '@angular/core';
import type { ComponentInfo } from '../models/component-info.interface';
import type { InspectorConfig } from '../models/inspector-config.interface';
import { debounce, throttle } from '../utils/throttle.util';

interface OverlayElements {
  container: HTMLElement;
  badge: HTMLElement;
  tooltip: HTMLElement | null;
}

@Injectable({
  providedIn: 'root',
})
export class OverlayManagerService {
  private overlays = new Map<Element, OverlayElements>();
  private intersectionObserver: IntersectionObserver | null = null;
  private config: InspectorConfig | null = null;
  private onClickCallback: ((info: ComponentInfo) => void) | null = null;

  /**
   * Initialize overlay manager
   */
  initialize(
    config: InspectorConfig,
    onClickCallback: (info: ComponentInfo) => void,
  ): void {
    this.config = config;
    this.onClickCallback = onClickCallback;

    // Setup scroll and resize handlers
    this.setupEventListeners();

    // Setup intersection observer for lazy rendering
    if (config.performance.useLazyRendering) {
      this.setupIntersectionObserver();
    }
  }

  /**
   * Create overlay for a component
   */
  createOverlay(componentInfo: ComponentInfo): void {
    if (this.overlays.has(componentInfo.element)) {
      return;
    }

    const overlayElements = this.createOverlayElements(componentInfo);
    this.overlays.set(componentInfo.element, overlayElements);
    document.body.appendChild(overlayElements.container);

    // Position overlay
    this.positionOverlay(componentInfo.element, overlayElements);

    // Observe for lazy rendering
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(componentInfo.element);
    }
  }

  /**
   * Remove overlay for a component
   */
  removeOverlay(element: Element): void {
    const overlayElements = this.overlays.get(element);
    if (!overlayElements) {
      return;
    }

    overlayElements.container.remove();
    this.overlays.delete(element);

    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(element);
    }
  }

  /**
   * Remove all overlays
   */
  removeAllOverlays(): void {
    this.overlays.forEach((overlayElements, element) => {
      overlayElements.container.remove();
      if (this.intersectionObserver) {
        this.intersectionObserver.unobserve(element);
      }
    });
    this.overlays.clear();
  }

  /**
   * Update positions of all overlays
   */
  updateAllOverlays(): void {
    this.overlays.forEach((overlayElements, element) => {
      this.positionOverlay(element, overlayElements);
    });
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.removeAllOverlays();
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = null;
    }
  }

  /**
   * Create overlay DOM elements
   */
  private createOverlayElements(componentInfo: ComponentInfo): OverlayElements {
    if (!this.config) {
      throw new Error('OverlayManager not initialized');
    }

    // Use library color if available, otherwise use default
    const borderColor =
      componentInfo.libraryColor || this.config.overlay.borderColor;

    // Container (the border overlay)
    const container = document.createElement('div');
    container.className = 'ng-component-inspector-overlay';
    container.style.position = 'absolute';
    container.style.backgroundColor = this.config.overlay.backgroundColor;
    container.style.border = `${this.config.overlay.borderWidth}px solid ${borderColor}`;
    container.style.zIndex = this.config.overlay.zIndex.toString();
    container.style.pointerEvents = 'none';
    container.style.boxSizing = 'border-box';
    container.style.transition = 'opacity 0.2s ease';

    // Badge (clickable label)
    const badge = document.createElement('div');
    badge.className = 'ng-component-inspector-badge';
    badge.style.position = 'absolute';
    badge.style.fontFamily = 'monospace';
    badge.style.fontSize = '11px';
    badge.style.fontWeight = '600';
    badge.style.backgroundColor = borderColor;
    badge.style.color = '#fff';
    badge.style.padding = '4px 8px';
    badge.style.borderRadius = '4px';
    badge.style.pointerEvents = 'auto';
    badge.style.cursor = 'pointer';
    badge.style.userSelect = 'none';
    badge.style.whiteSpace = 'nowrap';
    badge.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    badge.style.transition =
      'transform 0.15s ease, background-color 0.15s ease';
    badge.textContent = componentInfo.selector;

    // Hover effect - highlight both badge and container
    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'scale(1.05)';
      badge.style.backgroundColor = 'rgb(80, 150, 220)';
      // Highlight the component container with red
      container.style.backgroundColor = 'rgba(255, 0, 0, 0.15)';
      container.style.borderColor = 'rgb(255, 0, 0)';
      container.style.borderWidth = '3px';
    });

    badge.addEventListener('mouseleave', () => {
      if (!this.config) return;
      badge.style.transform = 'scale(1)';
      badge.style.backgroundColor = borderColor;
      // Reset the component container
      container.style.backgroundColor = this.config.overlay.backgroundColor;
      container.style.borderColor = borderColor;
      container.style.borderWidth = `${this.config.overlay.borderWidth}px`;
    });

    // Click handler
    badge.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (this.onClickCallback) {
        this.onClickCallback(componentInfo);
      }
    });

    container.appendChild(badge);

    // Tooltip (optional, shows on hover)
    let tooltip: HTMLElement | null = null;
    if (componentInfo.relativePath) {
      tooltip = document.createElement('div');
      tooltip.className = 'ng-component-inspector-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.fontFamily = 'monospace';
      tooltip.style.fontSize = '10px';
      tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
      tooltip.style.color = '#fff';
      tooltip.style.padding = '6px 10px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.opacity = '0';
      tooltip.style.transition = 'opacity 0.2s ease';
      tooltip.style.whiteSpace = 'nowrap';
      tooltip.style.maxWidth = '400px';
      tooltip.style.overflow = 'hidden';
      tooltip.style.textOverflow = 'ellipsis';
      tooltip.textContent = componentInfo.relativePath;

      badge.addEventListener('mouseenter', () => {
        if (tooltip) tooltip.style.opacity = '1';
      });

      badge.addEventListener('mouseleave', () => {
        if (tooltip) tooltip.style.opacity = '0';
      });

      container.appendChild(tooltip);
    }

    return { container, badge, tooltip };
  }

  /**
   * Position overlay on top of component element
   */
  private positionOverlay(
    element: Element,
    overlayElements: OverlayElements,
  ): void {
    const rect = element.getBoundingClientRect();

    // Position container
    overlayElements.container.style.top = `${rect.top + window.scrollY}px`;
    overlayElements.container.style.left = `${rect.left + window.scrollX}px`;
    overlayElements.container.style.width = `${rect.width}px`;
    overlayElements.container.style.height = `${rect.height}px`;

    // Smart badge positioning (viewport-aware)
    const badge = overlayElements.badge;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const spaceRight = window.innerWidth - rect.right;

    // Reset positioning
    badge.style.top = 'auto';
    badge.style.bottom = 'auto';
    badge.style.left = 'auto';
    badge.style.right = 'auto';

    // Position badge based on available space
    if (spaceBelow > 30) {
      // Position below element
      badge.style.top = `${rect.height + 4}px`;
      badge.style.left = '0';
    } else if (spaceAbove > 30) {
      // Position above element
      badge.style.bottom = `${rect.height + 4}px`;
      badge.style.left = '0';
    } else if (spaceRight > 150) {
      // Position inside, top-right
      badge.style.top = '4px';
      badge.style.right = '4px';
    } else {
      // Position inside, top-left
      badge.style.top = '4px';
      badge.style.left = '4px';
    }

    // Position tooltip near badge
    if (overlayElements.tooltip) {
      const tooltip = overlayElements.tooltip;
      if (spaceBelow > 60) {
        tooltip.style.top = `${rect.height + 32}px`;
        tooltip.style.left = '0';
      } else {
        tooltip.style.bottom = `${rect.height + 32}px`;
        tooltip.style.left = '0';
      }
    }
  }

  /**
   * Setup event listeners for scroll and resize
   */
  private setupEventListeners(): void {
    if (!this.config) return;

    // Throttled scroll handler
    const scrollHandler = throttle(() => {
      this.updateAllOverlays();
    }, 16); // ~60fps

    // Debounced resize handler
    const resizeHandler = debounce(() => {
      this.updateAllOverlays();
    }, this.config.performance.debounceMs);

    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', resizeHandler);

    // Store handlers for cleanup (if needed)
  }

  /**
   * Setup intersection observer for lazy rendering
   */
  private setupIntersectionObserver(): void {
    if (!this.config) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const overlayElements = this.overlays.get(entry.target);
          if (overlayElements) {
            // Show/hide overlay based on visibility
            overlayElements.container.style.opacity = entry.isIntersecting
              ? '1'
              : '0';
          }
        });
      },
      {
        rootMargin: '50px', // Pre-render slightly off-screen
      },
    );
  }
}

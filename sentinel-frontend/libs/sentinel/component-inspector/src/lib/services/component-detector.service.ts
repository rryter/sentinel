import { Injectable, signal } from '@angular/core';
import type {
  ComponentInfo,
  ComponentManifest,
} from '../models/component-info.interface';
import {
  extractComponentMetadata,
  isComponentHost,
} from '../utils/component-metadata.util';
import { throttle } from '../utils/throttle.util';

@Injectable({
  providedIn: 'root',
})
export class ComponentDetectorService {
  private components = signal<Map<Element, ComponentInfo>>(new Map());
  private mutationObserver: MutationObserver | null = null;
  private manifest: ComponentManifest | null = null;
  private throttledMutationHandler:
    | ((mutations: MutationRecord[]) => void)
    | null = null;

  // Color palette for library grouping
  private readonly LIBRARY_COLORS = [
    '#264653',
    '#F4A261',
    '#2A9D8F',
    '#E76F51',
    '#E9C46A',
  ];

  /**
   * Load component manifest for file path lookups
   */
  async loadManifest(manifestUrl: string): Promise<void> {
    try {
      const response = await fetch(manifestUrl);
      if (response.ok) {
        this.manifest = await response.json();
        console.log(
          `[ComponentInspector] Loaded manifest with ${this.manifest?.components.length ?? 0} components`,
        );
      }
    } catch (e) {
      console.warn(
        '[ComponentInspector] Failed to load component manifest:',
        e,
      );
    }
  }

  /**
   * Initialize component detection
   */
  initialize(throttleMs = 200): void {
    // Initial DOM scan
    this.scanForComponents(document.body);

    // Setup mutation observer for dynamic components
    this.setupMutationObserver(throttleMs);
  }

  /**
   * Stop component detection and cleanup
   */
  destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    this.components.set(new Map());
  }

  /**
   * Get all detected components
   */
  getComponents(): Map<Element, ComponentInfo> {
    return this.components();
  }

  /**
   * Get component info for a specific element
   */
  getComponentInfo(element: Element): ComponentInfo | undefined {
    return this.components().get(element);
  }

  /**
   * Generate a deterministic color for a library name
   */
  private getLibraryColor(libraryName: string): string {
    // Better hash function for deterministic color assignment
    // Uses a polynomial rolling hash for better distribution
    let hash = 0;
    const prime = 31;
    for (let i = 0; i < libraryName.length; i++) {
      hash = (hash * prime + libraryName.charCodeAt(i)) | 0;
    }
    // Use unsigned right shift to ensure positive number
    const index = (hash >>> 0) % this.LIBRARY_COLORS.length;
    return this.LIBRARY_COLORS[index];
  }

  /**
   * Scan DOM tree for component hosts
   */
  private scanForComponents(root: Node): void {
    if (!(root instanceof Element)) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        const element = node as Element;
        return isComponentHost(element)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    const newComponents = new Map(this.components());
    let node: Node | null;

    while ((node = walker.nextNode())) {
      const element = node as Element;
      if (!newComponents.has(element)) {
        const componentInfo = this.createComponentInfo(element);
        if (componentInfo) {
          newComponents.set(element, componentInfo);
        }
      }
    }

    this.components.set(newComponents);
  }

  /**
   * Create ComponentInfo from element
   */
  private createComponentInfo(element: Element): ComponentInfo | null {
    const basicInfo = extractComponentMetadata(element);
    if (!basicInfo) {
      return null;
    }

    // Enrich with manifest data if available
    // Handle underscore prefix from minified/mangled class names
    const normalizedClassName = basicInfo.className.replace(/^_+/, '');
    const manifestEntry = this.manifest?.components.find(
      (entry) =>
        entry.className === basicInfo.className ||
        entry.className === normalizedClassName,
    );

    const library = manifestEntry?.library;
    const libraryColor = library ? this.getLibraryColor(library) : undefined;

    return {
      ...basicInfo,
      filePath: manifestEntry?.filePath,
      relativePath: manifestEntry?.relativePath,
      library,
      libraryColor,
      line: manifestEntry?.line,
    };
  }

  /**
   * Setup mutation observer to detect dynamically added components
   */
  private setupMutationObserver(throttleMs: number): void {
    this.throttledMutationHandler = throttle((mutations: MutationRecord[]) => {
      this.handleMutations(mutations);
    }, throttleMs);

    this.mutationObserver = new MutationObserver(this.throttledMutationHandler);

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Handle DOM mutations
   */
  private handleMutations(mutations: MutationRecord[]): void {
    const newComponents = new Map(this.components());
    let hasChanges = false;

    for (const mutation of mutations) {
      // Check added nodes
      mutation.addedNodes.forEach((node) => {
        if (node instanceof Element) {
          // Check if the node itself is a component
          if (isComponentHost(node) && !newComponents.has(node)) {
            const componentInfo = this.createComponentInfo(node);
            if (componentInfo) {
              newComponents.set(node, componentInfo);
              hasChanges = true;
            }
          }

          // Check descendants
          this.scanForComponentsInNode(node, newComponents);
        }
      });

      // Remove components that were removed from DOM
      mutation.removedNodes.forEach((node) => {
        if (node instanceof Element) {
          if (newComponents.has(node)) {
            newComponents.delete(node);
            hasChanges = true;
          }

          // Remove descendants
          newComponents.forEach((_, element) => {
            if (!document.body.contains(element)) {
              newComponents.delete(element);
              hasChanges = true;
            }
          });
        }
      });
    }

    if (hasChanges) {
      this.components.set(newComponents);
    }
  }

  /**
   * Scan a single node and its descendants for components
   */
  private scanForComponentsInNode(
    node: Element,
    componentsMap: Map<Element, ComponentInfo>,
  ): void {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, {
      acceptNode: (node) => {
        const element = node as Element;
        return isComponentHost(element)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    let current: Node | null;
    while ((current = walker.nextNode())) {
      const element = current as Element;
      if (!componentsMap.has(element)) {
        const componentInfo = this.createComponentInfo(element);
        if (componentInfo) {
          componentsMap.set(element, componentInfo);
        }
      }
    }
  }
}

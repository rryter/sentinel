import { reflectComponentType } from '@angular/core';
import type { ComponentInfo } from '../models/component-info.interface';

/**
 * Check if global Angular debugging utilities are available
 */
export function isAngularDebugAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).ng;
}

/**
 * Get component instance from a DOM element
 */
export function getComponentInstance(element: Element): any | null {
  if (!isAngularDebugAvailable()) {
    return null;
  }

  try {
    const ng = (window as any).ng;
    return ng.getComponent ? ng.getComponent(element) : null;
  } catch (e) {
    console.warn('Failed to get component from element:', e);
    return null;
  }
}

/**
 * Check if an element is an Angular component host
 */
export function isComponentHost(element: Element): boolean {
  // Check for __ngContext__ property (Ivy)
  return '__ngContext__' in element;
}

/**
 * Extract component metadata from an element
 */
export function extractComponentMetadata(
  element: Element
): Omit<ComponentInfo, 'filePath' | 'relativePath' | 'library' | 'line'> | null {
  const component = getComponentInstance(element);
  if (!component) {
    return null;
  }

  try {
    const className = component.constructor.name;
    const metadata = reflectComponentType(component.constructor);

    return {
      element,
      className,
      selector: metadata?.selector ?? 'unknown',
      isStandalone: metadata?.isStandalone,
    };
  } catch (e) {
    console.warn('Failed to extract component metadata:', e);
    return null;
  }
}

/**
 * Check if a selector matches any of the patterns
 * Supports glob-style wildcards (*) and exact matches
 */
export function matchesPattern(selector: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(selector);
  });
}

/**
 * Check if a component should be visible based on filter configuration
 */
export function shouldShowComponent(
  info: ComponentInfo,
  filter: {
    include?: string[];
    exclude?: string[];
    hideStandalone?: boolean;
  }
): boolean {
  // Hide standalone if configured
  if (filter.hideStandalone && info.isStandalone) {
    return false;
  }

  // Check exclude patterns first
  if (filter.exclude && matchesPattern(info.selector, filter.exclude)) {
    return false;
  }

  // Check include patterns (if specified, must match at least one)
  if (filter.include && filter.include.length > 0) {
    return matchesPattern(info.selector, filter.include);
  }

  // No include filter specified, show by default (unless excluded)
  return true;
}

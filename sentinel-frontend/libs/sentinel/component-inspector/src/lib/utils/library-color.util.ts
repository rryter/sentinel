/**
 * Utility functions for library namespace grouping and color generation
 */

// Color palette for namespaces
const NAMESPACE_COLORS: Record<string, string> = {
  'sentinel': '#2A9D8F',  // Teal
  'shared': '#E76F51',    // Coral
  'apps': '#264653',      // Dark blue-green
  'ui': '#F4A261',        // Orange
  'default': '#E9C46A',   // Yellow
};

/**
 * Extract namespace from library name
 * Examples:
 * - "sentinel/linting" -> "sentinel"
 * - "shared/ui-custom" -> "shared"
 * - "apps/sentinel" -> "apps"
 */
export function extractNamespace(libraryName: string): string {
  if (!libraryName) return 'default';

  const parts = libraryName.split('/');
  return parts[0] || 'default';
}

/**
 * Get base color for a namespace
 */
export function getNamespaceColor(namespace: string): string {
  return NAMESPACE_COLORS[namespace] || NAMESPACE_COLORS['default'];
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Generate a shade of a color based on an index
 * Uses lightness adjustment to create variations
 */
export function generateShade(baseColor: string, index: number, totalShades: number): string {
  const rgb = hexToRgb(baseColor);

  // Adjust lightness: spread shades from darker (-20%) to lighter (+20%)
  const lightnessRange = 0.4; // Total range (40%)
  const step = lightnessRange / Math.max(totalShades - 1, 1);
  const adjustment = -0.2 + (step * index);

  const adjustedR = Math.max(0, Math.min(255, rgb.r + (rgb.r * adjustment)));
  const adjustedG = Math.max(0, Math.min(255, rgb.g + (rgb.g * adjustment)));
  const adjustedB = Math.max(0, Math.min(255, rgb.b + (rgb.b * adjustment)));

  return rgbToHex(adjustedR, adjustedG, adjustedB);
}

/**
 * Hash a string to a number (for deterministic shade selection)
 */
function hashString(str: string): number {
  let hash = 0;
  const prime = 31;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * prime + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0; // Ensure positive
}

/**
 * Get color for a library with namespace-aware shading
 */
export function getLibraryColor(libraryName: string, allLibraries: string[]): string {
  const namespace = extractNamespace(libraryName);
  const baseColor = getNamespaceColor(namespace);

  // Get all libraries in the same namespace
  const librariesInNamespace = allLibraries
    .filter(lib => extractNamespace(lib) === namespace)
    .sort(); // Sort for consistent ordering

  const totalShades = librariesInNamespace.length;

  // If only one library in namespace, return base color
  if (totalShades <= 1) {
    return baseColor;
  }

  // Find index of current library in sorted list
  const index = librariesInNamespace.indexOf(libraryName);

  return generateShade(baseColor, index, totalShades);
}

/**
 * Group libraries by namespace
 */
export interface NamespaceGroup {
  namespace: string;
  baseColor: string;
  libraries: string[];
}

export function groupLibrariesByNamespace(libraries: string[]): NamespaceGroup[] {
  const namespaceMap = new Map<string, string[]>();

  libraries.forEach(lib => {
    const namespace = extractNamespace(lib);
    if (!namespaceMap.has(namespace)) {
      namespaceMap.set(namespace, []);
    }
    namespaceMap.get(namespace)!.push(lib);
  });

  return Array.from(namespaceMap.entries())
    .map(([namespace, libs]) => ({
      namespace,
      baseColor: getNamespaceColor(namespace),
      libraries: libs.sort(),
    }))
    .sort((a, b) => a.namespace.localeCompare(b.namespace));
}

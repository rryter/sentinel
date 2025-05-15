import { Pipe, PipeTransform } from '@angular/core';

/**
 * Transforms a string by displaying only the first 5 characters followed by asterisks.
 * Useful for partially hiding sensitive information like API tokens.
 */
@Pipe({
  name: 'obfuscated',
  standalone: true,
})
export class ObfuscatedPipe implements PipeTransform {
  /**
   * Transforms a string by showing the first 5 characters and replacing the rest with asterisks.
   *
   * @param value - The string to obfuscate
   * @returns The obfuscated string
   */
  transform(value: string | undefined | null): string {
    if (!value) {
      return '';
    }

    // Only show the first 5 characters, replace the rest with asterisks
    const visiblePart = value.substring(0, 5);

    // If the string is 5 characters or less, just return it
    if (value.length <= 5) {
      return value;
    }

    const hiddenPart = '*'.repeat(value.length - 5);

    return visiblePart + hiddenPart;
  }
}

/**
 * Generates a secure API token in browser environments
 * @param length The length of the token (default: 64)
 * @returns A secure random token string
 */
export function generateBrowserApiToken(length: number = 64): string {
  const array = new Uint8Array(length);
  window.crypto.getRandomValues(array);

  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

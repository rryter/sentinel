import { ObfuscatedPipe } from './obfuscated.pipe';

describe('ObfuscatedPipe', () => {
  let pipe: ObfuscatedPipe;

  beforeEach(() => {
    pipe = new ObfuscatedPipe();
  });

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return an empty string if input is null or undefined', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should keep the first 5 characters and replace the rest with asterisks', () => {
    expect(pipe.transform('abcdefghijk')).toBe('abcde******');
    expect(pipe.transform('12345678')).toBe('12345***');
  });

  it('should return the full string if length is 5 or less', () => {
    expect(pipe.transform('abcde')).toBe('abcde');
    expect(pipe.transform('abc')).toBe('abc');
  });

  it('should handle API token format correctly', () => {
    const token = 'U0NPUERhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYQ==';
    expect(pipe.transform(token)).toBe('U0NP' + '*'.repeat(token.length - 5));
  });
});

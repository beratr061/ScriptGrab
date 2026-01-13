/**
 * Property-Based Tests for File Format Validation
 * Feature: scriptgrab-transcriber, Property 2: File Format Validation
 * Validates: Requirements 1.1, 1.3, 1.4
 */

import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { 
  validateFileFormat, 
  getFileExtension, 
  SUPPORTED_EXTENSIONS,
  isSupportedExtension 
} from './validation';

// ============================================
// Arbitrary Generators
// ============================================

/**
 * Generate a valid filename (without extension)
 */
const filenameArbitrary = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0 && !s.includes('.') && !s.includes('/') && !s.includes('\\'));

/**
 * Generate a supported extension
 */
const supportedExtensionArbitrary = fc.constantFrom(...SUPPORTED_EXTENSIONS);

/**
 * Generate an unsupported extension
 */
const unsupportedExtensionArbitrary = fc.constantFrom(
  '.exe', '.dll', '.txt', '.pdf', '.doc', '.docx', 
  '.jpg', '.png', '.gif', '.zip', '.rar', '.html',
  '.css', '.js', '.ts', '.py', '.rs', '.ogg', '.flac'
);

/**
 * Generate case variations of an extension
 */
const caseVariationArbitrary = (ext: string): fc.Arbitrary<string> => {
  return fc.array(fc.boolean(), { minLength: ext.length, maxLength: ext.length })
    .map(bools => {
      return ext.split('').map((char, i) => 
        bools[i] ? char.toUpperCase() : char.toLowerCase()
      ).join('');
    });
};

// ============================================
// Property Tests
// ============================================

describe('Property 2: File Format Validation', () => {
  /**
   * Feature: scriptgrab-transcriber, Property 2: File Format Validation
   * 
   * *For any* file path string, the validation function SHALL return true 
   * if and only if the file extension is one of: .mp3, .wav, .m4a, .mp4, .mkv 
   * (case-insensitive).
   * 
   * Validates: Requirements 1.1, 1.3, 1.4
   */
  
  it('should accept all supported extensions (lowercase)', () => {
    fc.assert(
      fc.property(
        filenameArbitrary,
        supportedExtensionArbitrary,
        (filename, ext) => {
          const filePath = `${filename}${ext}`;
          return validateFileFormat(filePath) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept all supported extensions (case-insensitive)', () => {
    fc.assert(
      fc.property(
        filenameArbitrary,
        supportedExtensionArbitrary.chain(ext => caseVariationArbitrary(ext)),
        (filename, ext) => {
          const filePath = `${filename}${ext}`;
          return validateFileFormat(filePath) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject all unsupported extensions', () => {
    fc.assert(
      fc.property(
        filenameArbitrary,
        unsupportedExtensionArbitrary,
        (filename, ext) => {
          const filePath = `${filename}${ext}`;
          return validateFileFormat(filePath) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject files without extension', () => {
    fc.assert(
      fc.property(
        filenameArbitrary,
        (filename) => {
          return validateFileFormat(filename) === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle paths with directories', () => {
    fc.assert(
      fc.property(
        fc.array(filenameArbitrary, { minLength: 1, maxLength: 5 }),
        filenameArbitrary,
        supportedExtensionArbitrary,
        (dirs, filename, ext) => {
          const filePath = `${dirs.join('/')}/${filename}${ext}`;
          return validateFileFormat(filePath) === true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('getFileExtension', () => {
  it('should extract extension correctly for any filename with extension', () => {
    fc.assert(
      fc.property(
        filenameArbitrary,
        supportedExtensionArbitrary,
        (filename, ext) => {
          const filePath = `${filename}${ext}`;
          const extracted = getFileExtension(filePath);
          return extracted === ext.toLowerCase();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty string for files without extension', () => {
    fc.assert(
      fc.property(
        filenameArbitrary,
        (filename) => {
          return getFileExtension(filename) === '';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should normalize extension to lowercase', () => {
    fc.assert(
      fc.property(
        filenameArbitrary,
        supportedExtensionArbitrary.chain(ext => caseVariationArbitrary(ext)),
        (filename, ext) => {
          const filePath = `${filename}${ext}`;
          const extracted = getFileExtension(filePath);
          return extracted === ext.toLowerCase();
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('isSupportedExtension', () => {
  it('should accept supported extensions with dot prefix', () => {
    fc.assert(
      fc.property(
        supportedExtensionArbitrary,
        (ext) => {
          return isSupportedExtension(ext) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept supported extensions without dot prefix', () => {
    fc.assert(
      fc.property(
        supportedExtensionArbitrary,
        (ext) => {
          const extWithoutDot = ext.slice(1);
          return isSupportedExtension(extWithoutDot) === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject unsupported extensions', () => {
    fc.assert(
      fc.property(
        unsupportedExtensionArbitrary,
        (ext) => {
          return isSupportedExtension(ext) === false;
        }
      ),
      { numRuns: 100 }
    );
  });
});

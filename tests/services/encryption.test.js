/**
 * Property-based tests for EncryptionService
 * Validates: Requirements 6.2, 6.3, 6.5, 6.6, 6.7, 15.2, 15.3, 15.6
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { EncryptionService } = require('../../js/services/encryption.js');

// PBKDF2 with 200k iterations is intentionally slow; keep numRuns low
// and set a generous per-test timeout (ms).
const TEST_TIMEOUT = 120_000;
const RUNS_SLOW = 5;   // tests that call deriveKey (expensive)
const RUNS_FAST = 20;  // tests that reuse a pre-derived key

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Non-empty printable string (passwords) */
const passwordArb = fc.string({ minLength: 1, maxLength: 32 }).filter(s => s.trim().length > 0);

/** Two distinct passwords */
const twoDifferentPasswords = fc.tuple(passwordArb, passwordArb).filter(([a, b]) => a !== b);

/** Arbitrary plaintext */
const plaintextArb = fc.string({ minLength: 1, maxLength: 200 });

/** Arbitrary JSON-serializable card-like data */
const cardDataArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  number: fc.stringMatching(/^\d{16}$/),
  cvv: fc.stringMatching(/^\d{3}$/),
  expiry: fc.constant('2028-12'),
  creditLimit: fc.nat({ max: 100000 }),
});

/** Array of card-like objects */
const cardArrayArb = fc.array(cardDataArb, { minLength: 0, maxLength: 3 });

// ─── Property 43: Encryption Round Trip ──────────────────────────────────────
// Validates: Requirements 15.2, 15.3

describe('Property 43: Encryption Round Trip', () => {
  it(
    'encrypt then decrypt returns the original plaintext for any password and plaintext',
    async () => {
      await fc.assert(
        fc.asyncProperty(passwordArb, plaintextArb, async (password, plaintext) => {
          const svc = new EncryptionService();
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const key = await svc.deriveKey(password, salt);
          const ciphertext = await svc.encrypt(plaintext, key);
          const decrypted = await svc.decrypt(ciphertext, key);
          expect(decrypted).toBe(plaintext);
        }),
        { numRuns: RUNS_SLOW }
      );
    },
    TEST_TIMEOUT
  );
});

// ─── Property 21: Encryption Irreversibility Without Key ─────────────────────
// Validates: Requirements 15.2, 15.3, 15.6

describe('Property 21: Encryption Irreversibility Without Key', () => {
  it(
    'encrypted output differs from the original plaintext',
    async () => {
      await fc.assert(
        fc.asyncProperty(passwordArb, plaintextArb, async (password, plaintext) => {
          const svc = new EncryptionService();
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const key = await svc.deriveKey(password, salt);
          const ciphertext = await svc.encrypt(plaintext, key);
          expect(ciphertext).not.toBe(plaintext);
        }),
        { numRuns: RUNS_SLOW }
      );
    },
    TEST_TIMEOUT
  );

  it(
    'two different passwords produce different ciphertext for the same plaintext',
    async () => {
      await fc.assert(
        fc.asyncProperty(twoDifferentPasswords, plaintextArb, async ([pw1, pw2], plaintext) => {
          const svc = new EncryptionService();
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const key1 = await svc.deriveKey(pw1, salt);
          const key2 = await svc.deriveKey(pw2, salt);
          const ct1 = await svc.encrypt(plaintext, key1);
          const ct2 = await svc.encrypt(plaintext, key2);
          expect(ct1).not.toBe(ct2);
        }),
        { numRuns: RUNS_SLOW }
      );
    },
    TEST_TIMEOUT
  );
});

// ─── Property 24: Incorrect Password Rejection ───────────────────────────────
// Validates: Requirements 6.7, 15.6

describe('Property 24: Incorrect Password Rejection', () => {
  it(
    'decrypting with a different password rejects (throws)',
    async () => {
      await fc.assert(
        fc.asyncProperty(twoDifferentPasswords, plaintextArb, async ([correctPw, wrongPw], plaintext) => {
          const svc = new EncryptionService();
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const correctKey = await svc.deriveKey(correctPw, salt);
          const wrongKey = await svc.deriveKey(wrongPw, salt);
          const ciphertext = await svc.encrypt(plaintext, correctKey);
          await expect(svc.decrypt(ciphertext, wrongKey)).rejects.toThrow();
        }),
        { numRuns: RUNS_SLOW }
      );
    },
    TEST_TIMEOUT
  );

  it(
    'decryptImport with wrong password throws an error',
    async () => {
      await fc.assert(
        fc.asyncProperty(twoDifferentPasswords, cardArrayArb, async ([correctPw, wrongPw], cards) => {
          const svc = new EncryptionService();
          const pkg = await svc.encryptExport(cards, correctPw);
          await expect(svc.decryptImport(pkg, wrongPw)).rejects.toThrow();
        }),
        { numRuns: RUNS_SLOW }
      );
    },
    TEST_TIMEOUT
  );
});

// ─── Property 22: Export Package Structure ───────────────────────────────────
// Validates: Requirements 6.2, 6.3

describe('Property 22: Export Package Structure', () => {
  it(
    'encryptExport produces an object with version, salt, and data fields',
    async () => {
      await fc.assert(
        fc.asyncProperty(passwordArb, cardArrayArb, async (password, cards) => {
          const svc = new EncryptionService();
          const pkg = await svc.encryptExport(cards, password);
          expect(pkg).toBeTypeOf('object');
          expect(pkg.version).toBe(1);
          expect(typeof pkg.salt).toBe('string');
          expect(pkg.salt.length).toBeGreaterThan(0);
          expect(typeof pkg.data).toBe('string');
          expect(pkg.data.length).toBeGreaterThan(0);
        }),
        { numRuns: RUNS_SLOW }
      );
    },
    TEST_TIMEOUT
  );

  it(
    'encryptExport result is JSON-serializable and fields survive round-trip serialization',
    async () => {
      await fc.assert(
        fc.asyncProperty(passwordArb, cardArrayArb, async (password, cards) => {
          const svc = new EncryptionService();
          const pkg = await svc.encryptExport(cards, password);
          expect(() => JSON.stringify(pkg)).not.toThrow();
          const reparsed = JSON.parse(JSON.stringify(pkg));
          expect(reparsed.version).toBe(pkg.version);
          expect(reparsed.salt).toBe(pkg.salt);
          expect(reparsed.data).toBe(pkg.data);
        }),
        { numRuns: RUNS_SLOW }
      );
    },
    TEST_TIMEOUT
  );
});

// ─── Property 23: Export-Import Round Trip ───────────────────────────────────
// Validates: Requirements 6.2, 6.3, 6.5, 6.6

describe('Property 23: Export-Import Round Trip', () => {
  it(
    'encryptExport then decryptImport with correct password returns original data',
    async () => {
      await fc.assert(
        fc.asyncProperty(passwordArb, cardArrayArb, async (password, cards) => {
          const svc = new EncryptionService();
          const pkg = await svc.encryptExport(cards, password);
          const result = await svc.decryptImport(pkg, password);
          expect(result).toEqual(cards);
        }),
        { numRuns: RUNS_SLOW }
      );
    },
    TEST_TIMEOUT
  );

  it(
    'round-trip preserves data through JSON serialization of the package',
    async () => {
      await fc.assert(
        fc.asyncProperty(passwordArb, cardArrayArb, async (password, cards) => {
          const svc = new EncryptionService();
          const pkg = await svc.encryptExport(cards, password);
          // Simulate saving/loading the package as a JSON file
          const serialized = JSON.parse(JSON.stringify(pkg));
          const result = await svc.decryptImport(serialized, password);
          expect(result).toEqual(cards);
        }),
        { numRuns: RUNS_SLOW }
      );
    },
    TEST_TIMEOUT
  );
});

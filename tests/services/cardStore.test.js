/**
 * Property-based tests for CardStore service
 * Validates: Requirements 1.9, 3.3, 3.5, 5.1, 5.2, 5.3
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { CardStore } = require('../../js/services/cardStore.js');

// ─── localStorage mock ────────────────────────────────────────────────────────

function createLocalStorageMock() {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _reset: () => { store = {}; },
  };
}

const localStorageMock = createLocalStorageMock();

// Install mock before tests run
vi.stubGlobal('localStorage', localStorageMock);

// ─── No-op EncryptionService mock ─────────────────────────────────────────────
// Returns identity (no encryption) so tests focus on storage logic

const noopEncryption = {
  getKeyFromSession: async () => null, // no key → fields stored as-is
  encrypt: async (text) => text,
  decrypt: async (text) => text,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeStore() {
  localStorageMock._reset();
  return new CardStore(noopEncryption);
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Arbitrary plain card data (no id – store assigns one) */
const cardDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  number: fc.stringMatching(/^\d{16}$/),
  cvv: fc.stringMatching(/^\d{3}$/),
  expiry: fc.constant('2028-12'),
  annualFee: fc.nat({ max: 100000 }),
  creditLimit: fc.nat({ max: 10000000 }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
  network: fc.constantFrom('Visa', 'Mastercard', 'Amex', 'RuPay', 'Unknown'),
  bank: fc.string({ minLength: 1, maxLength: 50 }),
});

/** Arbitrary update payload (subset of card fields) */
const cardUpdateArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  annualFee: fc.nat({ max: 100000 }),
  creditLimit: fc.nat({ max: 10000000 }),
  network: fc.constantFrom('Visa', 'Mastercard', 'Amex', 'RuPay', 'Unknown'),
});

// ─── Property 6: Card Storage Round Trip ─────────────────────────────────────
// Validates: Requirements 1.9, 5.1, 5.2, 5.3

describe('Property 6: Card Storage Round Trip', () => {
  it(
    'after addCard(), getCardById() returns a card with the same data',
    async () => {
      await fc.assert(
        fc.asyncProperty(cardDataArb, async (cardData) => {
          const store = makeStore();
          const added = await store.addCard(cardData);

          expect(added.id).toBeDefined();

          const retrieved = await store.getCardById(added.id);
          expect(retrieved).not.toBeNull();

          // All original fields must be preserved
          expect(retrieved.name).toBe(cardData.name);
          expect(retrieved.number).toBe(cardData.number);
          expect(retrieved.cvv).toBe(cardData.cvv);
          expect(retrieved.expiry).toBe(cardData.expiry);
          expect(retrieved.annualFee).toBe(cardData.annualFee);
          expect(retrieved.creditLimit).toBe(cardData.creditLimit);
          expect(retrieved.tags).toEqual(cardData.tags);
          expect(retrieved.network).toBe(cardData.network);
          expect(retrieved.bank).toBe(cardData.bank);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'after addCard(), getAllCards() includes a card with the same data',
    async () => {
      await fc.assert(
        fc.asyncProperty(cardDataArb, async (cardData) => {
          const store = makeStore();
          const added = await store.addCard(cardData);

          const all = await store.getAllCards();
          const found = all.find(c => c.id === added.id);

          expect(found).toBeDefined();
          expect(found.name).toBe(cardData.name);
          expect(found.number).toBe(cardData.number);
          expect(found.cvv).toBe(cardData.cvv);
        }),
        { numRuns: 100 }
      );
    }
  );
});

// ─── Property 15: Card Update Persistence ────────────────────────────────────
// Validates: Requirements 3.3, 5.3

describe('Property 15: Card Update Persistence', () => {
  it(
    'after updateCard(), getAllCards() reflects the updated values',
    async () => {
      await fc.assert(
        fc.asyncProperty(cardDataArb, cardUpdateArb, async (cardData, updates) => {
          const store = makeStore();
          const added = await store.addCard(cardData);

          await store.updateCard(added.id, updates);

          const all = await store.getAllCards();
          const found = all.find(c => c.id === added.id);

          expect(found).toBeDefined();
          expect(found.name).toBe(updates.name);
          expect(found.annualFee).toBe(updates.annualFee);
          expect(found.creditLimit).toBe(updates.creditLimit);
          expect(found.network).toBe(updates.network);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'after updateCard(), getCardById() reflects the updated values',
    async () => {
      await fc.assert(
        fc.asyncProperty(cardDataArb, cardUpdateArb, async (cardData, updates) => {
          const store = makeStore();
          const added = await store.addCard(cardData);

          await store.updateCard(added.id, updates);

          const retrieved = await store.getCardById(added.id);
          expect(retrieved).not.toBeNull();
          expect(retrieved.name).toBe(updates.name);
          expect(retrieved.annualFee).toBe(updates.annualFee);
          expect(retrieved.creditLimit).toBe(updates.creditLimit);
          expect(retrieved.network).toBe(updates.network);
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'updateCard() preserves the card id and does not change unrelated cards',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          cardDataArb,
          cardDataArb,
          cardUpdateArb,
          async (card1Data, card2Data, updates) => {
            const store = makeStore();
            const card1 = await store.addCard(card1Data);
            const card2 = await store.addCard(card2Data);

            await store.updateCard(card1.id, updates);

            const retrieved2 = await store.getCardById(card2.id);
            expect(retrieved2).not.toBeNull();
            // card2 should be unchanged
            expect(retrieved2.name).toBe(card2Data.name);
          }
        ),
        { numRuns: 50 }
      );
    }
  );
});

// ─── Property 16: Card Deletion Completeness ─────────────────────────────────
// Validates: Requirements 3.5, 5.3

describe('Property 16: Card Deletion Completeness', () => {
  it(
    'after deleteCard(), getCardById() returns null',
    async () => {
      await fc.assert(
        fc.asyncProperty(cardDataArb, async (cardData) => {
          const store = makeStore();
          const added = await store.addCard(cardData);

          const deleted = await store.deleteCard(added.id);
          expect(deleted).toBe(true);

          const retrieved = await store.getCardById(added.id);
          expect(retrieved).toBeNull();
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'after deleteCard(), getAllCards() does not contain the deleted card',
    async () => {
      await fc.assert(
        fc.asyncProperty(cardDataArb, async (cardData) => {
          const store = makeStore();
          const added = await store.addCard(cardData);

          await store.deleteCard(added.id);

          const all = await store.getAllCards();
          const found = all.find(c => c.id === added.id);
          expect(found).toBeUndefined();
        }),
        { numRuns: 100 }
      );
    }
  );

  it(
    'deleting one card does not remove other cards',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          cardDataArb,
          cardDataArb,
          async (card1Data, card2Data) => {
            const store = makeStore();
            const card1 = await store.addCard(card1Data);
            const card2 = await store.addCard(card2Data);

            await store.deleteCard(card1.id);

            const retrieved2 = await store.getCardById(card2.id);
            expect(retrieved2).not.toBeNull();
            expect(retrieved2.id).toBe(card2.id);
          }
        ),
        { numRuns: 50 }
      );
    }
  );

  it(
    'deleteCard() returns false for a non-existent id',
    async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (nonExistentId) => {
          const store = makeStore();
          const result = await store.deleteCard(nonExistentId);
          expect(result).toBe(false);
        }),
        { numRuns: 50 }
      );
    }
  );
});

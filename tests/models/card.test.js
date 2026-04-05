/**
 * Property-based tests for Card model
 * Validates: Requirements 1.9, 2.5, 5.1, 5.2, 5.3
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { Card } = require('../../js/models/card.js');

// Arbitraries

/** Generate a valid YYYY-MM string for a past date */
const pastYearMonth = fc.tuple(
  fc.integer({ min: 2000, max: new Date().getFullYear() }),
  fc.integer({ min: 1, max: 12 })
).filter(([year, month]) => {
  const now = new Date();
  // Ensure the date is not in the future
  return year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth() + 1);
}).map(([year, month]) => `${year}-${String(month).padStart(2, '0')}`);

/** Generate a valid YYYY-MM string for a future expiry */
const futureYearMonth = fc.tuple(
  fc.integer({ min: new Date().getFullYear(), max: new Date().getFullYear() + 20 }),
  fc.integer({ min: 1, max: 12 })
).filter(([year, month]) => {
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth() + 1);
}).map(([year, month]) => `${year}-${String(month).padStart(2, '0')}`);

/** Generate arbitrary card data */
const cardDataArb = fc.record({
  name: fc.string({ minLength: 1, maxLength: 50 }),
  number: fc.stringMatching(/^\d{13,19}$/),
  cvv: fc.stringMatching(/^\d{3,4}$/),
  expiry: futureYearMonth,
  issueDate: fc.option(pastYearMonth, { nil: null }),
  statementDate: fc.option(fc.integer({ min: 1, max: 31 }), { nil: null }),
  dueDate: fc.option(fc.integer({ min: 1, max: 31 }), { nil: null }),
  annualFee: fc.nat({ max: 100000 }),
  creditLimit: fc.nat({ max: 10000000 }),
  sharedLimitWith: fc.array(fc.uuid(), { maxLength: 5 }),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 10 }),
  network: fc.constantFrom('Visa', 'Mastercard', 'Amex', 'RuPay', 'Unknown'),
  bank: fc.string({ minLength: 1, maxLength: 50 }),
  notificationsEnabled: fc.boolean(),
  reminderPeriod: fc.integer({ min: 1, max: 30 }),
});

// ─── Property 6: Card Storage Round Trip ────────────────────────────────────
// Validates: Requirements 1.9, 5.1, 5.2, 5.3

describe('Property 6: Card Storage Round Trip', () => {
  it('reconstructing a Card from toJSON() preserves all field values', () => {
    fc.assert(
      fc.property(cardDataArb, (data) => {
        const original = new Card(data);
        const json = original.toJSON();
        const reconstructed = new Card(json);

        // All serialized fields must round-trip correctly
        expect(reconstructed.id).toBe(original.id);
        expect(reconstructed.name).toBe(original.name);
        expect(reconstructed.number).toBe(original.number);
        expect(reconstructed.cvv).toBe(original.cvv);
        expect(reconstructed.expiry).toBe(original.expiry);
        expect(reconstructed.issueDate).toBe(original.issueDate);
        expect(reconstructed.statementDate).toEqual(original.statementDate);
        expect(reconstructed.dueDate).toEqual(original.dueDate);
        expect(reconstructed.annualFee).toBe(original.annualFee);
        expect(reconstructed.creditLimit).toBe(original.creditLimit);
        expect(reconstructed.sharedLimitWith).toEqual(original.sharedLimitWith);
        expect(reconstructed.tags).toEqual(original.tags);
        expect(reconstructed.network).toBe(original.network);
        expect(reconstructed.bank).toBe(original.bank);
        expect(reconstructed.notificationsEnabled).toBe(original.notificationsEnabled);
        expect(reconstructed.reminderPeriod).toBe(original.reminderPeriod);
        expect(reconstructed.createdAt).toBe(original.createdAt);
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 12: Card Age Calculation ──────────────────────────────────────
// Validates: Requirements 2.5

describe('Property 12: Card Age Calculation', () => {
  it('age.totalMonths is non-negative for any past issueDate', () => {
    fc.assert(
      fc.property(pastYearMonth, (issueDate) => {
        const card = new Card({ issueDate });
        const age = card.age;
        expect(age).not.toBeNull();
        expect(age.totalMonths).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 }
    );
  });

  it('age.years equals Math.floor(totalMonths / 12)', () => {
    fc.assert(
      fc.property(pastYearMonth, (issueDate) => {
        const card = new Card({ issueDate });
        const age = card.age;
        expect(age.years).toBe(Math.floor(age.totalMonths / 12));
      }),
      { numRuns: 200 }
    );
  });

  it('age.months equals totalMonths % 12', () => {
    fc.assert(
      fc.property(pastYearMonth, (issueDate) => {
        const card = new Card({ issueDate });
        const age = card.age;
        expect(age.months).toBe(age.totalMonths % 12);
      }),
      { numRuns: 200 }
    );
  });

  it('age.months is always in [0, 11]', () => {
    fc.assert(
      fc.property(pastYearMonth, (issueDate) => {
        const card = new Card({ issueDate });
        const age = card.age;
        expect(age.months).toBeGreaterThanOrEqual(0);
        expect(age.months).toBeLessThan(12);
      }),
      { numRuns: 200 }
    );
  });

  it('returns null when issueDate is not set', () => {
    const card = new Card({});
    expect(card.age).toBeNull();
  });
});

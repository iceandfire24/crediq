/**
 * Tests for StatisticsService
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6, 16.3, 16.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { StatisticsService } = require('../../js/services/statistics.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: overrides.name || 'Test Card',
    expiry: overrides.expiry || '2030-12',
    issueDate: overrides.issueDate || null,
    annualFee: overrides.annualFee ?? 0,
    creditLimit: overrides.creditLimit ?? 0,
    sharedLimitWith: overrides.sharedLimitWith || [],
    network: overrides.network || 'Visa',
    bank: overrides.bank || 'HDFC Bank',
    ...overrides
  };
}

function makeService(cards) {
  const cardStore = { getAllCards: async () => cards };
  return new StatisticsService(cardStore);
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('StatisticsService - calculateOverallStats', () => {
  it('returns zero counts for empty card list', async () => {
    const svc = makeService([]);
    const stats = await svc.calculateOverallStats();
    expect(stats.totalCards).toBe(0);
    expect(stats.totalFees).toBe(0);
    expect(stats.totalCreditLimit).toBe(0);
    expect(stats.averageAge).toBeNull();
    expect(stats.expiringCards).toEqual([]);
  });

  it('counts total cards correctly (Req 7.1)', async () => {
    const cards = [makeCard(), makeCard(), makeCard()];
    const svc = makeService(cards);
    const stats = await svc.calculateOverallStats();
    expect(stats.totalCards).toBe(3);
  });

  it('sums annual fees correctly (Req 7.2)', async () => {
    const cards = [
      makeCard({ annualFee: 500 }),
      makeCard({ annualFee: 1000 }),
      makeCard({ annualFee: 250 })
    ];
    const svc = makeService(cards);
    const stats = await svc.calculateOverallStats();
    expect(stats.totalFees).toBe(1750);
  });
});

describe('StatisticsService - calculateTotalCreditLimit', () => {
  it('sums individual credit limits when no sharing (Req 7.3)', () => {
    const svc = makeService([]);
    const cards = [
      makeCard({ creditLimit: 100000 }),
      makeCard({ creditLimit: 200000 }),
      makeCard({ creditLimit: 50000 })
    ];
    expect(svc.calculateTotalCreditLimit(cards)).toBe(350000);
  });

  it('counts shared limit only once using highest value (Req 16.3, 16.4)', () => {
    const svc = makeService([]);
    const idA = 'card-a';
    const idB = 'card-b';
    const cards = [
      makeCard({ id: idA, creditLimit: 200000, sharedLimitWith: [idB] }),
      makeCard({ id: idB, creditLimit: 150000, sharedLimitWith: [idA] })
    ];
    // Should count only once: max(200000, 150000) = 200000
    expect(svc.calculateTotalCreditLimit(cards)).toBe(200000);
  });

  it('handles mix of shared and individual cards (Req 16.4)', () => {
    const svc = makeService([]);
    const idA = 'card-a';
    const idB = 'card-b';
    const cards = [
      makeCard({ id: idA, creditLimit: 200000, sharedLimitWith: [idB] }),
      makeCard({ id: idB, creditLimit: 150000, sharedLimitWith: [idA] }),
      makeCard({ id: 'card-c', creditLimit: 100000, sharedLimitWith: [] })
    ];
    // 200000 (shared group max) + 100000 (individual) = 300000
    expect(svc.calculateTotalCreditLimit(cards)).toBe(300000);
  });

  it('returns 0 for empty card list', () => {
    const svc = makeService([]);
    expect(svc.calculateTotalCreditLimit([])).toBe(0);
  });

  it('handles cards with missing creditLimit gracefully', () => {
    const svc = makeService([]);
    const cards = [
      { id: 'x', sharedLimitWith: [] },
      { id: 'y', creditLimit: 50000, sharedLimitWith: [] }
    ];
    expect(svc.calculateTotalCreditLimit(cards)).toBe(50000);
  });
});

describe('StatisticsService - calculateAverageAge', () => {
  it('returns null when no cards have issue dates (Req 7.6)', () => {
    const svc = makeService([]);
    expect(svc.calculateAverageAge([makeCard(), makeCard()])).toBeNull();
  });

  it('returns null for empty array', () => {
    const svc = makeService([]);
    expect(svc.calculateAverageAge([])).toBeNull();
  });

  it('returns age object with years, months, totalMonths (Req 7.6)', () => {
    const svc = makeService([]);
    // Issue date 24 months ago
    const now = new Date();
    const issueDate = new Date(now.getFullYear() - 2, now.getMonth(), 1);
    const issueDateStr = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}`;
    const cards = [makeCard({ issueDate: issueDateStr })];
    const age = svc.calculateAverageAge(cards);
    expect(age).not.toBeNull();
    expect(age.totalMonths).toBeGreaterThanOrEqual(23);
    expect(age.totalMonths).toBeLessThanOrEqual(25);
    expect(age.years).toBe(2);
    expect(typeof age.months).toBe('number');
  });

  it('ignores cards without issue dates when averaging', () => {
    const svc = makeService([]);
    const now = new Date();
    const issueDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const issueDateStr = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}`;
    const cards = [
      makeCard({ issueDate: issueDateStr }),
      makeCard({ issueDate: null }) // should be ignored
    ];
    const age = svc.calculateAverageAge(cards);
    expect(age).not.toBeNull();
    expect(age.totalMonths).toBeGreaterThanOrEqual(11);
    expect(age.totalMonths).toBeLessThanOrEqual(13);
  });
});

describe('StatisticsService - findExpiringCards', () => {
  it('returns cards expiring within the given months window', () => {
    const svc = makeService([]);
    const now = new Date();
    const soon = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const soonStr = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, '0')}`;
    const far = new Date(now.getFullYear() + 2, now.getMonth(), 1);
    const farStr = `${far.getFullYear()}-${String(far.getMonth() + 1).padStart(2, '0')}`;

    const cards = [
      makeCard({ id: 'soon', expiry: soonStr }),
      makeCard({ id: 'far', expiry: farStr })
    ];
    const expiring = svc.findExpiringCards(cards, 3);
    expect(expiring.map(c => c.id)).toContain('soon');
    expect(expiring.map(c => c.id)).not.toContain('far');
  });

  it('does not include already-expired cards', () => {
    const svc = makeService([]);
    const past = '2020-01';
    const cards = [makeCard({ id: 'expired', expiry: past })];
    const expiring = svc.findExpiringCards(cards, 3);
    expect(expiring).toHaveLength(0);
  });

  it('returns empty array when no cards are expiring soon', () => {
    const svc = makeService([]);
    const far = '2035-12';
    const cards = [makeCard({ expiry: far })];
    expect(svc.findExpiringCards(cards, 3)).toHaveLength(0);
  });
});

describe('StatisticsService - calculateNetworkStats', () => {
  it('groups cards by network (Req 7.4)', async () => {
    const cards = [
      makeCard({ network: 'Visa', annualFee: 500, creditLimit: 100000 }),
      makeCard({ network: 'Visa', annualFee: 1000, creditLimit: 200000 }),
      makeCard({ network: 'Mastercard', annualFee: 750, creditLimit: 150000 })
    ];
    const svc = makeService(cards);
    const stats = await svc.calculateNetworkStats();

    const visa = stats.find(s => s.network === 'Visa');
    const mc = stats.find(s => s.network === 'Mastercard');

    expect(visa).toBeDefined();
    expect(visa.totalCards).toBe(2);
    expect(visa.totalFees).toBe(1500);

    expect(mc).toBeDefined();
    expect(mc.totalCards).toBe(1);
    expect(mc.totalFees).toBe(750);
  });

  it('returns empty array for no cards', async () => {
    const svc = makeService([]);
    const stats = await svc.calculateNetworkStats();
    expect(stats).toEqual([]);
  });
});

describe('StatisticsService - calculateBankStats', () => {
  it('groups cards by bank', async () => {
    const cards = [
      makeCard({ bank: 'HDFC Bank', annualFee: 500 }),
      makeCard({ bank: 'HDFC Bank', annualFee: 1000 }),
      makeCard({ bank: 'ICICI Bank', annualFee: 750 })
    ];
    const svc = makeService(cards);
    const stats = await svc.calculateBankStats();

    const hdfc = stats.find(s => s.bank === 'HDFC Bank');
    const icici = stats.find(s => s.bank === 'ICICI Bank');

    expect(hdfc.totalCards).toBe(2);
    expect(hdfc.totalFees).toBe(1500);
    expect(icici.totalCards).toBe(1);
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

/**
 * Validates: Requirements 7.1, 7.2
 * Property: totalCards and totalFees are always non-negative and consistent
 */
describe('Property: Overall stats are consistent with card list', () => {
  const cardArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    expiry: fc.constant('2030-12'),
    issueDate: fc.option(fc.constant('2020-01'), { nil: null }),
    annualFee: fc.nat({ max: 50000 }),
    creditLimit: fc.nat({ max: 5000000 }),
    sharedLimitWith: fc.constant([]),
    network: fc.constantFrom('Visa', 'Mastercard', 'RuPay', 'Unknown'),
    bank: fc.constantFrom('HDFC Bank', 'ICICI Bank', 'Axis Bank')
  });

  it('totalCards equals the number of cards provided (Req 7.1)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(cardArb, { maxLength: 20 }), async (cards) => {
        const svc = makeService(cards);
        const stats = await svc.calculateOverallStats();
        expect(stats.totalCards).toBe(cards.length);
      }),
      { numRuns: 100 }
    );
  });

  it('totalFees equals sum of all annualFee values (Req 7.2)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(cardArb, { maxLength: 20 }), async (cards) => {
        const svc = makeService(cards);
        const stats = await svc.calculateOverallStats();
        const expectedFees = cards.reduce((s, c) => s + c.annualFee, 0);
        expect(stats.totalFees).toBe(expectedFees);
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Validates: Requirements 16.3, 16.4
 * Property: Total credit limit with shared cards is always <= sum of individual limits
 */
describe('Property: Shared limit deduplication never inflates total (Req 16.3, 16.4)', () => {
  const sharedPairArb = fc.tuple(fc.uuid(), fc.uuid()).chain(([idA, idB]) =>
    fc.tuple(
      fc.nat({ max: 1000000 }),
      fc.nat({ max: 1000000 })
    ).map(([limitA, limitB]) => [
      { id: idA, creditLimit: limitA, sharedLimitWith: [idB], annualFee: 0, network: 'Visa', bank: 'HDFC', name: 'A', expiry: '2030-12', issueDate: null },
      { id: idB, creditLimit: limitB, sharedLimitWith: [idA], annualFee: 0, network: 'Visa', bank: 'HDFC', name: 'B', expiry: '2030-12', issueDate: null }
    ])
  );

  it('shared pair counts only once (max of the two limits)', () => {
    fc.assert(
      fc.property(sharedPairArb, ([cardA, cardB]) => {
        const svc = makeService([]);
        const total = svc.calculateTotalCreditLimit([cardA, cardB]);
        const expected = Math.max(cardA.creditLimit, cardB.creditLimit);
        expect(total).toBe(expected);
      }),
      { numRuns: 200 }
    );
  });

  it('total with shared pair is always <= naive sum', () => {
    fc.assert(
      fc.property(sharedPairArb, ([cardA, cardB]) => {
        const svc = makeService([]);
        const total = svc.calculateTotalCreditLimit([cardA, cardB]);
        const naiveSum = cardA.creditLimit + cardB.creditLimit;
        expect(total).toBeLessThanOrEqual(naiveSum);
      }),
      { numRuns: 200 }
    );
  });
});

/**
 * Validates: Requirement 7.4
 * Property: Sum of per-network card counts equals total card count
 */
describe('Property: Network stats card counts sum to total (Req 7.4)', () => {
  const cardArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    expiry: fc.constant('2030-12'),
    issueDate: fc.constant(null),
    annualFee: fc.nat({ max: 10000 }),
    creditLimit: fc.nat({ max: 500000 }),
    sharedLimitWith: fc.constant([]),
    network: fc.constantFrom('Visa', 'Mastercard', 'RuPay', 'Unknown'),
    bank: fc.constant('HDFC Bank')
  });

  it('sum of network totalCards equals overall totalCards', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(cardArb, { maxLength: 20 }), async (cards) => {
        const svc = makeService(cards);
        const networkStats = await svc.calculateNetworkStats();
        const networkTotal = networkStats.reduce((s, n) => s + n.totalCards, 0);
        expect(networkTotal).toBe(cards.length);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Named Property Tests (Properties 25-29) ─────────────────────────────────

/**
 * Property 25: Card Count Accuracy
 * Validates: Requirements 7.1
 *
 * For any card collection, the calculated total number of cards SHALL equal
 * the length of the card array.
 */
describe('Property 25: Card Count Accuracy', () => {
  const cardArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    expiry: fc.constant('2030-12'),
    issueDate: fc.constant(null),
    annualFee: fc.nat({ max: 50000 }),
    creditLimit: fc.nat({ max: 5000000 }),
    sharedLimitWith: fc.constant([]),
    network: fc.constantFrom('Visa', 'Mastercard', 'RuPay', 'Unknown'),
    bank: fc.constantFrom('HDFC Bank', 'ICICI Bank', 'Axis Bank')
  });

  it('totalCards always equals the length of the card array (Req 7.1)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(cardArb, { maxLength: 30 }), async (cards) => {
        const svc = makeService(cards);
        const stats = await svc.calculateOverallStats();
        expect(stats.totalCards).toBe(cards.length);
      }),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 26: Annual Fee Sum Accuracy
 * Validates: Requirements 7.2
 *
 * For any card collection, the calculated total annual fees SHALL equal
 * the sum of all individual card annual fees.
 */
describe('Property 26: Annual Fee Sum Accuracy', () => {
  const cardArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    expiry: fc.constant('2030-12'),
    issueDate: fc.constant(null),
    annualFee: fc.nat({ max: 50000 }),
    creditLimit: fc.nat({ max: 5000000 }),
    sharedLimitWith: fc.constant([]),
    network: fc.constantFrom('Visa', 'Mastercard', 'RuPay', 'Unknown'),
    bank: fc.constantFrom('HDFC Bank', 'ICICI Bank', 'Axis Bank')
  });

  it('totalFees always equals sum of all annualFee values (Req 7.2)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(cardArb, { maxLength: 30 }), async (cards) => {
        const svc = makeService(cards);
        const stats = await svc.calculateOverallStats();
        const expectedFees = cards.reduce((sum, c) => sum + c.annualFee, 0);
        expect(stats.totalFees).toBe(expectedFees);
      }),
      { numRuns: 200 }
    );
  });

  it('calculateTotalFees is additive: fees(A ∪ B) = fees(A) + fees(B) for disjoint sets', () => {
    const cardArb2 = fc.record({
      id: fc.uuid(),
      annualFee: fc.nat({ max: 50000 }),
      creditLimit: fc.nat({ max: 5000000 }),
      sharedLimitWith: fc.constant([]),
      network: fc.constant('Visa'),
      bank: fc.constant('HDFC Bank'),
      name: fc.constant('Card'),
      expiry: fc.constant('2030-12'),
      issueDate: fc.constant(null)
    });
    fc.assert(
      fc.property(
        fc.array(cardArb2, { maxLength: 15 }),
        fc.array(cardArb2, { maxLength: 15 }),
        (setA, setB) => {
          const svc = makeService([]);
          const feesA = svc.calculateTotalFees(setA);
          const feesB = svc.calculateTotalFees(setB);
          const feesAll = svc.calculateTotalFees([...setA, ...setB]);
          expect(feesAll).toBe(feesA + feesB);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 27: Shared Limit Deduplication
 * Validates: Requirements 7.3, 16.3, 16.4
 *
 * For any card collection with shared limits, the calculated total credit limit
 * SHALL count each shared limit group only once, not once per card in the group.
 */
describe('Property 27: Shared Limit Deduplication', () => {
  // Arbitrary: a pair of cards sharing a limit
  const sharedPairArb = fc.tuple(fc.uuid(), fc.uuid()).chain(([idA, idB]) =>
    fc.tuple(
      fc.nat({ max: 1000000 }),
      fc.nat({ max: 1000000 })
    ).map(([limitA, limitB]) => [
      { id: idA, creditLimit: limitA, sharedLimitWith: [idB], annualFee: 0, network: 'Visa', bank: 'HDFC', name: 'A', expiry: '2030-12', issueDate: null },
      { id: idB, creditLimit: limitB, sharedLimitWith: [idA], annualFee: 0, network: 'Visa', bank: 'HDFC', name: 'B', expiry: '2030-12', issueDate: null }
    ])
  );

  // Arbitrary: N independent cards (no sharing)
  const independentCardArb = fc.record({
    id: fc.uuid(),
    creditLimit: fc.nat({ max: 1000000 }),
    sharedLimitWith: fc.constant([]),
    annualFee: fc.constant(0),
    network: fc.constant('Visa'),
    bank: fc.constant('HDFC'),
    name: fc.constant('Card'),
    expiry: fc.constant('2030-12'),
    issueDate: fc.constant(null)
  });

  it('shared pair is counted only once (max of the two limits) (Req 16.3, 16.4)', () => {
    fc.assert(
      fc.property(sharedPairArb, ([cardA, cardB]) => {
        const svc = makeService([]);
        const total = svc.calculateTotalCreditLimit([cardA, cardB]);
        const expected = Math.max(cardA.creditLimit, cardB.creditLimit);
        expect(total).toBe(expected);
      }),
      { numRuns: 300 }
    );
  });

  it('total with shared pair is always <= naive sum of individual limits (Req 16.4)', () => {
    fc.assert(
      fc.property(sharedPairArb, ([cardA, cardB]) => {
        const svc = makeService([]);
        const total = svc.calculateTotalCreditLimit([cardA, cardB]);
        const naiveSum = cardA.creditLimit + cardB.creditLimit;
        expect(total).toBeLessThanOrEqual(naiveSum);
      }),
      { numRuns: 300 }
    );
  });

  it('adding independent cards to a shared pair increases total by exactly their individual limits (Req 7.3)', () => {
    fc.assert(
      fc.property(
        sharedPairArb,
        fc.array(independentCardArb, { minLength: 1, maxLength: 5 }),
        ([cardA, cardB], independents) => {
          const svc = makeService([]);
          const sharedTotal = svc.calculateTotalCreditLimit([cardA, cardB]);
          const combinedTotal = svc.calculateTotalCreditLimit([cardA, cardB, ...independents]);
          const independentSum = independents.reduce((s, c) => s + c.creditLimit, 0);
          expect(combinedTotal).toBe(sharedTotal + independentSum);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('total credit limit is always non-negative (Req 7.3)', () => {
    fc.assert(
      fc.property(
        fc.array(independentCardArb, { maxLength: 20 }),
        (cards) => {
          const svc = makeService([]);
          const total = svc.calculateTotalCreditLimit(cards);
          expect(total).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 28: Network Statistics Grouping
 * Validates: Requirements 7.4
 *
 * For any card collection, the statistics grouped by network SHALL include all
 * cards, with each card appearing in exactly one network group.
 */
describe('Property 28: Network Statistics Grouping', () => {
  const cardArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1 }),
    expiry: fc.constant('2030-12'),
    issueDate: fc.constant(null),
    annualFee: fc.nat({ max: 10000 }),
    creditLimit: fc.nat({ max: 500000 }),
    sharedLimitWith: fc.constant([]),
    network: fc.constantFrom('Visa', 'Mastercard', 'RuPay', 'Unknown'),
    bank: fc.constant('HDFC Bank')
  });

  it('sum of per-network card counts equals total card count (Req 7.4)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(cardArb, { maxLength: 30 }), async (cards) => {
        const svc = makeService(cards);
        const networkStats = await svc.calculateNetworkStats();
        const networkTotal = networkStats.reduce((s, n) => s + n.totalCards, 0);
        expect(networkTotal).toBe(cards.length);
      }),
      { numRuns: 200 }
    );
  });

  it('sum of per-network fees equals total fees (Req 7.4)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(cardArb, { maxLength: 30 }), async (cards) => {
        const svc = makeService(cards);
        const networkStats = await svc.calculateNetworkStats();
        const networkFeeTotal = networkStats.reduce((s, n) => s + n.totalFees, 0);
        const expectedFees = cards.reduce((s, c) => s + c.annualFee, 0);
        expect(networkFeeTotal).toBe(expectedFees);
      }),
      { numRuns: 200 }
    );
  });

  it('each network group name is unique (no duplicate network entries) (Req 7.4)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(cardArb, { maxLength: 30 }), async (cards) => {
        const svc = makeService(cards);
        const networkStats = await svc.calculateNetworkStats();
        const networkNames = networkStats.map(n => n.network);
        const uniqueNames = new Set(networkNames);
        expect(uniqueNames.size).toBe(networkNames.length);
      }),
      { numRuns: 200 }
    );
  });

  it('every network present in cards appears in network stats (Req 7.4)', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(cardArb, { minLength: 1, maxLength: 30 }), async (cards) => {
        const svc = makeService(cards);
        const networkStats = await svc.calculateNetworkStats();
        const statNetworks = new Set(networkStats.map(n => n.network));
        const cardNetworks = new Set(cards.map(c => c.network || 'Unknown'));
        for (const net of cardNetworks) {
          expect(statNetworks.has(net)).toBe(true);
        }
      }),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 29: Average Age Calculation
 * Validates: Requirements 7.6
 *
 * For any card collection where all cards have issue dates, the calculated
 * average age SHALL equal the sum of all card ages divided by the number of cards.
 */
describe('Property 29: Average Age Calculation', () => {
  // Generate a past YYYY-MM date string (1 to 120 months ago)
  const pastIssueDateArb = fc.integer({ min: 1, max: 120 }).map((monthsAgo) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const cardWithAgeArb = fc.record({
    id: fc.uuid(),
    name: fc.constant('Card'),
    expiry: fc.constant('2030-12'),
    issueDate: pastIssueDateArb,
    annualFee: fc.nat({ max: 10000 }),
    creditLimit: fc.nat({ max: 500000 }),
    sharedLimitWith: fc.constant([]),
    network: fc.constant('Visa'),
    bank: fc.constant('HDFC Bank')
  });

  it('returns null when no cards have issue dates (Req 7.6)', () => {
    const svc = makeService([]);
    const cards = [
      makeCard({ issueDate: null }),
      makeCard({ issueDate: null })
    ];
    expect(svc.calculateAverageAge(cards)).toBeNull();
  });

  it('returns null for empty array (Req 7.6)', () => {
    const svc = makeService([]);
    expect(svc.calculateAverageAge([])).toBeNull();
  });

  it('average age totalMonths equals rounded mean of individual card ages (Req 7.6)', () => {
    fc.assert(
      fc.property(
        fc.array(cardWithAgeArb, { minLength: 1, maxLength: 20 }),
        (cards) => {
          const svc = makeService([]);
          const result = svc.calculateAverageAge(cards);
          expect(result).not.toBeNull();

          // Compute expected average independently
          const now = new Date();
          const totalMonths = cards.reduce((sum, card) => {
            const issue = new Date(card.issueDate);
            const months = (now.getFullYear() - issue.getFullYear()) * 12
              + (now.getMonth() - issue.getMonth());
            return sum + months;
          }, 0);
          const expectedAvg = Math.round(totalMonths / cards.length);

          expect(result.totalMonths).toBe(expectedAvg);
          expect(result.years).toBe(Math.floor(expectedAvg / 12));
          expect(result.months).toBe(expectedAvg % 12);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('cards without issue dates are excluded from the average (Req 7.6)', () => {
    fc.assert(
      fc.property(
        fc.array(cardWithAgeArb, { minLength: 1, maxLength: 10 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.constant('NoDate'),
            expiry: fc.constant('2030-12'),
            issueDate: fc.constant(null),
            annualFee: fc.constant(0),
            creditLimit: fc.constant(0),
            sharedLimitWith: fc.constant([]),
            network: fc.constant('Visa'),
            bank: fc.constant('HDFC Bank')
          }),
          { maxLength: 5 }
        ),
        (cardsWithDates, cardsWithoutDates) => {
          const svc = makeService([]);
          const mixed = [...cardsWithDates, ...cardsWithoutDates];
          const resultMixed = svc.calculateAverageAge(mixed);
          const resultDatesOnly = svc.calculateAverageAge(cardsWithDates);

          // Both should produce the same result since no-date cards are excluded
          expect(resultMixed).toEqual(resultDatesOnly);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('average age totalMonths is always non-negative for past issue dates (Req 7.6)', () => {
    fc.assert(
      fc.property(
        fc.array(cardWithAgeArb, { minLength: 1, maxLength: 20 }),
        (cards) => {
          const svc = makeService([]);
          const result = svc.calculateAverageAge(cards);
          expect(result).not.toBeNull();
          expect(result.totalMonths).toBeGreaterThanOrEqual(0);
          expect(result.years).toBeGreaterThanOrEqual(0);
          expect(result.months).toBeGreaterThanOrEqual(0);
          expect(result.months).toBeLessThan(12);
        }
      ),
      { numRuns: 200 }
    );
  });
});

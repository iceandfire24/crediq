// @vitest-environment jsdom
/**
 * Property-based tests for CardFormView
 * Validates: Requirements 16.1, 16.6
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { CardFormView } = require('../../js/views/cardForm.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createContainer() {
  return document.createElement('div');
}

const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'];

/** Build a minimal card object */
function makeCard(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: overrides.name || 'Test Card',
    number: '4532015112830366',
    cvv: '123',
    expiry: '2099-12',
    bank: overrides.bank || 'HDFC Bank',
    network: 'Visa',
    tags: [],
    sharedLimitWith: [],
    ...overrides,
  };
}

/**
 * Build a CardController stub whose getSharedLimitCards delegates to the
 * real filtering logic: same bank, excluding the given id.
 */
function makeCardController(allCards) {
  return {
    getAllCards: vi.fn(async () => allCards),
    getSharedLimitCards: vi.fn(async (bankName, excludeId = null) => {
      if (!bankName || bankName === 'Unknown') return [];
      return allCards.filter(
        c => c.bank === bankName && c.id !== excludeId
      );
    }),
  };
}

function makeValidator() {
  return { validateForm: vi.fn(() => ({ valid: true, errors: {} })) };
}

function makeDetector(bank = 'Unknown') {
  return {
    detectNetwork: vi.fn(() => 'Unknown'),
    detectBank: vi.fn(() => bank),
    getBankColor: vi.fn(() => '#64748b'),
    getNetworkLogo: vi.fn(() => 'assets/icons/placeholder.png'),
    getBankLogo: vi.fn(() => 'assets/icons/placeholder.png'),
  };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Arbitrary for a single card with a bank from the known list */
const cardArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  bank: fc.constantFrom(...BANKS),
}).map(({ id, name, bank }) => makeCard({ id, name, bank }));

/**
 * Arbitrary that produces:
 *   - targetBank: the bank of the card being edited
 *   - currentCard: the card being edited (from targetBank)
 *   - otherCards: a mix of cards from targetBank and other banks
 */
const scenarioArb = fc
  .tuple(
    fc.constantFrom(...BANKS),                          // targetBank
    fc.uuid(),                                          // currentCard id
    fc.array(cardArb, { minLength: 0, maxLength: 15 }) // pool of other cards
  )
  .map(([targetBank, currentId, pool]) => {
    const currentCard = makeCard({ id: currentId, bank: targetBank });
    // Ensure pool cards have unique ids different from currentId
    const otherCards = pool
      .filter(c => c.id !== currentId)
      .map((c, i) => ({ ...c, id: `pool-${i}-${c.id}` }));
    return { targetBank, currentCard, otherCards };
  });

// ─── Property 44: Shared Limit Dropdown Filtering ────────────────────────────
// **Validates: Requirements 16.1, 16.6**

describe('Property 44: Shared Limit Dropdown Filtering', () => {
  it('dropdown only contains cards from the same bank as the current card', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async ({ targetBank, currentCard, otherCards }) => {
        const allCards = [currentCard, ...otherCards];
        const container = createContainer();
        const ctrl = makeCardController(allCards);
        const view = new CardFormView(container, ctrl, makeValidator(), makeDetector(targetBank));

        await view.render(currentCard);

        const select = container.querySelector('#field-sharedLimitWith');

        // If the select is disabled there are no same-bank cards — that's valid
        if (!select || select.disabled) {
          // Verify there truly are no other cards from the same bank
          const sameBankOthers = otherCards.filter(c => c.bank === targetBank);
          expect(sameBankOthers).toHaveLength(0);
          return;
        }

        // Every option value must correspond to a card from targetBank
        const options = Array.from(select.options).filter(o => o.value !== '');
        for (const option of options) {
          const matchingCard = allCards.find(c => c.id === option.value);
          expect(matchingCard, `option "${option.value}" should map to a real card`).toBeDefined();
          expect(matchingCard.bank).toBe(targetBank);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('the current card itself is never listed in the dropdown', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async ({ targetBank, currentCard, otherCards }) => {
        // Ensure at least one other same-bank card so the dropdown is enabled
        const sameBankPeer = makeCard({ id: 'peer-card', bank: targetBank, name: 'Peer Card' });
        const allCards = [currentCard, sameBankPeer, ...otherCards];

        const container = createContainer();
        const ctrl = makeCardController(allCards);
        const view = new CardFormView(container, ctrl, makeValidator(), makeDetector(targetBank));

        await view.render(currentCard);

        const select = container.querySelector('#field-sharedLimitWith');
        if (!select || select.disabled) return; // no same-bank cards — skip

        const optionValues = Array.from(select.options).map(o => o.value);
        expect(optionValues).not.toContain(currentCard.id);
      }),
      { numRuns: 100 }
    );
  });

  it('cards from other banks are never listed in the dropdown', async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async ({ targetBank, currentCard, otherCards }) => {
        const allCards = [currentCard, ...otherCards];
        const container = createContainer();
        const ctrl = makeCardController(allCards);
        const view = new CardFormView(container, ctrl, makeValidator(), makeDetector(targetBank));

        await view.render(currentCard);

        const select = container.querySelector('#field-sharedLimitWith');
        if (!select || select.disabled) return;

        const optionValues = Array.from(select.options)
          .map(o => o.value)
          .filter(Boolean);

        const otherBankCards = otherCards.filter(c => c.bank !== targetBank);
        for (const card of otherBankCards) {
          expect(optionValues).not.toContain(card.id);
        }
      }),
      { numRuns: 100 }
    );
  });
});

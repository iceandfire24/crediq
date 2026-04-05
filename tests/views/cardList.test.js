// @vitest-environment jsdom
/**
 * Property-based tests for CardListView
 * Validates: Requirements 4.1, 17.1, 17.5, 17.8
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { CardListView } = require('../../js/views/cardList.js');
const { DetectorService } = require('../../js/services/detector.js');

// ─── DOM setup ────────────────────────────────────────────────────────────────

function createContainer() {
  // Create a detached container — no need to attach to body
  return document.createElement('div');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a CardListView with a real DetectorService injected via global,
 * and minimal stubs for the other controllers.
 */
function makeView(container) {
  // Inject detectorService as a global (mirrors how the browser app works)
  global.detectorService = new DetectorService();
  return new CardListView(container, null, null, null);
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const NETWORKS = ['Visa', 'Mastercard', 'American Express', 'RuPay', 'Diners Club', 'Discover', 'Unknown'];
const BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'Unknown'];

/** Arbitrary for a single card object */
const cardArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }),
  number: fc.stringMatching(/^\d{16}$/),
  network: fc.constantFrom(...NETWORKS),
  bank: fc.constantFrom(...BANKS),
  expiry: fc.constant('2028-12'),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 15 }), { maxLength: 3 }),
  maskedNumber: fc.constant('•••• 1234'),
});

/** Arbitrary for a non-empty array of cards */
const cardArrayArb = fc.array(cardArb, { minLength: 1, maxLength: 20 });

/** Arbitrary for two or more cards sharing the same bank */
const sameBankCardsArb = fc
  .tuple(fc.constantFrom(...BANKS), fc.array(cardArb, { minLength: 2, maxLength: 10 }))
  .map(([bank, cards]) => cards.map(c => ({ ...c, bank })));

// ─── Property 17: Card List Completeness ─────────────────────────────────────
// Validates: Requirement 4.1

describe('Property 17: Card List Completeness', () => {
  it('every card in the input array appears in the rendered output', () => {
    fc.assert(
      fc.property(cardArrayArb, (cards) => {
        const container = createContainer();
        const view = makeView(container);

        // Set up the grid element that _renderCardGrid looks for
        const grid = document.createElement('div');
        grid.id = 'card-grid';
        container.appendChild(grid);

        view._allCards = cards;
        view._renderCardGrid(cards);

        for (const card of cards) {
          const el = grid.querySelector(`[data-card-id="${card.id}"]`);
          expect(el, `card with id ${card.id} should be in the grid`).not.toBeNull();

          const nameEl = el.querySelector('.card-item-name');
          expect(nameEl).not.toBeNull();
          // Compare trimmed text (whitespace-only names may be trimmed by the DOM)
          expect(nameEl.textContent.trim()).toBe(card.name.trim());
        }
      }),
      { numRuns: 100 }
    );
  });

  it('the number of rendered card items equals the number of input cards', () => {
    fc.assert(
      fc.property(cardArrayArb, (cards) => {
        const container = createContainer();
        const view = makeView(container);

        const grid = document.createElement('div');
        grid.id = 'card-grid';
        container.appendChild(grid);

        view._allCards = cards;
        view._renderCardGrid(cards);

        const items = grid.querySelectorAll('.card-item');
        expect(items.length).toBe(cards.length);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 47: Network Logo Display ───────────────────────────────────────
// Validates: Requirement 17.1

describe('Property 47: Network Logo Display', () => {
  it('each rendered card contains a network logo element (img or placeholder span)', () => {
    fc.assert(
      fc.property(cardArb, (card) => {
        const container = createContainer();
        const view = makeView(container);

        const el = view.renderCard(card);

        const logo = el.querySelector('.card-network-logo, .card-network-placeholder');
        expect(logo, `card "${card.name}" (network: ${card.network}) should have a logo element`).not.toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  it('known networks render an <img> logo element', () => {
    const knownNetworks = NETWORKS.filter(n => n !== 'Unknown');
    fc.assert(
      fc.property(
        cardArb.filter(c => knownNetworks.includes(c.network)),
        (card) => {
          const container = createContainer();
          const view = makeView(container);

          const el = view.renderCard(card);
          const img = el.querySelector('img.card-network-logo');
          expect(img, `known network "${card.network}" should render an <img>`).not.toBeNull();
          expect(img.getAttribute('alt')).toContain(card.network);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ─── Property 49: Logo Position Consistency ──────────────────────────────────
// Validates: Requirement 17.5

describe('Property 49: Logo Position Consistency', () => {
  it('the network logo element always appears before the card name in the DOM', () => {
    fc.assert(
      fc.property(cardArb, (card) => {
        const container = createContainer();
        const view = makeView(container);

        const el = view.renderCard(card);

        const logo = el.querySelector('.card-network-logo, .card-network-placeholder');
        const nameEl = el.querySelector('.card-item-name');

        expect(logo).not.toBeNull();
        expect(nameEl).not.toBeNull();

        // Node.DOCUMENT_POSITION_FOLLOWING (4) means nameEl comes after logo
        const position = logo.compareDocumentPosition(nameEl);
        const nameIsAfterLogo = !!(position & 4);
        expect(nameIsAfterLogo, 'network logo must precede the card name in the DOM').toBe(true);
      }),
      { numRuns: 200 }
    );
  });

  it('logo and card name share the same parent container (.card-item-header)', () => {
    fc.assert(
      fc.property(cardArb, (card) => {
        const container = createContainer();
        const view = makeView(container);

        const el = view.renderCard(card);

        const header = el.querySelector('.card-item-header');
        expect(header).not.toBeNull();

        const logo = header.querySelector('.card-network-logo, .card-network-placeholder');
        const nameEl = header.querySelector('.card-item-name');

        expect(logo, 'logo should be inside .card-item-header').not.toBeNull();
        expect(nameEl, 'card name should be inside .card-item-header').not.toBeNull();
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 51: Bank Color Consistency ─────────────────────────────────────
// Validates: Requirement 17.8

describe('Property 51: Bank Color Consistency', () => {
  it('cards from the same bank always receive the same --card-accent CSS variable', () => {
    fc.assert(
      fc.property(sameBankCardsArb, (cards) => {
        const container = createContainer();
        const view = makeView(container);

        const accents = cards.map(card => {
          const el = view.renderCard(card);
          return el.style.getPropertyValue('--card-accent');
        });

        // All accents must be identical (same bank → same color)
        const first = accents[0];
        expect(first, 'card accent color should be set').toBeTruthy();
        for (const accent of accents) {
          expect(accent).toBe(first);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('the --card-accent value is a non-empty string for every card', () => {
    fc.assert(
      fc.property(cardArb, (card) => {
        const container = createContainer();
        const view = makeView(container);

        const el = view.renderCard(card);
        const accent = el.style.getPropertyValue('--card-accent');
        expect(accent).toBeTruthy();
        expect(typeof accent).toBe('string');
      }),
      { numRuns: 200 }
    );
  });
});

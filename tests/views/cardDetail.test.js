// @vitest-environment jsdom
/**
 * Property-based tests for CardDetailView
 * Validates: Requirements 2.1, 2.4, 2.6, 16.5, 17.2, 17.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { CardDetailView } = require('../../js/views/cardDetail.js');
const { DetectorService } = require('../../js/services/detector.js');

// ─── DOM setup ────────────────────────────────────────────────────────────────

function createContainer() {
  return document.createElement('div');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a CardDetailView with a real DetectorService injected as global,
 * and a minimal stub for cardController.
 */
function makeView(container, card, allCards = []) {
  global.detectorService = new DetectorService();

  const cardController = {
    getCardById: vi.fn(async () => card),
    getAllCards: vi.fn(async () => allCards),
    deleteCard: vi.fn(async () => ({ success: true })),
  };

  const crypto = {};
  return new CardDetailView(container, cardController, crypto);
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const NETWORKS = ['Visa', 'Mastercard', 'American Express', 'RuPay', 'Diners Club', 'Discover', 'Unknown'];
const KNOWN_BANKS = ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra Bank'];
const ALL_BANKS = [...KNOWN_BANKS, 'Unknown'];

/** Arbitrary for a card number (16 digits) */
const cardNumberArb = fc.stringMatching(/^\d{16}$/);

/** Arbitrary for a CVV (3 digits) */
const cvvArb = fc.stringMatching(/^\d{3}$/);

/** Arbitrary for a tag string — must have non-empty trimmed content */
const tagArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => s.trim().length > 0)
  .map(s => s.trim()); // normalise so stored tag === rendered tag

/** Arbitrary for a full card object */
const cardArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }),
  number: cardNumberArb,
  cvv: cvvArb,
  expiry: fc.constant('2028-12'),
  network: fc.constantFrom(...NETWORKS),
  bank: fc.constantFrom(...ALL_BANKS),
  tags: fc.array(tagArb, { minLength: 0, maxLength: 5 }),
  sharedLimitWith: fc.constant([]),
  creditLimit: fc.nat({ max: 500000 }),
  annualFee: fc.nat({ max: 10000 }),
  notificationsEnabled: fc.boolean(),
  reminderPeriod: fc.nat({ max: 30 }),
});

/** Arbitrary for a card with a known bank */
const knownBankCardArb = cardArb.map(c => ({ ...c, bank: fc.sample(fc.constantFrom(...KNOWN_BANKS), 1)[0] }));

/** Arbitrary for a card with N tags (N >= 1) */
const cardWithTagsArb = fc
  .tuple(cardArb, fc.array(tagArb, { minLength: 1, maxLength: 8 }))
  .map(([card, tags]) => ({ ...card, tags }));

/** Arbitrary for a card with shared limit IDs */
const cardWithSharedLimitArb = fc
  .tuple(cardArb, fc.array(fc.uuid(), { minLength: 1, maxLength: 4 }))
  .map(([card, ids]) => ({ ...card, sharedLimitWith: ids }));

// ─── Property 10: Sensitive Data Masking ─────────────────────────────────────
// **Validates: Requirements 2.1**

describe('Property 10: Sensitive Data Masking', () => {
  it('the rendered detail view does NOT display the raw card number in plain text by default', async () => {
    await fc.assert(
      fc.asyncProperty(cardArb, async (card) => {
        const container = createContainer();
        const view = makeView(container, card);

        await view.render(card.id);

        const numberValueEl = container.querySelector('#card-number-value');
        expect(numberValueEl, 'card-number-value element should exist').not.toBeNull();

        // The raw card number must NOT appear in the secure field
        const displayedText = numberValueEl.textContent.trim();
        expect(displayedText).not.toBe(card.number);

        // It should show masked dots
        expect(displayedText).toContain('•');
      }),
      { numRuns: 100 }
    );
  });

  it('the rendered detail view does NOT display the raw CVV in plain text by default', async () => {
    await fc.assert(
      fc.asyncProperty(cardArb, async (card) => {
        const container = createContainer();
        const view = makeView(container, card);

        await view.render(card.id);

        const cvvEl = container.querySelector('#cvv-value');
        expect(cvvEl, 'cvv-value element should exist').not.toBeNull();

        const displayedText = cvvEl.textContent.trim();
        expect(displayedText).not.toBe(card.cvv);

        // It should show masked dots
        expect(displayedText).toContain('•');
      }),
      { numRuns: 100 }
    );
  });

  it('the full card number does not appear anywhere in the rendered HTML by default', async () => {
    await fc.assert(
      fc.asyncProperty(cardArb, async (card) => {
        const container = createContainer();
        const view = makeView(container, card);

        await view.render(card.id);

        // The raw 16-digit number should not appear verbatim in the HTML
        expect(container.innerHTML).not.toContain(card.number);
      }),
      { numRuns: 100 }
    );
  });

  it('the raw CVV does not appear anywhere in the rendered HTML by default', async () => {
    await fc.assert(
      fc.asyncProperty(cardArb, async (card) => {
        const container = createContainer();
        const view = makeView(container, card);

        await view.render(card.id);

        // The raw CVV should not appear verbatim in the HTML
        expect(container.innerHTML).not.toContain(`>${card.cvv}<`);
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 11: Clipboard Copy Accuracy ────────────────────────────────────
// **Validates: Requirements 2.4**

describe('Property 11: Clipboard Copy Accuracy', () => {
  beforeEach(() => {
    // Mock clipboard API
    const writtenValues = [];
    global.navigator.clipboard = {
      writeText: vi.fn(async (value) => {
        writtenValues.push(value);
      }),
      _written: writtenValues,
    };
  });

  it('copyToClipboard writes exactly the value passed to it', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (value) => {
          const container = createContainer();
          const card = fc.sample(cardArb, 1)[0];
          const view = makeView(container, card);

          const writtenValues = [];
          global.navigator.clipboard = {
            writeText: vi.fn(async (v) => { writtenValues.push(v); }),
          };

          await view.copyToClipboard(value, 'number');

          expect(writtenValues).toHaveLength(1);
          expect(writtenValues[0]).toBe(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('copyToClipboard with a CVV value writes exactly that CVV', async () => {
    await fc.assert(
      fc.asyncProperty(cvvArb, async (cvv) => {
        const container = createContainer();
        const card = { ...fc.sample(cardArb, 1)[0], cvv };
        const view = makeView(container, card);

        const writtenValues = [];
        global.navigator.clipboard = {
          writeText: vi.fn(async (v) => { writtenValues.push(v); }),
        };

        await view.copyToClipboard(cvv, 'cvv');

        expect(writtenValues).toHaveLength(1);
        expect(writtenValues[0]).toBe(cvv);
      }),
      { numRuns: 100 }
    );
  });

  it('copyToClipboard with a card number writes exactly that card number', async () => {
    await fc.assert(
      fc.asyncProperty(cardNumberArb, async (number) => {
        const container = createContainer();
        const card = { ...fc.sample(cardArb, 1)[0], number };
        const view = makeView(container, card);

        const writtenValues = [];
        global.navigator.clipboard = {
          writeText: vi.fn(async (v) => { writtenValues.push(v); }),
        };

        await view.copyToClipboard(number, 'number');

        expect(writtenValues).toHaveLength(1);
        expect(writtenValues[0]).toBe(number);
      }),
      { numRuns: 100 }
    );
  });

  it('copyToClipboard does nothing when value is empty/falsy', async () => {
    const container = createContainer();
    const card = fc.sample(cardArb, 1)[0];
    const view = makeView(container, card);

    const writtenValues = [];
    global.navigator.clipboard = {
      writeText: vi.fn(async (v) => { writtenValues.push(v); }),
    };

    await view.copyToClipboard('', 'number');
    await view.copyToClipboard(null, 'cvv');
    await view.copyToClipboard(undefined, 'number');

    expect(writtenValues).toHaveLength(0);
  });
});

// ─── Property 13: Tag Display Completeness ───────────────────────────────────
// **Validates: Requirements 2.6**

describe('Property 13: Tag Display Completeness', () => {
  it('all tags for a card are visible in the rendered detail view', async () => {
    await fc.assert(
      fc.asyncProperty(cardWithTagsArb, async (card) => {
        const container = createContainer();
        const view = makeView(container, card);

        await view.render(card.id);

        const tagEls = container.querySelectorAll('.card-tag');
        const renderedTags = Array.from(tagEls).map(el => el.textContent.trim());

        for (const tag of card.tags) {
          // Compare trimmed values — the DOM trims surrounding whitespace
          expect(renderedTags, `tag "${tag}" should be rendered`).toContain(tag.trim());
        }
      }),
      { numRuns: 100 }
    );
  });

  it('the number of rendered tag elements equals the number of tags on the card', async () => {
    await fc.assert(
      fc.asyncProperty(cardWithTagsArb, async (card) => {
        const container = createContainer();
        const view = makeView(container, card);

        await view.render(card.id);

        const tagEls = container.querySelectorAll('.card-tag');
        expect(tagEls.length).toBe(card.tags.length);
      }),
      { numRuns: 100 }
    );
  });

  it('a card with no tags shows a "No tags" message', async () => {
    await fc.assert(
      fc.asyncProperty(cardArb.map(c => ({ ...c, tags: [] })), async (card) => {
        const container = createContainer();
        const view = makeView(container, card);

        await view.render(card.id);

        const tagEls = container.querySelectorAll('.card-tag');
        expect(tagEls.length).toBe(0);

        // Should show a "No tags" placeholder
        const tagsSection = container.querySelector('.card-tags');
        expect(tagsSection).not.toBeNull();
        expect(tagsSection.textContent).toContain('No tags');
      }),
      { numRuns: 50 }
    );
  });
});

// ─── Property 46: Shared Limit Display ───────────────────────────────────────
// **Validates: Requirements 16.5**

describe('Property 46: Shared Limit Display', () => {
  it('a card with sharedLimitWith IDs renders the shared-limit-names element', async () => {
    await fc.assert(
      fc.asyncProperty(cardWithSharedLimitArb, async (card) => {
        const container = createContainer();
        // Build peer cards matching the shared IDs
        const peerCards = card.sharedLimitWith.map((id, i) => ({
          id,
          name: `Peer Card ${i + 1}`,
          bank: card.bank,
          number: '4111111111111111',
          cvv: '123',
          expiry: '2028-12',
          network: 'Visa',
          tags: [],
          sharedLimitWith: [],
        }));
        const allCards = [card, ...peerCards];
        const view = makeView(container, card, allCards);

        await view.render(card.id);

        // The shared-limit-names element should be present (initially "Loading…")
        const sharedEl = container.querySelector('#shared-limit-names');
        expect(sharedEl, 'shared-limit-names element should exist when sharedLimitWith is non-empty').not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('after loading, shared limit names are populated from peer cards', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
        async (sharedIds) => {
          const card = {
            ...fc.sample(cardArb, 1)[0],
            sharedLimitWith: sharedIds,
          };
          const peerCards = sharedIds.map((id, i) => ({
            id,
            name: `Shared Card ${i + 1}`,
            bank: card.bank,
            number: '4111111111111111',
            cvv: '123',
            expiry: '2028-12',
            network: 'Visa',
            tags: [],
            sharedLimitWith: [],
          }));
          const allCards = [card, ...peerCards];

          const container = createContainer();
          const view = makeView(container, card, allCards);

          await view.render(card.id);

          // Trigger the async load manually
          await view._loadSharedLimitNames();

          const sharedEl = container.querySelector('#shared-limit-names');
          expect(sharedEl).not.toBeNull();

          const displayedText = sharedEl.textContent;
          // Each peer card name should appear in the shared limit display
          for (const peer of peerCards) {
            expect(displayedText, `peer card name "${peer.name}" should appear in shared limit display`).toContain(peer.name);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('a card with no sharedLimitWith shows a dash (—) for shared limit', async () => {
    await fc.assert(
      fc.asyncProperty(cardArb.map(c => ({ ...c, sharedLimitWith: [] })), async (card) => {
        const container = createContainer();
        const view = makeView(container, card, [card]);

        await view.render(card.id);

        // Trigger the async load
        await view._loadSharedLimitNames();

        // The shared-limit-names element should be present and show "—"
        const sharedEl = container.querySelector('#shared-limit-names');
        expect(sharedEl, 'shared-limit-names element should exist').not.toBeNull();
        expect(sharedEl.textContent.trim()).toBe('—');
      }),
      { numRuns: 50 }
    );
  });

  it('bidirectional: a card referenced by another card shows that card in shared limit display', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(fc.uuid(), fc.uuid()),
        async ([cardAId, cardBId]) => {
          // cardA has no sharedLimitWith, but cardB references cardA
          const cardA = {
            ...fc.sample(cardArb, 1)[0],
            id: cardAId,
            sharedLimitWith: [],
          };
          const cardB = {
            ...fc.sample(cardArb, 1)[0],
            id: cardBId,
            name: 'Referencing Card',
            sharedLimitWith: [cardAId],
          };
          const allCards = [cardA, cardB];

          const container = createContainer();
          const view = makeView(container, cardA, allCards);

          await view.render(cardA.id);
          await view._loadSharedLimitNames();

          const sharedEl = container.querySelector('#shared-limit-names');
          expect(sharedEl).not.toBeNull();
          // cardB references cardA, so cardB's name should appear
          expect(sharedEl.textContent).toContain('Referencing Card');
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Property 48: Bank Logo Display ──────────────────────────────────────────
// **Validates: Requirements 17.2**

describe('Property 48: Bank Logo Display', () => {
  it('a card with a known bank renders a bank logo <img> element', async () => {
    await fc.assert(
      fc.asyncProperty(
        cardArb.map(c => ({ ...c, bank: fc.sample(fc.constantFrom(...KNOWN_BANKS), 1)[0] })),
        async (card) => {
          const container = createContainer();
          const view = makeView(container, card);

          await view.render(card.id);

          const bankLogoImg = container.querySelector('img.card-detail-bank-logo');
          expect(bankLogoImg, `known bank "${card.bank}" should render a bank logo <img>`).not.toBeNull();
          expect(bankLogoImg.getAttribute('alt')).toContain(card.bank);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('every card renders a bank logo element (img or placeholder span)', async () => {
    await fc.assert(
      fc.asyncProperty(cardArb, async (card) => {
        const container = createContainer();
        const view = makeView(container, card);

        await view.render(card.id);

        const bankLogo = container.querySelector('img.card-detail-bank-logo, span.card-bank-placeholder');
        expect(bankLogo, `card with bank "${card.bank}" should have a bank logo element`).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 50: Dual Logo Display ──────────────────────────────────────────
// **Validates: Requirements 17.6**

describe('Property 50: Dual Logo Display', () => {
  it('every card detail view displays both a network logo and a bank logo element', async () => {
    await fc.assert(
      fc.asyncProperty(cardArb, async (card) => {
        const container = createContainer();
        const view = makeView(container, card);

        await view.render(card.id);

        const networkLogo = container.querySelector('img.card-detail-network-logo, span.card-network-placeholder');
        const bankLogo = container.querySelector('img.card-detail-bank-logo, span.card-bank-placeholder');

        expect(networkLogo, `card "${card.name}" should have a network logo element`).not.toBeNull();
        expect(bankLogo, `card "${card.name}" should have a bank logo element`).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('known networks render an <img> for the network logo', async () => {
    const knownNetworks = NETWORKS.filter(n => n !== 'Unknown');
    await fc.assert(
      fc.asyncProperty(
        cardArb.map(c => ({ ...c, network: fc.sample(fc.constantFrom(...knownNetworks), 1)[0] })),
        async (card) => {
          const container = createContainer();
          const view = makeView(container, card);

          await view.render(card.id);

          const networkLogoImg = container.querySelector('img.card-detail-network-logo');
          expect(networkLogoImg, `known network "${card.network}" should render an <img>`).not.toBeNull();
          expect(networkLogoImg.getAttribute('alt')).toContain(card.network);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('known banks render an <img> for the bank logo', async () => {
    await fc.assert(
      fc.asyncProperty(
        cardArb.map(c => ({ ...c, bank: fc.sample(fc.constantFrom(...KNOWN_BANKS), 1)[0] })),
        async (card) => {
          const container = createContainer();
          const view = makeView(container, card);

          await view.render(card.id);

          const bankLogoImg = container.querySelector('img.card-detail-bank-logo');
          expect(bankLogoImg, `known bank "${card.bank}" should render an <img>`).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('network logo and bank logo are both inside the card-preview-header', async () => {
    await fc.assert(
      fc.asyncProperty(cardArb, async (card) => {
        const container = createContainer();
        const view = makeView(container, card);

        await view.render(card.id);

        const header = container.querySelector('.card-preview-header');
        expect(header, 'card-preview-header should exist').not.toBeNull();

        const networkLogo = header.querySelector('img.card-detail-network-logo, span.card-network-placeholder');
        const bankLogo = header.querySelector('img.card-detail-bank-logo, span.card-bank-placeholder');

        expect(networkLogo, 'network logo should be inside .card-preview-header').not.toBeNull();
        expect(bankLogo, 'bank logo should be inside .card-preview-header').not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

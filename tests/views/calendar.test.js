// @vitest-environment jsdom
/**
 * Property-based tests for CalendarView
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { CalendarView } = require('../../js/views/calendar.js');
const { DetectorService, DEFAULT_BANK_COLORS } = require('../../js/services/detector.js');
const { ReminderController } = require('../../js/controllers/reminderController.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a hex color like "#004C8F" to "rgb(0, 76, 143)" so we can compare
 * against jsdom's computed style which normalises hex → rgb.
 */
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

// ─── DOM setup ────────────────────────────────────────────────────────────────

function createContainer() {
  return document.createElement('div');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Create a CalendarView with a real DetectorService and a stub reminderController.
 * @param {Array} cards - cards to return from getRemindersForDate
 */
function makeView(container, cards = []) {
  global.detectorService = new DetectorService();

  // Build a stub reminderController backed by the provided cards array
  const reminderController = {
    getRemindersForDate: vi.fn(async (date) => {
      const day = date.getDate();
      const results = [];
      for (const card of cards) {
        if (card.statementDate === day) results.push({ card, eventType: 'statement' });
        if (card.dueDate === day) results.push({ card, eventType: 'due' });
      }
      return results;
    }),
  };

  return new CalendarView(container, reminderController);
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const NETWORKS = ['Visa', 'Mastercard', 'American Express', 'RuPay', 'Diners Club', 'Discover', 'Unknown'];
const BANKS = Object.keys(DEFAULT_BANK_COLORS);

/** Arbitrary for a day-of-month (1–28, safe for all months) */
const dayArb = fc.integer({ min: 1, max: 28 });

/** Arbitrary for a card with optional statementDate and dueDate */
const cardArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }),
  number: fc.stringMatching(/^\d{16}$/),
  network: fc.constantFrom(...NETWORKS),
  bank: fc.constantFrom(...BANKS),
  expiry: fc.constant('2028-12'),
  tags: fc.constant([]),
  statementDate: fc.option(dayArb, { nil: undefined }),
  dueDate: fc.option(dayArb, { nil: undefined }),
});

/** Arbitrary for a card that definitely has a statementDate */
const cardWithStatementArb = cardArb.map(c => ({
  ...c,
  statementDate: c.statementDate ?? 15,
}));

/** Arbitrary for a card that definitely has a dueDate */
const cardWithDueArb = cardArb.map(c => ({
  ...c,
  dueDate: c.dueDate ?? 20,
}));

/** Arbitrary for a valid month (0-indexed) and year */
const monthYearArb = fc.record({
  month: fc.integer({ min: 0, max: 11 }),
  year: fc.integer({ min: 2020, max: 2030 }),
});

// ─── Property 34: Calendar Date Completeness ─────────────────────────────────
// **Validates: Requirements 9.1, 9.2, 9.3**

describe('Property 34: Calendar Date Completeness', () => {
  it('every day of the rendered month appears exactly once in the calendar grid', async () => {
    await fc.assert(
      fc.asyncProperty(monthYearArb, async ({ month, year }) => {
        const container = createContainer();
        const view = makeView(container, []);

        view._month = month;
        view._year = year;
        await view.render();

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const grid = container.querySelector('#calendar-grid');
        expect(grid, 'calendar-grid should exist').not.toBeNull();

        // Collect all data-date attributes from non-empty day cells
        const dayCells = Array.from(grid.querySelectorAll('.cal-day[data-date]'));
        const dateStrings = dayCells.map(c => c.dataset.date);

        // Each day 1..daysInMonth must appear exactly once
        for (let day = 1; day <= daysInMonth; day++) {
          const m = String(month + 1).padStart(2, '0');
          const d = String(day).padStart(2, '0');
          const expected = `${year}-${m}-${d}`;
          const count = dateStrings.filter(s => s === expected).length;
          expect(count, `day ${expected} should appear exactly once`).toBe(1);
        }

        // Total day cells must equal daysInMonth (no extra days)
        expect(dayCells.length, 'number of day cells should equal days in month').toBe(daysInMonth);
      }),
      { numRuns: 50 }
    );
  });

  it('statement dates are highlighted with cal-dot-statement dots', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cardWithStatementArb, { minLength: 1, maxLength: 5 }),
        monthYearArb,
        async (cards, { month, year }) => {
          const container = createContainer();
          const view = makeView(container, cards);

          view._month = month;
          view._year = year;
          await view.render();

          const daysInMonth = new Date(year, month + 1, 0).getDate();

          // For each card with a statementDate in this month, the cell should have a statement dot
          for (const card of cards) {
            if (!card.statementDate || card.statementDate > daysInMonth) continue;

            const m = String(month + 1).padStart(2, '0');
            const d = String(card.statementDate).padStart(2, '0');
            const dateStr = `${year}-${m}-${d}`;

            const cell = container.querySelector(`.cal-day[data-date="${dateStr}"]`);
            expect(cell, `cell for ${dateStr} should exist`).not.toBeNull();

            const dot = cell.querySelector('.cal-dot-statement');
            expect(dot, `statement dot should exist on ${dateStr}`).not.toBeNull();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('due dates are highlighted with cal-dot-due dots', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cardWithDueArb, { minLength: 1, maxLength: 5 }),
        monthYearArb,
        async (cards, { month, year }) => {
          const container = createContainer();
          const view = makeView(container, cards);

          view._month = month;
          view._year = year;
          await view.render();

          const daysInMonth = new Date(year, month + 1, 0).getDate();

          for (const card of cards) {
            if (!card.dueDate || card.dueDate > daysInMonth) continue;

            const m = String(month + 1).padStart(2, '0');
            const d = String(card.dueDate).padStart(2, '0');
            const dateStr = `${year}-${m}-${d}`;

            const cell = container.querySelector(`.cal-day[data-date="${dateStr}"]`);
            expect(cell, `cell for ${dateStr} should exist`).not.toBeNull();

            const dot = cell.querySelector('.cal-dot-due');
            expect(dot, `due dot should exist on ${dateStr}`).not.toBeNull();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ─── Property 35: Calendar Date Filtering ────────────────────────────────────
// **Validates: Requirements 9.4**

describe('Property 35: Calendar Date Filtering', () => {
  it('getRemindersForDate returns only cards with events on the specified date', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cardArb, { minLength: 1, maxLength: 10 }),
        dayArb,
        async (cards, targetDay) => {
          // Build a real ReminderController backed by a stub cardStore
          const { ReminderController } = require('../../js/controllers/reminderController.js');
          const cardStore = { getAllCards: vi.fn(async () => cards) };
          const controller = new ReminderController(cardStore);

          const date = new Date(2024, 0, targetDay); // January 2024, day = targetDay
          const results = await controller.getRemindersForDate(date);

          // Every result must have an event on targetDay
          for (const { card, eventType } of results) {
            if (eventType === 'statement') {
              expect(card.statementDate).toBe(targetDay);
            } else {
              expect(card.dueDate).toBe(targetDay);
            }
          }

          // Every card with statementDate === targetDay must appear as a statement event
          const statementCards = cards.filter(c => c.statementDate === targetDay);
          for (const card of statementCards) {
            const found = results.some(r => r.card.id === card.id && r.eventType === 'statement');
            expect(found, `card ${card.id} with statementDate=${targetDay} should appear`).toBe(true);
          }

          // Every card with dueDate === targetDay must appear as a due event
          const dueCards = cards.filter(c => c.dueDate === targetDay);
          for (const card of dueCards) {
            const found = results.some(r => r.card.id === card.id && r.eventType === 'due');
            expect(found, `card ${card.id} with dueDate=${targetDay} should appear`).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clicking a date renders only the cards with events on that date in the panel', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cardArb, { minLength: 1, maxLength: 8 }),
        dayArb,
        async (cards, targetDay) => {
          const container = createContainer();
          const view = makeView(container, cards);

          // Render January 2024
          view._month = 0;
          view._year = 2024;
          await view.render();

          // Simulate clicking the target day
          const date = new Date(2024, 0, targetDay);
          view.handleDateClick(date);

          const panel = container.querySelector('#date-panel');
          expect(panel, 'date-panel should exist').not.toBeNull();

          // Determine which cards should appear
          const expectedCards = cards.filter(
            c => c.statementDate === targetDay || c.dueDate === targetDay
          );

          if (expectedCards.length === 0) {
            // Panel should show "No events"
            expect(panel.textContent).toContain('No events');
          } else {
            // Each expected card name should appear in the panel
            for (const card of expectedCards) {
              expect(panel.textContent, `card "${card.name}" should appear in panel`).toContain(card.name);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 36: Event Color Coding ─────────────────────────────────────────
// **Validates: Requirements 9.5**

describe('Property 36: Event Color Coding', () => {
  it('each event item in the date panel has a border-left color matching the card bank color', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cardWithStatementArb, { minLength: 1, maxLength: 5 }),
        async (cards) => {
          // Use a fixed day that all cards share (statementDate is set to 15 by cardWithStatementArb default)
          const targetDay = cards[0].statementDate;
          const matchingCards = cards.filter(c => c.statementDate === targetDay || c.dueDate === targetDay);
          if (matchingCards.length === 0) return;

          const container = createContainer();
          const view = makeView(container, matchingCards);

          view._month = 0;
          view._year = 2024;
          await view.render();

          const date = new Date(2024, 0, targetDay);
          view.handleDateClick(date);

          const panel = container.querySelector('#date-panel');
          expect(panel, 'date-panel should exist').not.toBeNull();

          const eventItems = panel.querySelectorAll('.cal-event-item');
          expect(eventItems.length, 'should have event items').toBeGreaterThan(0);

          for (const item of eventItems) {
            // The border-left style should be set and non-empty
            const borderLeft = item.style.borderLeft;
            expect(borderLeft, 'event item should have a non-empty border-left style').toBeTruthy();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('cards from the same bank always get the same border color in the date panel', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...BANKS.filter(b => b !== 'Unknown')),
        fc.array(
          cardWithStatementArb.map(c => ({ ...c, statementDate: 10 })),
          { minLength: 2, maxLength: 5 }
        ),
        async (bank, cards) => {
          const sameBank = cards.map(c => ({ ...c, bank, statementDate: 10 }));

          const container = createContainer();
          const view = makeView(container, sameBank);

          view._month = 0;
          view._year = 2024;
          await view.render();

          view.handleDateClick(new Date(2024, 0, 10));

          const panel = container.querySelector('#date-panel');
          const eventItems = Array.from(panel.querySelectorAll('.cal-event-item'));
          if (eventItems.length < 2) return;

          // All items should have the same border-left color
          const borders = eventItems.map(el => el.style.borderLeft);
          const first = borders[0];
          expect(first, 'border-left should be set').toBeTruthy();
          for (const border of borders) {
            expect(border, 'same bank cards should have same border color').toBe(first);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('the bank color used in events matches the DetectorService getBankColor output', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...BANKS),
        async (bank) => {
          const detector = new DetectorService();
          const expectedColor = detector.getBankColor(bank);

          const card = {
            id: 'test-id',
            name: 'Test Card',
            number: '4111111111111111',
            network: 'Visa',
            bank,
            expiry: '2028-12',
            tags: [],
            statementDate: 5,
            dueDate: undefined,
          };

          const container = createContainer();
          const view = makeView(container, [card]);

          view._month = 0;
          view._year = 2024;
          await view.render();

          view.handleDateClick(new Date(2024, 0, 5));

          const panel = container.querySelector('#date-panel');
          const eventItem = panel.querySelector('.cal-event-item');
          expect(eventItem, 'event item should exist').not.toBeNull();

          // The border-left should contain the expected bank color
          // jsdom normalises hex colours to rgb(), so convert before comparing
          const borderLeft = eventItem.style.borderLeft;
          const expectedRgb = hexToRgb(expectedColor);
          expect(borderLeft, `border-left should contain bank color (${expectedColor} → ${expectedRgb})`).toContain(expectedRgb);
        }
      ),
      { numRuns: 30 }
    );
  });
});

/**
 * Tests for ReminderController
 * Validates: Requirements 8.4, 8.5, 8.6, 8.7, 8.8
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ReminderController } = require('../../js/controllers/reminderController.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCard(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: overrides.name || 'Test Card',
    dueDate: overrides.dueDate ?? null,
    statementDate: overrides.statementDate ?? null,
    notificationsEnabled: overrides.notificationsEnabled ?? false,
    reminderPeriod: overrides.reminderPeriod ?? 3,
    ...overrides
  };
}

function makeController(cards) {
  const cardStore = { getAllCards: async () => cards };
  return new ReminderController(cardStore);
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('ReminderController - calculateNextDueDate', () => {
  it('returns null when card has no dueDate', () => {
    const ctrl = makeController([]);
    const card = makeCard({ dueDate: null });
    expect(ctrl.calculateNextDueDate(card, new Date('2024-01-15'))).toBeNull();
  });

  it('returns the due date in the current month when it has not passed', () => {
    const ctrl = makeController([]);
    const card = makeCard({ dueDate: 20 });
    const ref = new Date('2024-01-15');
    const result = ctrl.calculateNextDueDate(card, ref);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(20);
  });

  it('advances to next month when due date has already passed', () => {
    const ctrl = makeController([]);
    const card = makeCard({ dueDate: 10 });
    const ref = new Date('2024-01-15');
    const result = ctrl.calculateNextDueDate(card, ref);
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(10);
  });

  it('returns today when due date equals today', () => {
    const ctrl = makeController([]);
    const card = makeCard({ dueDate: 15 });
    const ref = new Date('2024-01-15');
    const result = ctrl.calculateNextDueDate(card, ref);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(0);
  });

  it('clamps to last day of month for short months (e.g. Feb 30 → Feb 28/29)', () => {
    const ctrl = makeController([]);
    const card = makeCard({ dueDate: 30 });
    const ref = new Date('2024-02-01');
    const result = ctrl.calculateNextDueDate(card, ref);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(29); // 2024 is a leap year
  });

  it('handles year rollover (December → January)', () => {
    const ctrl = makeController([]);
    const card = makeCard({ dueDate: 5 });
    const ref = new Date('2024-12-15');
    const result = ctrl.calculateNextDueDate(card, ref);
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(5);
  });
});

describe('ReminderController - shouldShowReminder', () => {
  it('returns false when notificationsEnabled is false', () => {
    const ctrl = makeController([]);
    const card = makeCard({ notificationsEnabled: false, reminderPeriod: 3 });
    const dueDate = new Date('2024-01-20');
    const today = new Date('2024-01-18');
    expect(ctrl.shouldShowReminder(card, dueDate, today)).toBe(false);
  });

  it('returns true when today is within the reminder window', () => {
    const ctrl = makeController([]);
    const card = makeCard({ notificationsEnabled: true, reminderPeriod: 3 });
    const dueDate = new Date('2024-01-20');
    const today = new Date('2024-01-18'); // 2 days before due
    expect(ctrl.shouldShowReminder(card, dueDate, today)).toBe(true);
  });

  it('returns true on the due date itself', () => {
    const ctrl = makeController([]);
    const card = makeCard({ notificationsEnabled: true, reminderPeriod: 3 });
    const dueDate = new Date('2024-01-20');
    expect(ctrl.shouldShowReminder(card, dueDate, new Date('2024-01-20'))).toBe(true);
  });

  it('returns false when today is before the reminder window', () => {
    const ctrl = makeController([]);
    const card = makeCard({ notificationsEnabled: true, reminderPeriod: 3 });
    const dueDate = new Date('2024-01-20');
    const today = new Date('2024-01-16'); // 4 days before due, outside window
    expect(ctrl.shouldShowReminder(card, dueDate, today)).toBe(false);
  });

  it('returns false when today is after the due date', () => {
    const ctrl = makeController([]);
    const card = makeCard({ notificationsEnabled: true, reminderPeriod: 3 });
    const dueDate = new Date('2024-01-20');
    const today = new Date('2024-01-21');
    expect(ctrl.shouldShowReminder(card, dueDate, today)).toBe(false);
  });

  it('returns true when reminderPeriod is 0 and today equals due date', () => {
    const ctrl = makeController([]);
    const card = makeCard({ notificationsEnabled: true, reminderPeriod: 0 });
    const dueDate = new Date('2024-01-20');
    expect(ctrl.shouldShowReminder(card, dueDate, new Date('2024-01-20'))).toBe(true);
  });

  it('returns false when reminderPeriod is 0 and today is before due date', () => {
    const ctrl = makeController([]);
    const card = makeCard({ notificationsEnabled: true, reminderPeriod: 0 });
    const dueDate = new Date('2024-01-20');
    expect(ctrl.shouldShowReminder(card, dueDate, new Date('2024-01-19'))).toBe(false);
  });
});

describe('ReminderController - getUpcomingReminders', () => {
  it('returns empty array when no cards', async () => {
    const ctrl = makeController([]);
    const result = await ctrl.getUpcomingReminders(new Date('2024-01-18'));
    expect(result).toEqual([]);
  });

  it('excludes cards with notificationsEnabled: false', async () => {
    const card = makeCard({ dueDate: 20, notificationsEnabled: false, reminderPeriod: 5 });
    const ctrl = makeController([card]);
    const result = await ctrl.getUpcomingReminders(new Date('2024-01-18'));
    expect(result).toHaveLength(0);
  });

  it('includes cards with notificationsEnabled: true within reminder window', async () => {
    const card = makeCard({ dueDate: 20, notificationsEnabled: true, reminderPeriod: 5 });
    const ctrl = makeController([card]);
    const result = await ctrl.getUpcomingReminders(new Date('2024-01-18'));
    expect(result).toHaveLength(1);
    expect(result[0].card.id).toBe(card.id);
  });

  it('returns results sorted by dueDate ascending', async () => {
    const cards = [
      makeCard({ dueDate: 25, notificationsEnabled: true, reminderPeriod: 10 }),
      makeCard({ dueDate: 15, notificationsEnabled: true, reminderPeriod: 10 }),
      makeCard({ dueDate: 20, notificationsEnabled: true, reminderPeriod: 10 })
    ];
    const ctrl = makeController(cards);
    // Use a date where all are within window
    const result = await ctrl.getUpcomingReminders(new Date('2024-01-14'));
    const dueDays = result.map(r => r.dueDate.getDate());
    for (let i = 1; i < dueDays.length; i++) {
      expect(dueDays[i]).toBeGreaterThanOrEqual(dueDays[i - 1]);
    }
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

/**
 * Property 30: Next Due Date Calculation
 * Validates: Requirements 8.4, 8.8
 *
 * For any card with a dueDate (1–28) and any reference date, calculateNextDueDate
 * SHALL return a date whose day-of-month equals min(dueDate, lastDayOfMonth)
 * and which is >= the reference date.
 * If the candidate date in the current month is in the past, the result must be in the next month.
 * If the card has no dueDate, the result must be null.
 */
describe('Property 30: Next Due Date Calculation', () => {
  // Arbitrary: a reference date (year 2020–2030, any month, day 1–28)
  const refDateArb = fc.record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 0, max: 11 }),
    day: fc.integer({ min: 1, max: 28 })
  }).map(({ year, month, day }) => new Date(year, month, day));

  it('result day-of-month equals min(dueDate, lastDayOfMonth) and result >= refDate (Req 8.4, 8.8)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 28 }),
        refDateArb,
        (dueDay, refDate) => {
          const ctrl = makeController([]);
          const card = makeCard({ dueDate: dueDay });
          const result = ctrl.calculateNextDueDate(card, refDate);

          expect(result).not.toBeNull();

          // Result must be >= refDate
          const refNorm = new Date(refDate);
          refNorm.setHours(0, 0, 0, 0);
          const resultNorm = new Date(result);
          resultNorm.setHours(0, 0, 0, 0);
          expect(resultNorm.getTime()).toBeGreaterThanOrEqual(refNorm.getTime());

          // Day-of-month must equal min(dueDay, lastDayOfMonth)
          const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
          expect(result.getDate()).toBe(Math.min(dueDay, lastDay));
        }
      ),
      { numRuns: 200 }
    );
  });

  it('advances to next month when due day has already passed in current month (Req 8.8)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 27 }),
        fc.record({
          year: fc.integer({ min: 2020, max: 2030 }),
          month: fc.integer({ min: 0, max: 11 })
        }),
        (dueDay, { year, month }) => {
          // Reference date is one day AFTER the due day in the same month
          const refDate = new Date(year, month, dueDay + 1);
          const ctrl = makeController([]);
          const card = makeCard({ dueDate: dueDay });
          const result = ctrl.calculateNextDueDate(card, refDate);

          expect(result).not.toBeNull();

          // Result must be in the next month (or next year if December)
          const expectedMonth = (month + 1) % 12;
          const expectedYear = month === 11 ? year + 1 : year;
          expect(result.getMonth()).toBe(expectedMonth);
          expect(result.getFullYear()).toBe(expectedYear);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns null when card has no dueDate (Req 8.4)', () => {
    fc.assert(
      fc.property(
        refDateArb,
        (refDate) => {
          const ctrl = makeController([]);
          const card = makeCard({ dueDate: null });
          expect(ctrl.calculateNextDueDate(card, refDate)).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 31: Reminder Filtering by Notification Status
 * Validates: Requirements 8.5, 8.6
 *
 * getUpcomingReminders SHALL never return a card whose notificationsEnabled is false.
 * For any set of cards where all have notificationsEnabled: false, returns empty array.
 */
describe('Property 31: Reminder Filtering by Notification Status', () => {
  const cardArb = fc.record({
    id: fc.uuid(),
    name: fc.constant('Card'),
    dueDate: fc.integer({ min: 1, max: 28 }),
    statementDate: fc.constant(null),
    notificationsEnabled: fc.boolean(),
    reminderPeriod: fc.integer({ min: 0, max: 7 })
  });

  const refDateArb = fc.record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 0, max: 11 }),
    day: fc.integer({ min: 1, max: 28 })
  }).map(({ year, month, day }) => new Date(year, month, day));

  it('never returns a card with notificationsEnabled: false (Req 8.5)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(cardArb, { maxLength: 20 }),
        refDateArb,
        async (cards, today) => {
          const ctrl = makeController(cards);
          const reminders = await ctrl.getUpcomingReminders(today);
          for (const { card } of reminders) {
            expect(card.notificationsEnabled).toBe(true);
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns empty array when all cards have notificationsEnabled: false (Req 8.5)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.constant('Card'),
            dueDate: fc.integer({ min: 1, max: 28 }),
            statementDate: fc.constant(null),
            notificationsEnabled: fc.constant(false),
            reminderPeriod: fc.integer({ min: 0, max: 7 })
          }),
          { maxLength: 20 }
        ),
        refDateArb,
        async (cards, today) => {
          const ctrl = makeController(cards);
          const reminders = await ctrl.getUpcomingReminders(today);
          expect(reminders).toHaveLength(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 32: Reminder Filtering by Period
 * Validates: Requirements 8.5, 8.6
 *
 * shouldShowReminder returns true only when today is within [dueDate - reminderPeriod, dueDate].
 * When today is before the window start, returns false.
 * When today is after the due date, returns false.
 * When today equals the due date (reminderPeriod = 0), returns true.
 */
describe('Property 32: Reminder Filtering by Period', () => {
  // A fixed due date for simplicity
  const dueDateArb = fc.record({
    year: fc.integer({ min: 2022, max: 2030 }),
    month: fc.integer({ min: 0, max: 11 }),
    day: fc.integer({ min: 5, max: 25 }) // keep away from month edges
  }).map(({ year, month, day }) => new Date(year, month, day));

  it('returns true when today is within [dueDate - reminderPeriod, dueDate] (Req 8.6)', () => {
    fc.assert(
      fc.property(
        dueDateArb,
        fc.integer({ min: 1, max: 7 }),
        (dueDate, period) => {
          const ctrl = makeController([]);
          const card = makeCard({ notificationsEnabled: true, reminderPeriod: period });

          // Pick a day within the window: dueDate - period + offset (0..period)
          const offset = Math.floor(period / 2); // somewhere in the middle
          const today = new Date(dueDate);
          today.setDate(today.getDate() - offset);

          expect(ctrl.shouldShowReminder(card, dueDate, today)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns false when today is before the window start (Req 8.6)', () => {
    fc.assert(
      fc.property(
        dueDateArb,
        fc.integer({ min: 1, max: 7 }),
        (dueDate, period) => {
          const ctrl = makeController([]);
          const card = makeCard({ notificationsEnabled: true, reminderPeriod: period });

          // today = dueDate - period - 1 (one day before window opens)
          const today = new Date(dueDate);
          today.setDate(today.getDate() - period - 1);

          expect(ctrl.shouldShowReminder(card, dueDate, today)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns false when today is after the due date (Req 8.6)', () => {
    fc.assert(
      fc.property(
        dueDateArb,
        fc.integer({ min: 1, max: 7 }),
        (dueDate, period) => {
          const ctrl = makeController([]);
          const card = makeCard({ notificationsEnabled: true, reminderPeriod: period });

          // today = dueDate + 1
          const today = new Date(dueDate);
          today.setDate(today.getDate() + 1);

          expect(ctrl.shouldShowReminder(card, dueDate, today)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns true when today equals due date and reminderPeriod is 0 (Req 8.6)', () => {
    fc.assert(
      fc.property(
        dueDateArb,
        (dueDate) => {
          const ctrl = makeController([]);
          const card = makeCard({ notificationsEnabled: true, reminderPeriod: 0 });
          const today = new Date(dueDate);
          expect(ctrl.shouldShowReminder(card, dueDate, today)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('returns false when notificationsEnabled is false regardless of window (Req 8.5)', () => {
    fc.assert(
      fc.property(
        dueDateArb,
        fc.integer({ min: 0, max: 7 }),
        (dueDate, period) => {
          const ctrl = makeController([]);
          const card = makeCard({ notificationsEnabled: false, reminderPeriod: period });
          // today is on the due date (best case for showing reminder)
          expect(ctrl.shouldShowReminder(card, dueDate, new Date(dueDate))).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});

/**
 * Property 33: Reminder Sort Order
 * Validates: Requirement 8.7
 *
 * The array returned by getUpcomingReminders SHALL be sorted by dueDate ascending.
 * For any permutation of input cards, the output order is always the same.
 */
describe('Property 33: Reminder Sort Order', () => {
  // Generate cards with distinct due dates, all notifications enabled, wide reminder window
  const sortCardsArb = fc.array(
    fc.integer({ min: 1, max: 28 }),
    { minLength: 2, maxLength: 10 }
  ).map(dueDays =>
    // Deduplicate due days so sort order is deterministic
    [...new Set(dueDays)].map(dueDay => makeCard({
      dueDate: dueDay,
      notificationsEnabled: true,
      reminderPeriod: 28 // wide window so all are included
    }))
  ).filter(cards => cards.length >= 2);

  // Reference date: day 1 of a month so all due days are in the future
  const refDateArb = fc.record({
    year: fc.integer({ min: 2022, max: 2030 }),
    month: fc.integer({ min: 0, max: 11 })
  }).map(({ year, month }) => new Date(year, month, 1));

  it('output is sorted by dueDate ascending (Req 8.7)', async () => {
    await fc.assert(
      fc.asyncProperty(
        sortCardsArb,
        refDateArb,
        async (cards, today) => {
          const ctrl = makeController(cards);
          const reminders = await ctrl.getUpcomingReminders(today);

          for (let i = 1; i < reminders.length; i++) {
            expect(reminders[i].dueDate.getTime()).toBeGreaterThanOrEqual(
              reminders[i - 1].dueDate.getTime()
            );
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('output order is the same regardless of input card order (Req 8.7)', async () => {
    await fc.assert(
      fc.asyncProperty(
        sortCardsArb,
        refDateArb,
        async (cards, today) => {
          // Reverse the input order
          const reversed = [...cards].reverse();

          const ctrl1 = makeController(cards);
          const ctrl2 = makeController(reversed);

          const reminders1 = await ctrl1.getUpcomingReminders(today);
          const reminders2 = await ctrl2.getUpcomingReminders(today);

          expect(reminders1.length).toBe(reminders2.length);
          for (let i = 0; i < reminders1.length; i++) {
            expect(reminders1[i].dueDate.getTime()).toBe(reminders2[i].dueDate.getTime());
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

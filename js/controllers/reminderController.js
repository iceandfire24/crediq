/**
 * Reminder Controller
 * Payment reminder calculations based on Statement_Cycle
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8
 */

class ReminderController {
  /**
   * @param {CardStore} cardStore - Card store service instance
   */
  constructor(cardStore) {
    this.cardStore = cardStore;
  }

  /**
   * Calculate the next due date for a card based on its Statement_Cycle.
   * If the due date for the current month has already passed, advance to next month.
   * Requirement 8.4, 8.8
   *
   * @param {Object} card - Card object with dueDate (1-31) field
   * @param {Date} [fromDate=new Date()] - Reference date (defaults to today)
   * @returns {Date|null} Next due date, or null if card has no dueDate configured
   */
  calculateNextDueDate(card, fromDate = new Date()) {
    if (!card.dueDate) return null;

    const day = card.dueDate;
    const ref = new Date(fromDate);
    ref.setHours(0, 0, 0, 0);

    // Helper: build a date clamped to the last day of the given month
    const clampedDate = (year, month, d) => {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(d, lastDay));
    };

    // Try the due date in the current month (clamped)
    const candidate = clampedDate(ref.getFullYear(), ref.getMonth(), day);

    // If the candidate is today or in the future, use it; otherwise advance one month
    if (candidate >= ref) {
      return candidate;
    }

    // Advance to next month (clamped)
    const nextYear = ref.getMonth() === 11 ? ref.getFullYear() + 1 : ref.getFullYear();
    const nextMonthIdx = (ref.getMonth() + 1) % 12;
    return clampedDate(nextYear, nextMonthIdx, day);
  }

  /**
   * Determine whether a reminder should be shown for a card given its next due date.
   * A reminder is shown when:
   *   - notifications are enabled for the card, AND
   *   - today falls within the reminder window (reminderPeriod days before dueDate, inclusive)
   * Requirement 8.5, 8.6
   *
   * @param {Object} card - Card object
   * @param {Date} dueDate - The calculated next due date
   * @param {Date} [today=new Date()] - Reference date (defaults to today)
   * @returns {boolean}
   */
  shouldShowReminder(card, dueDate, today = new Date()) {
    if (!card.notificationsEnabled) return false;
    if (!dueDate) return false;

    const todayNorm = new Date(today);
    todayNorm.setHours(0, 0, 0, 0);

    const dueDateNorm = new Date(dueDate);
    dueDateNorm.setHours(0, 0, 0, 0);

    // reminderPeriod: 0 = same day, 1 = 1 day before, 3 = 3 days before, 7 = 7 days before
    const period = card.reminderPeriod != null ? card.reminderPeriod : 3;

    // Earliest day to show reminder
    const windowStart = new Date(dueDateNorm);
    windowStart.setDate(windowStart.getDate() - period);

    return todayNorm >= windowStart && todayNorm <= dueDateNorm;
  }

  /**
   * Get all upcoming reminders for cards that should be shown today.
   * Returns only cards with notifications enabled, sorted by due date ascending.
   * Requirements: 8.4, 8.5, 8.6, 8.7
   *
   * @param {Date} [today=new Date()] - Reference date (defaults to today)
   * @returns {Promise<Array<{card: Object, dueDate: Date}>>} Sorted reminder entries
   */
  async getUpcomingReminders(today = new Date()) {
    const cards = await this.cardStore.getAllCards();

    const reminders = [];

    for (const card of cards) {
      if (!card.notificationsEnabled) continue;
      if (!card.dueDate) continue;

      const dueDate = this.calculateNextDueDate(card, today);
      if (!dueDate) continue;

      if (this.shouldShowReminder(card, dueDate, today)) {
        reminders.push({ card, dueDate });
      }
    }

    // Requirement 8.7: sort by due date ascending
    reminders.sort((a, b) => a.dueDate - b.dueDate);

    return reminders;
  }

  /**
   * Get all cards that have a statement date or due date on the given calendar date.
   * Used by the calendar view to show events for a specific day.
   * Requirement 8.4
   *
   * @param {Date} date - The calendar date to query
   * @returns {Promise<Array<{card: Object, eventType: 'statement'|'due'}>>}
   */
  async getRemindersForDate(date) {
    const cards = await this.cardStore.getAllCards();
    const day = date.getDate();
    const results = [];

    for (const card of cards) {
      if (card.statementDate === day) {
        results.push({ card, eventType: 'statement' });
      }
      if (card.dueDate === day) {
        results.push({ card, eventType: 'due' });
      }
    }

    return results;
  }

  /**
   * Advance a card's statement cycle dates to the next month after the due date passes.
   * This is a pure calculation — it returns updated date values without persisting them.
   * Callers are responsible for saving the result via cardStore.updateCard().
   * Requirement 8.8
   *
   * @param {Object} card - Card object with statementDate and dueDate fields
   * @param {Date} [fromDate=new Date()] - Reference date (defaults to today)
   * @returns {{statementDate: number|null, dueDate: number|null, nextStatementDate: Date|null, nextDueDate: Date|null}}
   */
  updateStatementCycle(card, fromDate = new Date()) {
    const nextDueDate = this.calculateNextDueDate(card, fromDate);

    // Helper: build a date clamped to the last day of the given month
    const clampedDate = (year, month, d) => {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(d, lastDay));
    };

    let nextStatementDate = null;
    if (card.statementDate && nextDueDate) {
      const statDay = card.statementDate;
      const dueMonth = nextDueDate.getMonth();
      const dueYear = nextDueDate.getFullYear();

      // Try same month as due date first
      const sameMontCandidate = clampedDate(dueYear, dueMonth, statDay);

      if (sameMontCandidate <= nextDueDate) {
        nextStatementDate = sameMontCandidate;
      } else {
        // Statement date falls after due date in same month — use previous month
        const prevMonth = dueMonth === 0 ? 11 : dueMonth - 1;
        const prevYear = dueMonth === 0 ? dueYear - 1 : dueYear;
        nextStatementDate = clampedDate(prevYear, prevMonth, statDay);
      }
    }

    return {
      statementDate: card.statementDate || null,
      dueDate: card.dueDate || null,
      nextStatementDate,
      nextDueDate
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ReminderController };
}

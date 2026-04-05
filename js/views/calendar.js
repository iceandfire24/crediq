/**
 * Calendar View
 * Visualize statement cycles and payment due dates
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 13.1, 13.2
 */

class CalendarView {
  /**
   * @param {HTMLElement} container - DOM element to render into
   * @param {ReminderController} reminderController - Reminder controller instance
   */
  constructor(container, reminderController) {
    this.container = container;
    this.reminderController = reminderController;

    // Currently displayed month/year
    this._month = new Date().getMonth();   // 0-indexed
    this._year = new Date().getFullYear();

    // Events map: key = "YYYY-MM-DD", value = Array<{card, eventType}>
    this._events = new Map();

    // Currently selected date
    this._selectedDate = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Render the calendar view for the current month.
   * Requirements: 9.1, 13.1, 13.2
   */
  async render() {
    await this._loadEvents();
    this.container.innerHTML = this._buildPageHTML();
    this.attachEventListeners();
  }

  /**
   * Render the calendar grid for a specific month/year.
   * Requirement 9.1
   *
   * @param {number} month - 0-indexed month
   * @param {number} year  - Full year
   */
  async renderMonth(month, year) {
    this._month = month;
    this._year = year;
    await this._loadEvents();

    const grid = this.container.querySelector('#calendar-grid');
    const title = this.container.querySelector('#calendar-title');
    const datePanel = this.container.querySelector('#date-panel');

    if (title) title.textContent = this._formatMonthYear(month, year);
    if (grid) grid.innerHTML = this._buildGridHTML();
    if (datePanel) {
      datePanel.innerHTML = '';
      this._selectedDate = null;
    }

    this._attachGridListeners();
  }

  /**
   * Highlight dates that have statement or due date events.
   * Requirements: 9.2, 9.3, 9.5
   * (Called internally; exposed for testing.)
   *
   * @param {Map<string, Array>} eventsMap - Map of date-string → events
   */
  highlightDates(eventsMap) {
    if (!eventsMap) return;
    const cells = this.container.querySelectorAll('.cal-day[data-date]');
    cells.forEach(cell => {
      const dateStr = cell.dataset.date;
      const events = eventsMap.get(dateStr);
      if (!events || events.length === 0) return;

      const dotsContainer = cell.querySelector('.cal-day-dots');
      if (!dotsContainer) return;

      dotsContainer.innerHTML = '';
      const hasStatement = events.some(e => e.eventType === 'statement');
      const hasDue = events.some(e => e.eventType === 'due');

      if (hasStatement) {
        const dot = document.createElement('span');
        dot.className = 'cal-dot cal-dot-statement';
        dot.setAttribute('aria-hidden', 'true');
        dotsContainer.appendChild(dot);
      }
      if (hasDue) {
        const dot = document.createElement('span');
        dot.className = 'cal-dot cal-dot-due';
        dot.setAttribute('aria-hidden', 'true');
        dotsContainer.appendChild(dot);
      }
    });
  }

  /**
   * Handle a date cell click — show cards for that date.
   * Requirement 9.4
   *
   * @param {Date} date - The clicked date
   */
  handleDateClick(date) {
    this._selectedDate = date;
    const dateStr = this._toDateString(date);
    const events = this._events.get(dateStr) || [];

    // Update selected state on cells
    this.container.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));
    const clickedCell = this.container.querySelector(`.cal-day[data-date="${dateStr}"]`);
    if (clickedCell) clickedCell.classList.add('selected');

    this._renderDatePanel(date, events);
  }

  /**
   * Attach all event listeners.
   */
  attachEventListeners() {
    // Month navigation
    const prevBtn = this.container.querySelector('#btn-prev-month');
    const nextBtn = this.container.querySelector('#btn-next-month');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => this._navigateMonth(-1));
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => this._navigateMonth(1));
    }

    this._attachGridListeners();
  }

  // ---------------------------------------------------------------------------
  // Private: data loading
  // ---------------------------------------------------------------------------

  /**
   * Load all events for the current month into this._events.
   */
  async _loadEvents() {
    this._events = new Map();
    if (!this.reminderController) return;

    const daysInMonth = new Date(this._year, this._month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(this._year, this._month, day);
      try {
        const dayEvents = await this.reminderController.getRemindersForDate(date);
        if (dayEvents && dayEvents.length > 0) {
          this._events.set(this._toDateString(date), dayEvents);
        }
      } catch (_) { /* ignore */ }
    }
  }

  // ---------------------------------------------------------------------------
  // Private: HTML builders
  // ---------------------------------------------------------------------------

  /**
   * Build the full page HTML.
   */
  _buildPageHTML() {
    return `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Calendar</h1>
        </div>

        <div class="section">
          ${this._buildLegendHTML()}
        </div>

        <div class="section">
          <div class="cal-nav" role="navigation" aria-label="Month navigation">
            <button id="btn-prev-month" class="btn btn-secondary btn-sm" type="button" aria-label="Previous month">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <h2 id="calendar-title" class="cal-title" aria-live="polite">
              ${this._formatMonthYear(this._month, this._year)}
            </h2>
            <button id="btn-next-month" class="btn btn-secondary btn-sm" type="button" aria-label="Next month">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <div class="cal-wrapper" role="region" aria-label="Calendar grid">
            <div class="cal-weekdays" role="row">
              ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                .map(d => `<div class="cal-weekday" role="columnheader" aria-label="${d}">${d}</div>`)
                .join('')}
            </div>
            <div id="calendar-grid" class="cal-grid" role="grid" aria-label="Calendar days">
              ${this._buildGridHTML()}
            </div>
          </div>
        </div>

        <div id="date-panel" class="section" aria-live="polite" aria-label="Events for selected date">
          <!-- Date events rendered here on click -->
        </div>
      </div>
    `;
  }

  /**
   * Build the calendar grid HTML for the current month.
   * Requirement 9.1
   */
  _buildGridHTML() {
    const firstDay = new Date(this._year, this._month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(this._year, this._month + 1, 0).getDate();
    const today = new Date();
    const todayStr = this._toDateString(today);

    let html = '';

    // Leading empty cells
    for (let i = 0; i < firstDay; i++) {
      html += `<div class="cal-day cal-day-empty" role="gridcell" aria-hidden="true"></div>`;
    }

    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(this._year, this._month, day);
      const dateStr = this._toDateString(date);
      const isToday = dateStr === todayStr;
      const events = this._events.get(dateStr) || [];
      const hasEvents = events.length > 0;

      const hasStatement = events.some(e => e.eventType === 'statement');
      const hasDue = events.some(e => e.eventType === 'due');

      const classes = [
        'cal-day',
        isToday ? 'cal-day-today' : '',
        hasEvents ? 'cal-day-has-events' : ''
      ].filter(Boolean).join(' ');

      const ariaLabel = `${day} ${this._formatMonthYear(this._month, this._year)}${isToday ? ', today' : ''}${hasEvents ? `, ${events.length} event${events.length !== 1 ? 's' : ''}` : ''}`;

      html += `
        <div class="${this._esc(classes)}" role="gridcell" tabindex="0"
          data-date="${this._esc(dateStr)}"
          aria-label="${this._esc(ariaLabel)}"
          aria-selected="false">
          <span class="cal-day-number">${day}</span>
          <div class="cal-day-dots" aria-hidden="true">
            ${hasStatement ? '<span class="cal-dot cal-dot-statement"></span>' : ''}
            ${hasDue ? '<span class="cal-dot cal-dot-due"></span>' : ''}
          </div>
        </div>
      `;
    }

    return html;
  }

  /**
   * Build the event type legend HTML.
   * Requirement 9.5
   */
  _buildLegendHTML() {
    return `
      <div class="cal-legend" role="list" aria-label="Calendar legend">
        <div class="cal-legend-item" role="listitem">
          <span class="cal-dot cal-dot-statement" aria-hidden="true"></span>
          <span class="cal-legend-label">Statement Date</span>
        </div>
        <div class="cal-legend-item" role="listitem">
          <span class="cal-dot cal-dot-due" aria-hidden="true"></span>
          <span class="cal-legend-label">Payment Due Date</span>
        </div>
      </div>
    `;
  }

  /**
   * Render the date panel showing cards for the selected date.
   * Requirement 9.4
   *
   * @param {Date} date
   * @param {Array<{card: Object, eventType: string}>} events
   */
  _renderDatePanel(date, events) {
    const panel = this.container.querySelector('#date-panel');
    if (!panel) return;

    const dateLabel = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    if (events.length === 0) {
      panel.innerHTML = `
        <h3 class="section-title">${this._esc(dateLabel)}</h3>
        <p style="color:var(--text-secondary);font-size:var(--text-sm);">No events on this date.</p>
      `;
      return;
    }

    const itemsHTML = events.map(({ card, eventType }) => {
      const bankColor = this._getBankColor(card.bank);
      const networkLogoSrc = this._getNetworkLogo(card.network);
      const logoHTML = networkLogoSrc
        ? `<img class="card-network-logo" src="${this._esc(networkLogoSrc)}" alt="${this._esc(card.network || '')} logo" loading="lazy" style="width:32px;height:20px;">`
        : `<span class="card-network-placeholder" style="width:32px;height:20px;"></span>`;

      const eventLabel = eventType === 'statement' ? 'Statement Date' : 'Payment Due';
      const dotClass = eventType === 'statement' ? 'cal-dot-statement' : 'cal-dot-due';

      return `
        <div class="cal-event-item" style="border-left:3px solid ${this._esc(bankColor)};" role="listitem">
          ${logoHTML}
          <div class="cal-event-info">
            <span class="cal-event-name">${this._esc(card.name || 'Card')}</span>
            <span class="cal-event-bank">${this._esc(card.bank && card.bank !== 'Unknown' ? card.bank : '')}</span>
          </div>
          <div class="cal-event-type">
            <span class="cal-dot ${this._esc(dotClass)}" aria-hidden="true"></span>
            <span class="cal-event-label">${this._esc(eventLabel)}</span>
          </div>
        </div>
      `;
    }).join('');

    panel.innerHTML = `
      <h3 class="section-title">${this._esc(dateLabel)}</h3>
      <div role="list" aria-label="Events for ${this._esc(dateLabel)}">
        ${itemsHTML}
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Private: event listeners
  // ---------------------------------------------------------------------------

  /**
   * Attach click/keyboard listeners to calendar day cells.
   */
  _attachGridListeners() {
    const grid = this.container.querySelector('#calendar-grid');
    if (!grid) return;

    grid.addEventListener('click', (e) => {
      const cell = e.target.closest('.cal-day[data-date]');
      if (cell) {
        const date = new Date(cell.dataset.date + 'T00:00:00');
        this.handleDateClick(date);
      }
    });

    grid.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const cell = e.target.closest('.cal-day[data-date]');
        if (cell) {
          e.preventDefault();
          const date = new Date(cell.dataset.date + 'T00:00:00');
          this.handleDateClick(date);
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private: navigation
  // ---------------------------------------------------------------------------

  /**
   * Navigate to the previous or next month.
   * @param {-1|1} direction
   */
  async _navigateMonth(direction) {
    let month = this._month + direction;
    let year = this._year;

    if (month < 0) { month = 11; year--; }
    if (month > 11) { month = 0; year++; }

    await this.renderMonth(month, year);
  }

  // ---------------------------------------------------------------------------
  // Private: formatting helpers
  // ---------------------------------------------------------------------------

  /**
   * Format a month/year as "Month YYYY".
   * @param {number} month - 0-indexed
   * @param {number} year
   * @returns {string}
   */
  _formatMonthYear(month, year) {
    return new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  /**
   * Convert a Date to "YYYY-MM-DD" string.
   * @param {Date} date
   * @returns {string}
   */
  _toDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Get bank color from detector service or fall back to default.
   * @param {string} bank
   * @returns {string}
   */
  _getBankColor(bank) {
    if (typeof detectorService !== 'undefined' && detectorService) {
      return detectorService.getBankColor(bank || 'Unknown');
    }
    return '#64748b';
  }

  /**
   * Get network logo path from detector service.
   * @param {string} network
   * @returns {string}
   */
  _getNetworkLogo(network) {
    if (typeof detectorService !== 'undefined' && detectorService) {
      return detectorService.getNetworkLogo(network || 'Unknown');
    }
    return 'assets/icons/placeholder.png';
  }

  /**
   * Escape HTML special characters to prevent XSS.
   * Requirement 19.4
   * @param {string} str
   * @returns {string}
   */
  _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CalendarView };
}

/**
 * Card List View
 * Displays all cards with search, filter, sort, and payment reminders
 * Requirements: 2.1, 4.1, 4.2, 4.3, 4.4, 4.5, 8.5, 8.6, 8.7, 13.1, 13.2, 17.5, 17.8
 */

class CardListView {
  /**
   * @param {HTMLElement} container - DOM element to render into
   * @param {CardController} cardController - Card CRUD controller
   * @param {SearchController} searchController - Search/filter/sort controller
   * @param {ReminderController} reminderController - Payment reminder controller
   */
  constructor(container, cardController, searchController, reminderController) {
    this.container = container;
    this.cardController = cardController;
    this.searchController = searchController;
    this.reminderController = reminderController;

    // Current filter/sort state
    this._filters = {
      query: '',
      network: '',
      bank: '',
      tag: '',
      sortBy: ''
    };

    // All cards loaded from store (unfiltered)
    this._allCards = [];

    // Debounce timer for search input
    this._searchTimer = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Render the full card list page including reminders and card grid.
   * Requirements: 4.1, 8.5, 8.6, 8.7, 13.1, 13.2
   *
   * @param {Array<Object>} cards - Array of card objects to display
   */
  async render(cards) {
    this._allCards = Array.isArray(cards) ? cards : [];

    // Fetch upcoming reminders (Req 8.5, 8.6, 8.7)
    let reminders = [];
    if (this.reminderController) {
      try {
        reminders = await this.reminderController.getUpcomingReminders();
      } catch (_) {
        reminders = [];
      }
    }

    // Build unique filter options from all cards
    const networks = [...new Set(this._allCards.map(c => c.network).filter(Boolean).filter(n => n !== 'Unknown'))].sort();
    const banks = [...new Set(this._allCards.map(c => c.bank).filter(Boolean).filter(b => b !== 'Unknown'))].sort();

    // Load all available tags via controller if possible (Req 10.4), else derive from current cards
    let tags;
    if (this.cardController && typeof this.cardController.getAvailableTags === 'function') {
      try {
        tags = await this.cardController.getAvailableTags();
      } catch (_) {
        tags = [...new Set(this._allCards.flatMap(c => c.tags || []))].sort();
      }
    } else {
      tags = [...new Set(this._allCards.flatMap(c => c.tags || []))].sort();
    }

    this.container.innerHTML = this._buildPageHTML(reminders, networks, banks, tags);

    this.attachEventListeners();

    // Render the initial (unfiltered) card grid
    this._renderCardGrid(this._allCards);
  }

  /**
   * Render a single card item element.
   * Requirements: 2.1, 17.5, 17.8
   *
   * @param {Object} card - Card object
   * @returns {HTMLElement} Card item element
   */
  renderCard(card) {
    const el = document.createElement('article');
    el.className = 'card-item';
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', `${this._esc(card.name)} card`);
    el.dataset.cardId = card.id;

    // Bank color accent (Req 17.8)
    const bankColor = this._getBankColor(card.bank);
    el.style.setProperty('--card-accent', bankColor);

    // Network logo path (Req 17.5)
    const networkLogoSrc = this._getNetworkLogo(card.network);
    const networkLogoHTML = networkLogoSrc
      ? `<img class="card-network-logo" src="${this._esc(networkLogoSrc)}" alt="${this._esc(card.network || 'Unknown')} logo" loading="lazy">`
      : `<span class="card-network-placeholder" aria-label="Unknown network"></span>`;

    // Masked number
    const maskedNum = card.maskedNumber || (card.number ? '•••• ' + String(card.number).slice(-4) : '•••• ••••');

    // Expiry display with warning classes
    const expiryClass = this._expiryClass(card);
    const expiryLabel = card.expiry ? this._formatExpiry(card.expiry) : '—';

    // Tags (up to 3 shown)
    const visibleTags = (card.tags || []).slice(0, 3);
    const tagsHTML = visibleTags.length
      ? `<div class="card-tags">${visibleTags.map(t => `<span class="card-tag">${this._esc(t)}</span>`).join('')}</div>`
      : '';

    el.innerHTML = `
      <div class="card-item-header">
        ${networkLogoHTML}
        <span class="card-item-name">${this._esc(card.name || 'Unnamed Card')}</span>
      </div>
      <div class="card-item-number">${this._esc(maskedNum)}</div>
      ${tagsHTML}
      <div class="card-item-footer">
        <span class="card-item-bank">${this._esc(card.bank && card.bank !== 'Unknown' ? card.bank : '')}</span>
        <span class="card-item-expiry ${expiryClass}" aria-label="Expires ${expiryLabel}">
          ${this._esc(expiryLabel)}
        </span>
      </div>
    `;

    return el;
  }

  /**
   * Wire up all event listeners for search, filter, sort, and card clicks.
   * Requirements: 4.2, 4.3, 4.4, 4.5
   */
  attachEventListeners() {
    // Search input (debounced, Req 4.2)
    const searchInput = this.container.querySelector('#card-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 300);
      });
    }

    // Search clear button
    const searchClear = this.container.querySelector('#card-search-clear');
    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        this.handleSearch('');
      });
    }

    // Filter dropdowns (Req 4.4)
    const networkFilter = this.container.querySelector('#filter-network');
    if (networkFilter) {
      networkFilter.addEventListener('change', (e) => {
        this.handleFilter('network', e.target.value);
      });
    }

    const bankFilter = this.container.querySelector('#filter-bank');
    if (bankFilter) {
      bankFilter.addEventListener('change', (e) => {
        this.handleFilter('bank', e.target.value);
      });
    }

    const tagFilter = this.container.querySelector('#filter-tag');
    if (tagFilter) {
      tagFilter.addEventListener('change', (e) => {
        this.handleFilter('tag', e.target.value);
      });
    }

    // Sort dropdown (Req 4.3)
    const sortSelect = this.container.querySelector('#sort-cards');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.handleSort(e.target.value);
      });
    }

    // Card grid click / keyboard (Req 4.1 - navigate to card details)
    const cardGrid = this.container.querySelector('#card-grid');
    if (cardGrid) {
      cardGrid.addEventListener('click', (e) => {
        const cardItem = e.target.closest('.card-item[data-card-id]');
        if (cardItem) {
          this._navigateToCard(cardItem.dataset.cardId);
        }
      });

      cardGrid.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const cardItem = e.target.closest('.card-item[data-card-id]');
          if (cardItem) {
            e.preventDefault();
            this._navigateToCard(cardItem.dataset.cardId);
          }
        }
      });
    }

    // Add card button
    const addBtn = this.container.querySelector('#btn-add-card');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (typeof router !== 'undefined') {
          router.navigate('/add');
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Event handlers
  // ---------------------------------------------------------------------------

  /**
   * Handle search query changes.
   * Requirement 4.2
   *
   * @param {string} query - Search string
   */
  handleSearch(query) {
    this._filters.query = query || '';
    this._applyFiltersAndRender();

    // Toggle clear button visibility
    const clearBtn = this.container.querySelector('#card-search-clear');
    if (clearBtn) {
      clearBtn.style.display = query ? 'flex' : 'none';
    }
  }

  /**
   * Handle filter dropdown changes.
   * Requirement 4.4
   *
   * @param {'network'|'bank'|'tag'} filterType - Which filter changed
   * @param {string} filterValue - Selected value (empty string = no filter)
   */
  handleFilter(filterType, filterValue) {
    if (filterType === 'network' || filterType === 'bank' || filterType === 'tag') {
      this._filters[filterType] = filterValue || '';
    }
    this._applyFiltersAndRender();
  }

  /**
   * Handle sort dropdown changes.
   * Requirement 4.3
   *
   * @param {'name'|'expiry'|'age'|''} sortBy - Sort criterion
   */
  handleSort(sortBy) {
    this._filters.sortBy = sortBy || '';
    this._applyFiltersAndRender();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Apply current filters/sort and re-render the card grid.
   * Requirement 4.5
   */
  _applyFiltersAndRender() {
    const filtered = this.searchController
      ? this.searchController.combineFilters(this._allCards, this._filters)
      : this._allCards;
    this._renderCardGrid(filtered);
  }

  /**
   * Render the card grid with the given cards.
   * @param {Array<Object>} cards
   */
  _renderCardGrid(cards) {
    const grid = this.container.querySelector('#card-grid');
    if (!grid) return;

    grid.innerHTML = '';

    if (!cards || cards.length === 0) {
      grid.innerHTML = `
        <div class="card-grid-empty">
          <svg class="card-grid-empty-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
          <p class="card-grid-empty-title">No cards found</p>
          <p class="card-grid-empty-text">
            ${this._hasActiveFilters()
              ? 'Try adjusting your search or filters.'
              : 'Add your first card to get started.'}
          </p>
        </div>
      `;
      return;
    }

    // Use a document fragment for efficient DOM batching (Req 21.6)
    const fragment = document.createDocumentFragment();
    for (const card of cards) {
      fragment.appendChild(this.renderCard(card));
    }
    grid.appendChild(fragment);
  }

  /**
   * Build the full page HTML string.
   * @param {Array} reminders
   * @param {string[]} networks
   * @param {string[]} banks
   * @param {string[]} tags
   * @returns {string}
   */
  _buildPageHTML(reminders, networks, banks, tags) {
    return `
      <div class="page-container">
        ${this._buildRemindersHTML(reminders)}

        <div class="page-header">
          <h1 class="page-title">My Cards</h1>
          <button id="btn-add-card" class="btn btn-primary btn-sm" aria-label="Add new card">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Card
          </button>
        </div>

        <div class="section">
          <div class="search-bar" role="search">
            <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
            </svg>
            <input
              id="card-search-input"
              class="form-input"
              type="search"
              placeholder="Search by name, bank, or network…"
              aria-label="Search cards"
              autocomplete="off"
            >
            <button id="card-search-clear" class="search-clear" aria-label="Clear search" style="display:none">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="section">
          <div class="filter-bar" role="group" aria-label="Filter and sort options">
            <label class="sr-only" for="filter-network">Filter by network</label>
            <select id="filter-network" class="form-select" style="min-width:130px; min-height:36px; font-size:var(--text-sm);" aria-label="Filter by network">
              <option value="">All Networks</option>
              ${networks.map(n => `<option value="${this._esc(n)}">${this._esc(n)}</option>`).join('')}
            </select>

            <label class="sr-only" for="filter-bank">Filter by bank</label>
            <select id="filter-bank" class="form-select" style="min-width:130px; min-height:36px; font-size:var(--text-sm);" aria-label="Filter by bank">
              <option value="">All Banks</option>
              ${banks.map(b => `<option value="${this._esc(b)}">${this._esc(b)}</option>`).join('')}
            </select>

            ${tags.length ? `
            <label class="sr-only" for="filter-tag">Filter by tag</label>
            <select id="filter-tag" class="form-select" style="min-width:110px; min-height:36px; font-size:var(--text-sm);" aria-label="Filter by tag">
              <option value="">All Tags</option>
              ${tags.map(t => `<option value="${this._esc(t)}">${this._esc(t)}</option>`).join('')}
            </select>
            ` : `
            <label class="sr-only" for="filter-tag">Filter by tag</label>
            <select id="filter-tag" class="form-select" style="min-width:110px; min-height:36px; font-size:var(--text-sm);" aria-label="Filter by tag" disabled>
              <option value="">All Tags</option>
            </select>
            `}

            <label class="sr-only" for="sort-cards">Sort cards</label>
            <select id="sort-cards" class="form-select" style="min-width:120px; min-height:36px; font-size:var(--text-sm);" aria-label="Sort cards">
              <option value="">Sort: Default</option>
              <option value="name">Sort: Name</option>
              <option value="expiry">Sort: Expiry</option>
              <option value="age">Sort: Age</option>
            </select>
          </div>
        </div>

        <div id="card-grid" class="card-grid" role="list" aria-label="Card list">
          <!-- Cards rendered here -->
        </div>
      </div>
    `;
  }

  /**
   * Build the upcoming payment reminders section HTML.
   * Requirements: 8.5, 8.6, 8.7
   *
   * @param {Array<{card: Object, dueDate: Date}>} reminders
   * @returns {string}
   */
  _buildRemindersHTML(reminders) {
    if (!reminders || reminders.length === 0) return '';

    const items = reminders.map(({ card, dueDate }) => {
      const bankColor = this._getBankColor(card.bank);
      const networkLogoSrc = this._getNetworkLogo(card.network);
      const logoHTML = networkLogoSrc
        ? `<img class="card-network-logo" src="${this._esc(networkLogoSrc)}" alt="${this._esc(card.network || '')} logo" loading="lazy" style="width:28px;height:18px;">`
        : `<span class="card-network-placeholder" style="width:28px;height:18px;"></span>`;

      const dueDateStr = dueDate instanceof Date
        ? dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        : '';

      const daysUntil = dueDate instanceof Date
        ? Math.ceil((dueDate - new Date(new Date().toDateString())) / 86400000)
        : null;

      const urgencyClass = daysUntil === 0 ? 'badge-danger' : daysUntil <= 1 ? 'badge-warning' : 'badge-info';
      const urgencyLabel = daysUntil === 0 ? 'Due today' : daysUntil === 1 ? 'Due tomorrow' : `Due in ${daysUntil} days`;

      return `
        <div class="reminder-item" style="display:flex;align-items:center;gap:var(--spacing-sm);padding:var(--spacing-sm) var(--spacing-md);border-left:3px solid ${this._esc(bankColor)};background:var(--surface);border-radius:var(--radius-md);margin-bottom:var(--spacing-xs);">
          ${logoHTML}
          <span style="flex:1;font-size:var(--text-sm);font-weight:500;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this._esc(card.name || 'Card')}</span>
          <span style="font-size:var(--text-xs);color:var(--text-secondary);white-space:nowrap;">${this._esc(dueDateStr)}</span>
          <span class="badge ${urgencyClass}" aria-label="${this._esc(urgencyLabel)}">${this._esc(urgencyLabel)}</span>
        </div>
      `;
    }).join('');

    return `
      <section class="section" aria-label="Upcoming payment reminders">
        <h2 class="section-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" style="display:inline;vertical-align:middle;margin-right:6px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          Upcoming Payments
        </h2>
        ${items}
      </section>
    `;
  }

  /**
   * Navigate to card details page.
   * @param {string} cardId
   */
  _navigateToCard(cardId) {
    if (typeof router !== 'undefined' && router) {
      router.navigate(`/card/${cardId}`);
    }
  }

  /**
   * Check if any filter is currently active.
   * @returns {boolean}
   */
  _hasActiveFilters() {
    return !!(this._filters.query || this._filters.network || this._filters.bank || this._filters.tag);
  }

  /**
   * Get bank color from detector service or fall back to default.
   * @param {string} bank
   * @returns {string} Hex color
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
   * @returns {string} Logo path
   */
  _getNetworkLogo(network) {
    if (typeof detectorService !== 'undefined' && detectorService) {
      return detectorService.getNetworkLogo(network || 'Unknown');
    }
    return 'assets/icons/placeholder.png';
  }

  /**
   * Format YYYY-MM expiry to MM/YYYY.
   * @param {string} expiry
   * @returns {string}
   */
  _formatExpiry(expiry) {
    if (!expiry) return '';
    const [year, month] = expiry.split('-');
    if (!year || !month) return expiry;
    return `${month}/${year}`;
  }

  /**
   * Determine CSS class for expiry date display.
   * @param {Object} card
   * @returns {string}
   */
  _expiryClass(card) {
    if (!card.expiry) return '';
    // Use Card model computed properties if available
    if (typeof card.isExpired !== 'undefined' && card.isExpired) return 'expired';
    if (typeof card.isExpiringSoon !== 'undefined' && card.isExpiringSoon) return 'expiring-soon';

    // Fallback calculation
    const [year, month] = card.expiry.split('-').map(Number);
    if (!year || !month) return '';
    const expiryDate = new Date(year, month, 0);
    const now = new Date();
    if (expiryDate < now) return 'expired';
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    if (expiryDate <= threeMonths) return 'expiring-soon';
    return '';
  }

  /**
   * Escape HTML special characters to prevent XSS.
   * Requirement 19.4
   *
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

// ES module export
export { CardListView };

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardListView };
}

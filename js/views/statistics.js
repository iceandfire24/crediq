/**
 * Statistics View
 * Display card portfolio analytics
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 13.1, 13.2
 */

class StatisticsView {
  /**
   * @param {HTMLElement} container - DOM element to render into
   * @param {StatisticsService} statisticsService - Statistics service instance
   */
  constructor(container, statisticsService) {
    this.container = container;
    this.statisticsService = statisticsService;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Render the full statistics page.
   * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 13.1, 13.2
   */
  async render() {
    // Show loading state
    this.container.innerHTML = this._buildLoadingHTML();

    try {
      const [overall, networkStats, bankStats] = await Promise.all([
        this.statisticsService.calculateOverallStats(),
        this.statisticsService.calculateNetworkStats(),
        this.statisticsService.calculateBankStats()
      ]);

      this.container.innerHTML = this._buildPageHTML(overall, networkStats, bankStats);
    } catch (_) {
      this.container.innerHTML = this._buildErrorHTML();
    }
  }

  /**
   * Render the overall statistics section.
   * Requirements: 7.1, 7.2, 7.3, 7.6
   *
   * @param {Object} stats - Overall stats from StatisticsService.calculateOverallStats()
   * @returns {string} HTML string
   */
  renderOverallStats(stats) {
    if (!stats) return '';

    const avgAge = stats.averageAge
      ? this._formatAge(stats.averageAge)
      : '—';

    return `
      <div class="stats-grid">
        <div class="stat-card" aria-label="Total cards: ${stats.totalCards}">
          <div class="stat-icon stat-icon-blue" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
          </div>
          <div class="stat-value">${this._esc(String(stats.totalCards))}</div>
          <div class="stat-label">Total Cards</div>
        </div>

        <div class="stat-card" aria-label="Total annual fees: ${this._formatCurrency(stats.totalFees)}">
          <div class="stat-icon stat-icon-amber" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-value">${this._esc(this._formatCurrency(stats.totalFees))}</div>
          <div class="stat-label">Annual Fees</div>
        </div>

        <div class="stat-card" aria-label="Total credit limit: ${this._formatCurrency(stats.totalCreditLimit)}">
          <div class="stat-icon stat-icon-green" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div class="stat-value">${this._esc(this._formatCurrency(stats.totalCreditLimit))}</div>
          <div class="stat-label">Credit Limit</div>
        </div>

        <div class="stat-card" aria-label="Average card age: ${avgAge}">
          <div class="stat-icon stat-icon-purple" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div class="stat-value">${this._esc(avgAge)}</div>
          <div class="stat-label">Avg Card Age</div>
        </div>
      </div>
    `;
  }

  /**
   * Render the network breakdown section.
   * Requirement 7.4
   *
   * @param {Array<Object>} networkStats - From StatisticsService.calculateNetworkStats()
   * @returns {string} HTML string
   */
  renderNetworkBreakdown(networkStats) {
    if (!networkStats || networkStats.length === 0) {
      return `<p style="color:var(--text-secondary);font-size:var(--text-sm);">No data available.</p>`;
    }

    // Sort by card count descending
    const sorted = [...networkStats].sort((a, b) => b.totalCards - a.totalCards);

    const rows = sorted.map(item => `
      <div class="stats-row" role="row">
        <div class="stats-row-name" role="cell">
          ${this._getNetworkLogoHTML(item.network)}
          <span>${this._esc(item.network)}</span>
        </div>
        <div class="stats-row-count" role="cell">
          <span class="badge badge-neutral">${item.totalCards} card${item.totalCards !== 1 ? 's' : ''}</span>
        </div>
        <div class="stats-row-value" role="cell">${this._esc(this._formatCurrency(item.totalCreditLimit))}</div>
      </div>
    `).join('');

    return `
      <div class="stats-table" role="table" aria-label="Network breakdown">
        <div class="stats-table-header" role="row">
          <div role="columnheader">Network</div>
          <div role="columnheader">Cards</div>
          <div role="columnheader">Credit Limit</div>
        </div>
        ${rows}
      </div>
    `;
  }

  /**
   * Render the bank breakdown section.
   *
   * @param {Array<Object>} bankStats - From StatisticsService.calculateBankStats()
   * @returns {string} HTML string
   */
  renderBankBreakdown(bankStats) {
    if (!bankStats || bankStats.length === 0) {
      return `<p style="color:var(--text-secondary);font-size:var(--text-sm);">No data available.</p>`;
    }

    // Sort by card count descending
    const sorted = [...bankStats].sort((a, b) => b.totalCards - a.totalCards);

    const rows = sorted.map(item => {
      const bankColor = this._getBankColor(item.bank);
      return `
        <div class="stats-row" role="row">
          <div class="stats-row-name" role="cell">
            <span class="stats-bank-dot" style="background-color:${this._esc(bankColor)};" aria-hidden="true"></span>
            <span>${this._esc(item.bank)}</span>
          </div>
          <div class="stats-row-count" role="cell">
            <span class="badge badge-neutral">${item.totalCards} card${item.totalCards !== 1 ? 's' : ''}</span>
          </div>
          <div class="stats-row-value" role="cell">${this._esc(this._formatCurrency(item.totalCreditLimit))}</div>
        </div>
      `;
    }).join('');

    return `
      <div class="stats-table" role="table" aria-label="Bank breakdown">
        <div class="stats-table-header" role="row">
          <div role="columnheader">Bank</div>
          <div role="columnheader">Cards</div>
          <div role="columnheader">Credit Limit</div>
        </div>
        ${rows}
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Private: HTML builders
  // ---------------------------------------------------------------------------

  /**
   * Build the full statistics page HTML.
   * @param {Object} overall
   * @param {Array} networkStats
   * @param {Array} bankStats
   * @returns {string}
   */
  _buildPageHTML(overall, networkStats, bankStats) {
    const expiringCards = overall.expiringCards || [];

    return `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Statistics</h1>
        </div>

        <div class="section">
          <h2 class="section-title">Overview</h2>
          ${this.renderOverallStats(overall)}
        </div>

        <div class="section">
          <h2 class="section-title">By Network</h2>
          ${this.renderNetworkBreakdown(networkStats)}
        </div>

        <div class="section">
          <h2 class="section-title">By Bank</h2>
          ${this.renderBankBreakdown(bankStats)}
        </div>

        ${expiringCards.length > 0 ? this._buildExpiringSoonHTML(expiringCards) : ''}
      </div>
    `;
  }

  /**
   * Build the expiring cards section.
   * Requirement 7.5
   *
   * @param {Array<Object>} cards - Cards expiring within 3 months
   * @returns {string}
   */
  _buildExpiringSoonHTML(cards) {
    const items = cards.map(card => {
      const bankColor = this._getBankColor(card.bank);
      const networkLogoSrc = this._getNetworkLogo(card.network);
      const logoHTML = networkLogoSrc
        ? `<img class="card-network-logo" src="${this._esc(networkLogoSrc)}" alt="${this._esc(card.network || '')} logo" loading="lazy" style="width:32px;height:20px;">`
        : `<span class="card-network-placeholder" style="width:32px;height:20px;"></span>`;

      const expiryDisplay = card.expiry ? this._formatExpiry(card.expiry) : '—';

      return `
        <div class="stats-expiring-item" style="border-left:3px solid ${this._esc(bankColor)};" role="listitem">
          ${logoHTML}
          <div class="stats-expiring-info">
            <span class="stats-expiring-name">${this._esc(card.name || 'Card')}</span>
            <span class="stats-expiring-bank">${this._esc(card.bank && card.bank !== 'Unknown' ? card.bank : '')}</span>
          </div>
          <span class="badge badge-warning" aria-label="Expires ${expiryDisplay}">
            Expires ${this._esc(expiryDisplay)}
          </span>
        </div>
      `;
    }).join('');

    return `
      <div class="section">
        <h2 class="section-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" style="display:inline;vertical-align:middle;margin-right:6px;color:var(--warning);">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          Expiring Soon
        </h2>
        <div role="list" aria-label="Cards expiring within 3 months">
          ${items}
        </div>
      </div>
    `;
  }

  /**
   * Build the loading state HTML.
   */
  _buildLoadingHTML() {
    return `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Statistics</h1>
        </div>
        <div class="section" style="display:flex;justify-content:center;padding:var(--spacing-2xl);">
          <div class="spinner spinner-lg" role="status" aria-label="Loading statistics"></div>
        </div>
      </div>
    `;
  }

  /**
   * Build the error state HTML.
   */
  _buildErrorHTML() {
    return `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Statistics</h1>
        </div>
        <div class="section" style="text-align:center;padding:var(--spacing-2xl);">
          <p style="color:var(--danger);">Failed to load statistics. Please try again.</p>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Private: formatting helpers
  // ---------------------------------------------------------------------------

  /**
   * Format a currency value (Indian Rupee style).
   * @param {number} value
   * @returns {string}
   */
  _formatCurrency(value) {
    if (!value && value !== 0) return '—';
    if (value === 0) return '₹0';
    return '₹' + Number(value).toLocaleString('en-IN');
  }

  /**
   * Format an age object to a human-readable string.
   * @param {{years: number, months: number}} age
   * @returns {string}
   */
  _formatAge(age) {
    if (!age) return '—';
    const parts = [];
    if (age.years > 0) parts.push(`${age.years}y`);
    if (age.months > 0) parts.push(`${age.months}m`);
    return parts.length > 0 ? parts.join(' ') : '< 1m';
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
   * Get network logo HTML.
   * @param {string} network
   * @returns {string}
   */
  _getNetworkLogoHTML(network) {
    const src = this._getNetworkLogo(network);
    if (src) {
      return `<img class="card-network-logo" src="${this._esc(src)}" alt="${this._esc(network)} logo" loading="lazy" style="width:32px;height:20px;">`;
    }
    return `<span class="card-network-placeholder" style="width:32px;height:20px;" aria-hidden="true"></span>`;
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
  module.exports = { StatisticsView };
}

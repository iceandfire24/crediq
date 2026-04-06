/**
 * Statistics Service
 * Calculate card portfolio statistics
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 16.3, 16.4
 */

class StatisticsService {
  /**
   * @param {CardStore} cardStore - Card store instance
   */
  constructor(cardStore) {
    this.cardStore = cardStore;
    // Cache for computed statistics (Req 21.5)
    this._cache = {};
    this._cacheKey = null;
  }

  /**
   * Compute a cache key from the cards array.
   * Uses card count + latest updatedAt timestamp for fast invalidation.
   * @param {Array<Object>} cards
   * @returns {string}
   */
  _computeCacheKey(cards) {
    const count = cards.length;
    const lastUpdated = cards.reduce((max, c) => {
      const ts = c.updatedAt || c.createdAt || '';
      return ts > max ? ts : max;
    }, '');
    return `${count}:${lastUpdated}`;
  }

  /**
   * Invalidate the statistics cache.
   * Should be called whenever cards are added, updated, or deleted.
   * Requirement 21.5
   */
  invalidateCache() {
    this._cache = {};
    this._cacheKey = null;
  }

  /**
   * Calculate overall portfolio statistics
   * Requirements: 7.1, 7.2, 7.3, 7.6
   * @returns {Promise<Object>} Overall stats object
   */
  async calculateOverallStats() {
    const cards = await this.cardStore.getAllCards();
    const key = this._computeCacheKey(cards);

    if (key === this._cacheKey && this._cache.overall) {
      return this._cache.overall;
    }

    // Key changed — reset cache for new card set
    if (key !== this._cacheKey) {
      this._cache = {};
      this._cacheKey = key;
    }

    const result = {
      totalCards: cards.length,
      totalFees: this.calculateTotalFees(cards),
      totalCreditLimit: this.calculateTotalCreditLimit(cards),
      averageAge: this.calculateAverageAge(cards),
      expiringCards: this.findExpiringCards(cards, 3)
    };

    this._cache.overall = result;
    return result;
  }

  /**
   * Calculate statistics grouped by card network
   * Requirement: 7.4
   * @returns {Promise<Array<Object>>} Array of per-network stats
   */
  async calculateNetworkStats() {
    const cards = await this.cardStore.getAllCards();
    const key = this._computeCacheKey(cards);

    if (key === this._cacheKey && this._cache.network) {
      return this._cache.network;
    }

    if (key !== this._cacheKey) {
      this._cache = {};
      this._cacheKey = key;
    }

    const groups = {};
    for (const card of cards) {
      const network = card.network || 'Unknown';
      if (!groups[network]) {
        groups[network] = [];
      }
      groups[network].push(card);
    }

    const result = Object.entries(groups).map(([network, networkCards]) => ({
      network,
      totalCards: networkCards.length,
      totalFees: this.calculateTotalFees(networkCards),
      totalCreditLimit: this.calculateTotalCreditLimit(networkCards)
    }));

    this._cache.network = result;
    return result;
  }

  /**
   * Calculate statistics grouped by bank
   * @returns {Promise<Array<Object>>} Array of per-bank stats
   */
  async calculateBankStats() {
    const cards = await this.cardStore.getAllCards();
    const key = this._computeCacheKey(cards);

    if (key === this._cacheKey && this._cache.bank) {
      return this._cache.bank;
    }

    if (key !== this._cacheKey) {
      this._cache = {};
      this._cacheKey = key;
    }

    const groups = {};
    for (const card of cards) {
      const bank = card.bank || 'Unknown';
      if (!groups[bank]) {
        groups[bank] = [];
      }
      groups[bank].push(card);
    }

    const result = Object.entries(groups).map(([bank, bankCards]) => ({
      bank,
      totalCards: bankCards.length,
      totalFees: this.calculateTotalFees(bankCards),
      totalCreditLimit: this.calculateTotalCreditLimit(bankCards)
    }));

    this._cache.bank = result;
    return result;
  }

  /**
   * Calculate total credit limit with shared limit deduplication.
   * Cards sharing a limit (via sharedLimitWith) are counted only once.
   * Requirements: 16.3, 16.4
   * @param {Array<Object>} cards
   * @returns {number} Total credit limit
   */
  calculateTotalCreditLimit(cards) {
    const processedIds = new Set();
    let total = 0;

    for (const card of cards) {
      if (processedIds.has(card.id)) continue;

      if (card.sharedLimitWith && card.sharedLimitWith.length > 0) {
        // Find all cards in this shared group that are present in the provided list
        const groupIds = [card.id, ...card.sharedLimitWith];
        const groupCards = cards.filter(c => groupIds.includes(c.id));

        // Use the highest credit limit in the group
        const groupLimit = Math.max(...groupCards.map(c => c.creditLimit || 0));
        total += groupLimit;

        // Mark all group members as processed
        for (const gc of groupCards) {
          processedIds.add(gc.id);
        }
      } else {
        total += card.creditLimit || 0;
        processedIds.add(card.id);
      }
    }

    return total;
  }

  /**
   * Calculate average card age in months across cards that have an issue date.
   * Requirement: 7.6
   * @param {Array<Object>} cards
   * @returns {Object|null} { years, months, totalMonths } or null if no cards have issue dates
   */
  calculateAverageAge(cards) {
    const cardsWithAge = cards.filter(c => c.issueDate);
    if (cardsWithAge.length === 0) return null;

    const now = new Date();
    const totalMonths = cardsWithAge.reduce((sum, card) => {
      const issue = new Date(card.issueDate);
      const months = (now.getFullYear() - issue.getFullYear()) * 12
        + (now.getMonth() - issue.getMonth());
      return sum + months;
    }, 0);

    const avgMonths = Math.round(totalMonths / cardsWithAge.length);
    return {
      years: Math.floor(avgMonths / 12),
      months: avgMonths % 12,
      totalMonths: avgMonths
    };
  }

  /**
   * Find cards expiring within the given number of months.
   * @param {Array<Object>} cards
   * @param {number} months - Look-ahead window in months (default 3)
   * @returns {Array<Object>} Cards expiring within the window (not already expired)
   */
  findExpiringCards(cards, months = 3) {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() + months + 1, 0);

    return cards.filter(card => {
      if (!card.expiry) return false;
      const [year, month] = card.expiry.split('-').map(Number);
      const expiryDate = new Date(year, month, 0); // last day of expiry month
      return expiryDate > now && expiryDate <= cutoff;
    });
  }

  /**
   * Calculate total annual fees across the given cards.
   * Requirement: 7.2
   * @param {Array<Object>} cards
   * @returns {number} Sum of annual fees
   */
  calculateTotalFees(cards) {
    return cards.reduce((sum, card) => sum + (card.annualFee || 0), 0);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StatisticsService };
}

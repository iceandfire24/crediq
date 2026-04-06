/**
 * Search Controller
 * Search, filter, and sort cards
 * Requirements: 4.2, 4.3, 4.4, 4.5
 */

class SearchController {
  /**
   * Filter cards by name, bank, or network (case-insensitive).
   * Requirement 4.2
   *
   * @param {string} query - Search string
   * @param {Array<Object>} cards - Array of card objects
   * @returns {Array<Object>} Filtered cards
   */
  searchCards(query, cards) {
    if (!query || query.trim() === '') return cards;
    const q = query.trim().toLowerCase();
    return cards.filter(card =>
      (card.name && card.name.toLowerCase().includes(q)) ||
      (card.bank && card.bank.toLowerCase().includes(q)) ||
      (card.network && card.network.toLowerCase().includes(q))
    );
  }

  /**
   * Filter cards by network (case-insensitive).
   * Requirement 4.4
   *
   * @param {string} network - Network name to filter by
   * @param {Array<Object>} cards - Array of card objects
   * @returns {Array<Object>} Filtered cards
   */
  filterByNetwork(network, cards) {
    if (!network) return cards;
    const n = network.toLowerCase();
    return cards.filter(card => card.network && card.network.toLowerCase() === n);
  }

  /**
   * Filter cards by bank (case-insensitive).
   * Requirement 4.4
   *
   * @param {string} bank - Bank name to filter by
   * @param {Array<Object>} cards - Array of card objects
   * @returns {Array<Object>} Filtered cards
   */
  filterByBank(bank, cards) {
    if (!bank) return cards;
    const b = bank.toLowerCase();
    return cards.filter(card => card.bank && card.bank.toLowerCase() === b);
  }

  /**
   * Filter cards by tag (case-insensitive).
   * Requirement 4.4
   *
   * @param {string} tag - Tag to filter by
   * @param {Array<Object>} cards - Array of card objects
   * @returns {Array<Object>} Filtered cards
   */
  filterByTag(tag, cards) {
    if (!tag) return cards;
    const t = tag.toLowerCase();
    return cards.filter(card =>
      Array.isArray(card.tags) && card.tags.some(cardTag => cardTag.toLowerCase() === t)
    );
  }

  /**
   * Sort cards by name, expiry date, or age.
   * Requirement 4.3
   *
   * @param {'name'|'expiry'|'age'} sortBy - Sort criterion
   * @param {Array<Object>} cards - Array of card objects
   * @returns {Array<Object>} Sorted copy of cards
   */
  sortCards(sortBy, cards) {
    const sorted = [...cards];

    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;

      case 'expiry':
        // YYYY-MM format — lexicographic sort works correctly
        sorted.sort((a, b) => {
          const ea = a.expiry || '';
          const eb = b.expiry || '';
          if (!ea && !eb) return 0;
          if (!ea) return 1;
          if (!eb) return -1;
          return ea.localeCompare(eb);
        });
        break;

      case 'age':
        // Older cards (earlier issueDate) first; cards without issueDate go last
        sorted.sort((a, b) => {
          const ia = a.issueDate || '';
          const ib = b.issueDate || '';
          if (!ia && !ib) return 0;
          if (!ia) return 1;
          if (!ib) return -1;
          return ia.localeCompare(ib);
        });
        break;

      default:
        break;
    }

    return sorted;
  }

  /**
   * Apply multiple filters and an optional search query simultaneously.
   * Requirement 4.4, 4.5
   *
   * @param {Array<Object>} cards - Array of card objects
   * @param {Object} filters - Filter options
   * @param {string} [filters.query]   - Search query (name/bank/network)
   * @param {string} [filters.network] - Network filter
   * @param {string} [filters.bank]    - Bank filter
   * @param {string} [filters.tag]     - Tag filter
   * @param {string} [filters.sortBy]  - Sort criterion ('name'|'expiry'|'age')
   * @returns {Array<Object>} Filtered and sorted cards
   */
  combineFilters(cards, filters = {}) {
    let result = [...cards];

    if (filters.query) {
      result = this.searchCards(filters.query, result);
    }
    if (filters.network) {
      result = this.filterByNetwork(filters.network, result);
    }
    if (filters.bank) {
      result = this.filterByBank(filters.bank, result);
    }
    if (filters.tag) {
      result = this.filterByTag(filters.tag, result);
    }
    if (filters.sortBy) {
      result = this.sortCards(filters.sortBy, result);
    }

    return result;
  }
}

// ES module export
export { SearchController };

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SearchController };
}

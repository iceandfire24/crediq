/**
 * Card Controller
 * CRUD operations for cards with validation, network/bank detection, and event emission
 * Requirements: 1.9, 1.10, 1.11, 3.1, 3.2, 3.3, 3.4, 3.5, 16.1, 16.6
 */

class CardController {
  /**
   * @param {CardStore} cardStore - Card store service instance
   * @param {ValidatorService} validator - Validator service instance
   * @param {DetectorService} detector - Detector service instance
   * @param {EventTarget} [eventBus] - Target for custom event dispatch (defaults to document when available)
   */
  constructor(cardStore, validator, detector, eventBus) {
    this.cardStore = cardStore;
    this.validator = validator;
    this.detector = detector;
    // Default to document when running in a browser context
    this.eventBus = eventBus || (typeof document !== 'undefined' ? document : null);
  }

  // ---------------------------------------------------------------------------
  // Read operations
  // ---------------------------------------------------------------------------

  /**
   * Retrieve all cards from the store.
   * Requirement 5.2
   *
   * @returns {Promise<Array<Object>>} All stored cards
   */
  async getAllCards() {
    return this.cardStore.getAllCards();
  }

  /**
   * Retrieve a single card by id.
   *
   * @param {string} id - Card UUID
   * @returns {Promise<Object|null>} Card object or null if not found
   */
  async getCardById(id) {
    return this.cardStore.getCardById(id);
  }

  // ---------------------------------------------------------------------------
  // Write operations
  // ---------------------------------------------------------------------------

  /**
   * Add a new card after validation and network/bank detection.
   * Requirements: 1.9, 1.10, 1.11
   *
   * @param {Object} cardData - Raw card form data
   * @returns {Promise<{success: boolean, card?: Object, errors?: Object}>}
   */
  async addCard(cardData) {
    // Validate form data (Req 1.1–1.8, 3.1)
    const validation = this.validator.validateForm(cardData);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Detect network and bank from card number (Req 1.10, 1.11)
    const enriched = this._enrichWithDetection(cardData);

    const card = await this.cardStore.addCard(enriched);

    // Emit custom event (Req 16.1)
    this._emit('card-added', { card });

    return { success: true, card };
  }

  /**
   * Update an existing card after validation.
   * Requirements: 3.1, 3.2, 3.3
   *
   * @param {string} id - Card UUID
   * @param {Object} cardData - Updated card form data
   * @returns {Promise<{success: boolean, card?: Object, errors?: Object}>}
   */
  async updateCard(id, cardData) {
    // Validate form data (Req 3.1)
    const validation = this.validator.validateForm(cardData);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Re-detect network and bank if card number changed (Req 1.10, 1.11)
    const enriched = this._enrichWithDetection(cardData);

    const card = await this.cardStore.updateCard(id, enriched);
    if (!card) {
      return { success: false, errors: { general: 'Card not found' } };
    }

    // Emit custom event
    this._emit('card-updated', { card });

    return { success: true, card };
  }

  /**
   * Delete a card by id.
   * Requirement 3.4, 3.5
   *
   * Note: Confirmation prompting is the responsibility of the calling view.
   * This method performs the actual deletion after confirmation has been obtained.
   *
   * @param {string} id - Card UUID
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deleteCard(id) {
    const deleted = await this.cardStore.deleteCard(id);
    if (!deleted) {
      return { success: false, error: 'Card not found' };
    }

    // Emit custom event
    this._emit('card-deleted', { id });

    return { success: true };
  }

  /**
   * Get all unique tags across all stored cards.
   * Requirements: 10.4, 10.5
   *
   * @returns {Promise<string[]>} Sorted array of unique tag strings
   */
  async getAvailableTags() {
    return this.cardStore.getAllTags();
  }

  // ---------------------------------------------------------------------------
  // Shared limit helpers
  // ---------------------------------------------------------------------------

  /**
   * Get all cards from the same bank, excluding the card being edited.
   * Used to populate the shared limit dropdown (Req 16.1, 16.6).
   *
   * @param {string} bankName - Bank name to filter by
   * @param {string} [excludeId] - Card id to exclude (the card being edited)
   * @returns {Promise<Array<Object>>} Cards from the same bank
   */
  async getSharedLimitCards(bankName, excludeId = null) {
    if (!bankName || bankName === 'Unknown') return [];

    const allCards = await this.cardStore.getAllCards();
    return allCards.filter(card => {
      if (excludeId && card.id === excludeId) return false;
      return card.bank === bankName;
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Enrich card data with detected network and bank.
   * @param {Object} cardData
   * @returns {Object} Card data with network and bank fields set
   */
  _enrichWithDetection(cardData) {
    const network = this.detector.detectNetwork(cardData.number);
    const bank = this.detector.detectBank(cardData.number);
    return { ...cardData, network, bank };
  }

  /**
   * Dispatch a custom DOM event on the event bus.
   * @param {string} eventName
   * @param {Object} detail
   */
  _emit(eventName, detail) {
    if (!this.eventBus) return;
    const event = new CustomEvent(eventName, { detail, bubbles: true });
    this.eventBus.dispatchEvent(event);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardController };
}

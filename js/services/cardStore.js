/**
 * Card Store Service
 * Local storage CRUD operations for cards with encryption support
 * Requirements: 1.9, 3.3, 3.5, 5.1, 5.2, 5.3, 15.2, 15.3
 */

const STORAGE_KEY = 'card-manager-cards';

class CardStore {
  /**
   * @param {EncryptionService} crypto - Encryption service instance
   */
  constructor(crypto) {
    this.crypto = crypto;
  }

  // ---------------------------------------------------------------------------
  // Utility
  // ---------------------------------------------------------------------------

  /**
   * Generate a UUID v4 for new cards
   * @returns {string}
   */
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Read the raw cards array from localStorage (stored values may be encrypted)
   * @returns {Array<Object>}
   */
  _readStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Persist the cards array to localStorage
   * @param {Array<Object>} cards
   */
  _writeStorage(cards) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }

  /**
   * Validate that localStorage is accessible
   * @returns {boolean}
   */
  validateStorage() {
    try {
      const testKey = '__cm_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Encryption helpers
  // ---------------------------------------------------------------------------

  /**
   * Encrypt card.number and card.cvv before storing.
   * If no session key is available (user not logged in) the fields are left as-is.
   * @param {Object} card - Plain card object
   * @returns {Promise<Object>} Card with sensitive fields encrypted
   */
  async encryptSensitiveFields(card) {
    const key = await this.crypto.getKeyFromSession();
    if (!key) {
      // No key available – store without encryption (caller should handle auth)
      return { ...card };
    }

    const encrypted = { ...card };
    if (card.number) {
      encrypted.number = await this.crypto.encrypt(card.number, key);
    }
    if (card.cvv) {
      encrypted.cvv = await this.crypto.encrypt(card.cvv, key);
    }
    return encrypted;
  }

  /**
   * Decrypt card.number and card.cvv after loading from storage.
   * If no session key is available the fields are returned as-is.
   * @param {Object} card - Card object with potentially encrypted fields
   * @returns {Promise<Object>} Card with sensitive fields decrypted
   */
  async decryptSensitiveFields(card) {
    const key = await this.crypto.getKeyFromSession();
    if (!key) {
      return { ...card };
    }

    const decrypted = { ...card };
    if (card.number) {
      try {
        decrypted.number = await this.crypto.decrypt(card.number, key);
      } catch {
        // Field may already be plaintext (e.g. stored without encryption)
        decrypted.number = card.number;
      }
    }
    if (card.cvv) {
      try {
        decrypted.cvv = await this.crypto.decrypt(card.cvv, key);
      } catch {
        decrypted.cvv = card.cvv;
      }
    }
    return decrypted;
  }

  // ---------------------------------------------------------------------------
  // CRUD operations
  // ---------------------------------------------------------------------------

  /**
   * Retrieve all cards, decrypting sensitive fields.
   * Requirement 5.2: retrieve all card data from the Card_Store on load
   * @returns {Promise<Array<Object>>}
   */
  async getAllCards() {
    const cards = this._readStorage();
    return Promise.all(cards.map(card => this.decryptSensitiveFields(card)));
  }

  /**
   * Retrieve a single card by id, decrypting sensitive fields.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  async getCardById(id) {
    const cards = this._readStorage();
    const card = cards.find(c => c.id === id);
    if (!card) return null;
    return this.decryptSensitiveFields(card);
  }

  /**
   * Add a new card, encrypting sensitive fields before persisting.
   * Requirement 1.9: store the card in the Card_Store after validation
   * Requirement 5.3: immediately persist changes
   * @param {Object} card - Card data (plain text)
   * @returns {Promise<Object>} The stored card (with id, encrypted in storage)
   */
  async addCard(card) {
    const cards = this._readStorage();

    const newCard = {
      ...card,
      id: card.id || this.generateId(),
      createdAt: card.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const toStore = await this.encryptSensitiveFields(newCard);
    cards.push(toStore);
    this._writeStorage(cards);

    // Return the card with decrypted fields for immediate use
    return { ...newCard };
  }

  /**
   * Update an existing card by id, encrypting sensitive fields before persisting.
   * Requirement 3.3: update the card in the Card_Store
   * Requirement 5.3: immediately persist changes
   * @param {string} id
   * @param {Object} updates - Updated card data (plain text)
   * @returns {Promise<Object|null>} Updated card or null if not found
   */
  async updateCard(id, updates) {
    const cards = this._readStorage();
    const index = cards.findIndex(c => c.id === id);
    if (index === -1) return null;

    const updatedCard = {
      ...cards[index],
      ...updates,
      id, // ensure id is not overwritten
      updatedAt: new Date().toISOString()
    };

    const toStore = await this.encryptSensitiveFields(updatedCard);
    cards[index] = toStore;
    this._writeStorage(cards);

    // Return with decrypted fields
    return { ...updatedCard };
  }

  /**
   * Delete a card by id.
   * Requirement 3.5: remove the card from the Card_Store
   * Requirement 5.3: immediately persist changes
   * @param {string} id
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteCard(id) {
    const cards = this._readStorage();
    const index = cards.findIndex(c => c.id === id);
    if (index === -1) return false;

    cards.splice(index, 1);
    this._writeStorage(cards);
    return true;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardStore };
}

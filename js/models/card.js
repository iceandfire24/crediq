/**
 * Card Model
 * Represents a credit or debit card with all associated metadata
 */

/**
 * Generate a UUID v4
 * @returns {string} UUID string
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

class Card {
  constructor(data = {}) {
    this.id = data.id || generateUUID();
    this.name = data.name || '';
    this.number = data.number || '';  // Encrypted in storage
    this.cvv = data.cvv || '';        // Encrypted in storage
    this.expiry = data.expiry || '';  // YYYY-MM format
    this.issueDate = data.issueDate || null;  // YYYY-MM format
    this.statementDate = data.statementDate || null;  // 1-31
    this.dueDate = data.dueDate || null;  // 1-31
    this.annualFee = data.annualFee || 0;
    this.creditLimit = data.creditLimit || 0;
    this.sharedLimitWith = data.sharedLimitWith || [];
    this.tags = data.tags || [];
    this.network = data.network || 'Unknown';
    this.bank = data.bank || 'Unknown';
    this.notificationsEnabled = data.notificationsEnabled || false;
    this.reminderPeriod = data.reminderPeriod || 3;  // days
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }
  
  /**
   * Get masked card number showing only last 4 digits
   * @returns {string} Masked card number
   */
  get maskedNumber() {
    if (!this.number) return '****';
    return '•••• ' + this.number.slice(-4);
  }
  
  /**
   * Calculate card age from issue date
   * @returns {Object|null} Object with years, months, and totalMonths, or null if no issue date
   */
  get age() {
    if (!this.issueDate) return null;
    const issue = new Date(this.issueDate);
    const now = new Date();
    const months = (now.getFullYear() - issue.getFullYear()) * 12 
                   + (now.getMonth() - issue.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return { years, months: remainingMonths, totalMonths: months };
  }
  
  /**
   * Check if card is expired
   * @returns {boolean} True if card is expired
   */
  get isExpired() {
    if (!this.expiry) return false;
    const [year, month] = this.expiry.split('-').map(Number);
    const expiryDate = new Date(year, month, 0);  // Last day of expiry month
    return expiryDate < new Date();
  }
  
  /**
   * Check if card is expiring soon (within 3 months)
   * @returns {boolean} True if card expires within 3 months
   */
  get isExpiringSoon() {
    if (!this.expiry) return false;
    const [year, month] = this.expiry.split('-').map(Number);
    const expiryDate = new Date(year, month, 0);
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return expiryDate <= threeMonthsFromNow && !this.isExpired;
  }
  
  /**
   * Validate card data
   * @returns {Array<string>} Array of error messages, empty if valid
   */
  validate() {
    const errors = [];
    if (!this.name || this.name.trim() === '') {
      errors.push('Card name is required');
    }
    if (!this.number || this.number.trim() === '') {
      errors.push('Card number is required');
    }
    if (!this.cvv || this.cvv.trim() === '') {
      errors.push('CVV is required');
    }
    if (!this.expiry || this.expiry.trim() === '') {
      errors.push('Expiry date is required');
    }
    return errors;
  }
  
  /**
   * Convert card to JSON object
   * @returns {Object} Plain object representation of card
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      number: this.number,
      cvv: this.cvv,
      expiry: this.expiry,
      issueDate: this.issueDate,
      statementDate: this.statementDate,
      dueDate: this.dueDate,
      annualFee: this.annualFee,
      creditLimit: this.creditLimit,
      sharedLimitWith: this.sharedLimitWith,
      tags: this.tags,
      network: this.network,
      bank: this.bank,
      notificationsEnabled: this.notificationsEnabled,
      reminderPeriod: this.reminderPeriod,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Card, generateUUID };
}

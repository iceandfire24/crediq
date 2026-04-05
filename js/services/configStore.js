/**
 * Config Store Service
 * Local storage operations for app configuration
 * Requirements: 11.4, 11.5, 12.3, 12.4, 17.9, 17.10
 */

const { AppConfig, DEFAULT_BANK_COLORS } =
  typeof require !== 'undefined'
    ? require('../models/config.js')
    : { AppConfig: window.AppConfig, DEFAULT_BANK_COLORS: window.DEFAULT_BANK_COLORS };

const CONFIG_KEY = 'config';

class ConfigStore {
  // ---------------------------------------------------------------------------
  // Core config
  // ---------------------------------------------------------------------------

  /**
   * Load the full config from localStorage.
   * Returns a new AppConfig with defaults if nothing is stored yet.
   * Requirements 11.5, 12.4: apply saved preferences on load
   * @returns {AppConfig}
   */
  getConfig() {
    try {
      const raw = localStorage.getItem(CONFIG_KEY);
      if (!raw) return new AppConfig();
      return new AppConfig(JSON.parse(raw));
    } catch {
      return new AppConfig();
    }
  }

  /**
   * Persist the full config to localStorage.
   * Requirements 11.4, 12.3: persist preferences in local storage
   * @param {AppConfig} config
   */
  saveConfig(config) {
    try {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(config.toJSON()));
    } catch (err) {
      // If storage is full, surface a descriptive error
      if (err && (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
          (err instanceof DOMException && err.code === 22))) {
        const quotaErr = new Error('Storage is full. Please export your data and clear some space.');
        quotaErr.name = 'QuotaExceededError';
        throw quotaErr;
      }
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Theme
  // ---------------------------------------------------------------------------

  /**
   * Get the saved theme preference.
   * Requirement 11.5: apply saved theme on load
   * @returns {string} 'light' or 'dark'
   */
  getTheme() {
    return this.getConfig().theme;
  }

  /**
   * Save the theme preference.
   * Requirement 11.4: persist theme preference in local storage
   * @param {string} theme - 'light' or 'dark'
   */
  saveTheme(theme) {
    const config = this.getConfig();
    config.theme = theme;
    this.saveConfig(config);
  }

  // ---------------------------------------------------------------------------
  // Date format
  // ---------------------------------------------------------------------------

  /**
   * Get the saved date format preference.
   * Requirement 12.4: apply saved date format on load
   * @returns {string} e.g. 'DD/MM/YYYY'
   */
  getDateFormat() {
    return this.getConfig().dateFormat;
  }

  /**
   * Save the date format preference.
   * Requirement 12.3: persist date format preference in local storage
   * @param {string} format - 'DD/MM/YYYY', 'MM/DD/YYYY', or 'YYYY-MM-DD'
   */
  saveDateFormat(format) {
    const config = this.getConfig();
    config.dateFormat = format;
    this.saveConfig(config);
  }

  // ---------------------------------------------------------------------------
  // Bank colors
  // ---------------------------------------------------------------------------

  /**
   * Get all bank color mappings (custom + defaults).
   * Requirement 17.9: allow customization of bank color theme
   * @returns {Object} { bankName: '#hexcolor', ... }
   */
  getBankColors() {
    return this.getConfig().bankColors;
  }

  /**
   * Save a custom color for a specific bank.
   * Requirement 17.10: persist customized bank color themes in local storage
   * @param {string} bank - Bank name
   * @param {string} color - Hex color string e.g. '#004C8F'
   */
  saveBankColor(bank, color) {
    const config = this.getConfig();
    config.bankColors = { ...config.bankColors, [bank]: color };
    this.saveConfig(config);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ConfigStore };
}

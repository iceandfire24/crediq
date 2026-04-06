/**
 * AppConfig Model
 * Manages application configuration including theme, date format, and bank colors
 * Requirements: 11.1, 12.1, 17.7, 17.9, 17.10
 */

// Load default bank colors from bankColors.json (Node/test env) or use inline fallback (browser)
let DEFAULT_BANK_COLORS;

if (typeof require !== 'undefined') {
  // Node.js / test environment: load from JSON file
  try {
    const path = require('path');
    const fs = require('fs');
    const jsonPath = path.resolve(__dirname, '../../data/bankColors.json');
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    DEFAULT_BANK_COLORS = raw.banks;
  } catch {
    // Fallback if file is not found
    DEFAULT_BANK_COLORS = {
      'HDFC Bank': '#004C8F',
      'ICICI Bank': '#F37021',
      'State Bank of India': '#22409A',
      'Axis Bank': '#800000',
      'Kotak Mahindra Bank': '#ED232A',
      'HSBC': '#DB0011',
      'Citibank': '#056DAE',
      'Standard Chartered': '#0072BC',
      'Yes Bank': '#00529B',
      'IndusInd Bank': '#C8102E',
      'Unknown': '#64748b'
    };
  }
} else {
  // Browser environment: inline defaults (bankColors.json is fetched async by the app if needed)
  DEFAULT_BANK_COLORS = {
    'HDFC Bank': '#004C8F',
    'ICICI Bank': '#F37021',
    'State Bank of India': '#22409A',
    'Axis Bank': '#800000',
    'Kotak Mahindra Bank': '#ED232A',
    'HSBC': '#DB0011',
    'Citibank': '#056DAE',
    'Standard Chartered': '#0072BC',
    'Yes Bank': '#00529B',
    'IndusInd Bank': '#C8102E',
    'Unknown': '#64748b'
  };
}

class AppConfig {
  /**
   * Create an AppConfig instance
   * @param {Object} data - Configuration data
   * @param {string} data.theme - Theme preference ('light' or 'dark')
   * @param {string} data.dateFormat - Date format preference ('DD/MM/YYYY', 'MM/DD/YYYY', or 'YYYY-MM-DD')
   * @param {Object} data.bankColors - Custom bank color mappings
   */
  constructor(data = {}) {
    this.theme = data.theme || 'light';
    this.dateFormat = data.dateFormat || 'DD/MM/YYYY';
    // Fall back to DEFAULT_BANK_COLORS when no customization exists in localStorage (Req 17.7)
    this.bankColors = data.bankColors || { ...DEFAULT_BANK_COLORS };
  }

  /**
   * Convert config to JSON-serializable object
   * @returns {Object} JSON representation of the config
   */
  toJSON() {
    return {
      theme: this.theme,
      dateFormat: this.dateFormat,
      bankColors: this.bankColors
    };
  }
}

// ES module export
export { AppConfig, DEFAULT_BANK_COLORS };

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AppConfig, DEFAULT_BANK_COLORS };
}

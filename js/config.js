/**
 * Application Configuration
 * Environment-specific settings and constants
 */

export const CONFIG = {
  // Application metadata
  VERSION: '1.0.0',
  APP_NAME: 'Card Manager',
  
  // Environment settings
  DEBUG: true, // Set to false in production
  
  // Storage keys
  STORAGE_KEYS: {
    CARDS: 'cards',
    CONFIG: 'config',
    ENCRYPTION_SALT: 'encryptionSalt',
    THEME: 'theme',
    DATE_FORMAT: 'dateFormat',
    BANK_COLORS: 'bankColors'
  },
  
  // Default settings
  DEFAULTS: {
    THEME: 'light',
    DATE_FORMAT: 'DD/MM/YYYY',
    REMINDER_PERIOD: 3 // days
  },
  
  // Validation constants
  VALIDATION: {
    MIN_CARD_NUMBER_LENGTH: 13,
    MAX_CARD_NUMBER_LENGTH: 19,
    CVV_LENGTH_MIN: 3,
    CVV_LENGTH_MAX: 4
  },
  
  // Security settings
  SECURITY: {
    AUTO_HIDE_DELAY: 30000, // 30 seconds
    CLIPBOARD_CLEAR_DELAY: 60000, // 60 seconds
    MAX_PASSWORD_ATTEMPTS: 5,
    LOCKOUT_DURATION: 300000 // 5 minutes
  }
};

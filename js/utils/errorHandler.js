/**
 * Centralized Error Handler Utility
 * Maps error types to user-friendly messages and logs errors safely.
 * Requirements: 6.7, 15.6, 20.3, 20.5, 20.8
 */

// Lazy-load showToast so it can be spied on in tests
function _showToast(message, type) {
  if (typeof require !== 'undefined') {
    // CJS / Node (tests)
    const { showToast } = require('./toast.js');
    showToast(message, type);
  } else {
    // Browser
    window.showToast(message, type);
  }
}

/**
 * Detect if an error is a localStorage quota exceeded error.
 * @param {Error} error
 * @returns {boolean}
 */
export function isQuotaExceededError(error) {
  if (!error) return false;
  // Standard name used by most browsers
  if (error.name === 'QuotaExceededError') return true;
  // Firefox uses NS_ERROR_DOM_QUOTA_REACHED
  if (error.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
  // Some browsers throw a DOMException with code 22
  if (error instanceof DOMException && error.code === 22) return true;
  // Fallback: check message text
  if (error.message && /quota/i.test(error.message)) return true;
  return false;
}

/**
 * Detect if an error originates from the Web Crypto API.
 * @param {Error} error
 * @returns {boolean}
 */
export function isEncryptionError(error) {
  if (!error) return false;
  // Web Crypto throws DOMException for invalid key / bad ciphertext
  if (error instanceof DOMException) return true;
  // Errors explicitly tagged by our encryption service
  if (error.name === 'EncryptionError') return true;
  // Messages set by encryption.js
  if (error.message && /(incorrect password|corrupted data|decryption|encryption)/i.test(error.message)) return true;
  return false;
}

/**
 * Map an error to a user-friendly message string.
 * @param {Error} error
 * @returns {string}
 */
export function getErrorMessage(error) {
  if (!error) return 'Something went wrong. Please try again.';

  if (isQuotaExceededError(error)) {
    return 'Storage is full. Please export your data and clear some space.';
  }

  if (isEncryptionError(error)) {
    return 'Encryption error. Please check your master password.';
  }

  if (error instanceof SyntaxError || error.name === 'SyntaxError') {
    return 'Invalid data format. The file may be corrupted.';
  }

  // Use the error's own message if it's already user-friendly (set by our services)
  if (error.message) return error.message;

  return 'Something went wrong. Please try again.';
}

/**
 * Handle an error: log it safely (no sensitive data) and show a toast.
 * @param {Error} error
 * @param {string} [context] - Optional context label for the console log
 * @param {Function} [_toast] - Optional toast function override (for testing)
 */
export function handleError(error, context = '', _toast = null) {
  // Safe logging – only log the error name and message, never stack traces with data
  const label = context ? `[${context}]` : '[Error]';
  // eslint-disable-next-line no-console
  console.error(label, error && error.name, error && error.message);

  const message = getErrorMessage(error);
  if (_toast) {
    _toast(message, 'error');
  } else {
    _showToast(message, 'error');
  }
}

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { handleError, isQuotaExceededError, isEncryptionError, getErrorMessage };
}

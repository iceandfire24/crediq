/**
 * Utility Functions for Card Manager
 * Provides UUID generation, date formatting, and number formatting utilities
 */

/**
 * Generate a UUID v4
 * @returns {string} A UUID string
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Format a date according to the specified format
 * @param {Date|string} date - The date to format
 * @param {string} format - The format string (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'DD/MM/YYYY') {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Format a month/year string (YYYY-MM) according to the specified format
 * @param {string} monthYear - The month/year string in YYYY-MM format
 * @param {string} format - The format string (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
 * @returns {string} Formatted month/year string
 */
export function formatMonthYear(monthYear, format = 'DD/MM/YYYY') {
  if (!monthYear) return '';
  
  const [year, month] = monthYear.split('-');
  
  if (!year || !month) return monthYear;
  
  switch (format) {
    case 'DD/MM/YYYY':
      return `${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}`;
    default:
      return `${month}/${year}`;
  }
}

/**
 * Parse a date string in various formats to a Date object
 * @param {string} dateString - The date string to parse
 * @param {string} format - The format of the input string
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export function parseDate(dateString, format = 'DD/MM/YYYY') {
  if (!dateString) return null;
  
  let day, month, year;
  
  switch (format) {
    case 'DD/MM/YYYY':
      [day, month, year] = dateString.split('/');
      break;
    case 'MM/DD/YYYY':
      [month, day, year] = dateString.split('/');
      break;
    case 'YYYY-MM-DD':
      [year, month, day] = dateString.split('-');
      break;
    default:
      return null;
  }
  
  if (!day || !month || !year) return null;
  
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Format a number as currency (Indian Rupees)
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency symbol (default: ₹)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = '₹') {
  if (amount === null || amount === undefined || isNaN(amount)) return `${currency}0`;
  
  // Indian number formatting with lakhs and crores
  const numStr = Math.abs(amount).toString();
  const lastThree = numStr.substring(numStr.length - 3);
  const otherNumbers = numStr.substring(0, numStr.length - 3);
  
  const formatted = otherNumbers !== '' 
    ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;
  
  return `${currency}${amount < 0 ? '-' : ''}${formatted}`;
}

/**
 * Format a number with thousand separators
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format a card number with spaces for display
 * @param {string} cardNumber - The card number to format
 * @returns {string} Formatted card number (e.g., "1234 5678 9012 3456")
 */
export function formatCardNumber(cardNumber) {
  if (!cardNumber) return '';
  
  // Remove all non-digit characters
  const cleaned = cardNumber.replace(/\D/g, '');
  
  // Add space every 4 digits
  return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
}

/**
 * Mask a card number showing only last 4 digits
 * @param {string} cardNumber - The card number to mask
 * @returns {string} Masked card number (e.g., "•••• •••• •••• 1234")
 */
export function maskCardNumber(cardNumber) {
  if (!cardNumber) return '•••• •••• •••• ••••';
  
  const cleaned = cardNumber.replace(/\D/g, '');
  const lastFour = cleaned.slice(-4);
  
  return `•••• •••• •••• ${lastFour}`;
}

/**
 * Calculate the difference between two dates in months
 * @param {Date} startDate - The start date
 * @param {Date} endDate - The end date
 * @returns {number} Number of months between dates
 */
export function monthsDifference(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  return (end.getFullYear() - start.getFullYear()) * 12 + 
         (end.getMonth() - start.getMonth());
}

/**
 * Get the last day of a month
 * @param {number} year - The year
 * @param {number} month - The month (1-12)
 * @returns {number} Last day of the month
 */
export function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Check if a date is in the future
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if date is in the future
 */
export function isFutureDate(date) {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  return d > now;
}

/**
 * Check if a date is in the past
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if date is in the past
 */
export function isPastDate(date) {
  if (!date) return false;
  
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  return d < now;
}

/**
 * Get month name from month number
 * @param {number} month - Month number (1-12)
 * @param {boolean} short - Return short name (Jan, Feb, etc.)
 * @returns {string} Month name
 */
export function getMonthName(month, short = false) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const shortMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const index = month - 1;
  
  if (index < 0 || index > 11) return '';
  
  return short ? shortMonths[index] : months[index];
}

/**
 * Debounce a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Deep clone an object
 * @param {Object} obj - The object to clone
 * @returns {Object} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) return new Date(obj.getTime());
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeHTML(str) {
  if (!str) return '';
  
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

/**
 * Truncate text to a specified length
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength, suffix = '...') {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength - suffix.length) + suffix;
}

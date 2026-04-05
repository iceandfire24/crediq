/**
 * Validator Service
 * Validates card data: Luhn algorithm, CVV, expiry/issue dates, required fields
 * Requirements: 1.5, 1.6, 1.7, 1.8, 3.1
 */

class ValidatorService {
  /**
   * Luhn algorithm check for card number validity
   * @param {string} number - Card number digits only
   * @returns {boolean} True if passes Luhn check
   */
  luhnCheck(number) {
    const digits = String(number).replace(/\D/g, '');
    if (digits.length === 0) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Validate card number: 13-19 digits and passes Luhn check
   * @param {string} number - Card number (may contain spaces/dashes)
   * @returns {{ valid: boolean, error: string|null }}
   */
  validateCardNumber(number) {
    const digits = String(number || '').replace(/\D/g, '');

    if (digits.length === 0) {
      return { valid: false, error: 'Card number is required' };
    }
    if (digits.length < 13 || digits.length > 19) {
      return { valid: false, error: 'Card number must be 13-19 digits' };
    }
    if (!this.luhnCheck(digits)) {
      return { valid: false, error: 'Card number is invalid' };
    }

    return { valid: true, error: null };
  }

  /**
   * Validate CVV: 3 or 4 digits
   * @param {string} cvv
   * @returns {{ valid: boolean, error: string|null }}
   */
  validateCVV(cvv) {
    const value = String(cvv || '').trim();

    if (value.length === 0) {
      return { valid: false, error: 'CVV is required' };
    }
    if (!/^\d{3,4}$/.test(value)) {
      return { valid: false, error: 'CVV must be 3 or 4 digits' };
    }

    return { valid: true, error: null };
  }

  /**
   * Validate expiry date: MM/YYYY format, must be in the future
   * Also accepts YYYY-MM (internal storage format)
   * @param {string} expiry
   * @returns {{ valid: boolean, error: string|null }}
   */
  validateExpiryDate(expiry) {
    const value = String(expiry || '').trim();

    if (value.length === 0) {
      return { valid: false, error: 'Expiry date is required' };
    }

    let month, year;

    // Accept MM/YYYY or YYYY-MM
    const slashMatch = value.match(/^(\d{1,2})\/(\d{4})$/);
    const dashMatch = value.match(/^(\d{4})-(\d{2})$/);

    if (slashMatch) {
      month = parseInt(slashMatch[1], 10);
      year = parseInt(slashMatch[2], 10);
    } else if (dashMatch) {
      year = parseInt(dashMatch[1], 10);
      month = parseInt(dashMatch[2], 10);
    } else {
      return { valid: false, error: 'Expiry date must be in MM/YYYY format' };
    }

    if (month < 1 || month > 12) {
      return { valid: false, error: 'Expiry date has an invalid month' };
    }

    // Card is valid through the last day of the expiry month
    const now = new Date();
    const expiryDate = new Date(year, month, 0); // last day of expiry month

    if (expiryDate < now) {
      return { valid: false, error: 'Expiry date must be in the future' };
    }

    return { valid: true, error: null };
  }

  /**
   * Validate issue date: MM/YYYY format, must not be in the future
   * Also accepts YYYY-MM (internal storage format)
   * @param {string} issueDate
   * @returns {{ valid: boolean, error: string|null }}
   */
  validateIssueDate(issueDate) {
    const value = String(issueDate || '').trim();

    if (value.length === 0) {
      return { valid: true, error: null }; // issue date is optional
    }

    let month, year;

    const slashMatch = value.match(/^(\d{1,2})\/(\d{4})$/);
    const dashMatch = value.match(/^(\d{4})-(\d{2})$/);

    if (slashMatch) {
      month = parseInt(slashMatch[1], 10);
      year = parseInt(slashMatch[2], 10);
    } else if (dashMatch) {
      year = parseInt(dashMatch[1], 10);
      month = parseInt(dashMatch[2], 10);
    } else {
      return { valid: false, error: 'Issue date must be in MM/YYYY format' };
    }

    if (month < 1 || month > 12) {
      return { valid: false, error: 'Issue date has an invalid month' };
    }

    // Issue date must not be in the future
    const now = new Date();
    const issueDateTime = new Date(year, month - 1, 1); // first day of issue month

    if (issueDateTime > now) {
      return { valid: false, error: 'Issue date cannot be in the future' };
    }

    return { valid: true, error: null };
  }

  /**
   * Validate required fields are present and non-empty
   * @param {Object} card - Card data object
   * @returns {{ valid: boolean, errors: string[] }}
   */
  validateRequiredFields(card) {
    const errors = [];
    const data = card || {};

    if (!data.name || String(data.name).trim() === '') {
      errors.push('Card name is required');
    }
    if (!data.number || String(data.number).trim() === '') {
      errors.push('Card number is required');
    }
    if (!data.cvv || String(data.cvv).trim() === '') {
      errors.push('CVV is required');
    }
    if (!data.expiry || String(data.expiry).trim() === '') {
      errors.push('Expiry date is required');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Run all validations on form data and return combined result
   * @param {Object} formData - Card form data
   * @returns {{ valid: boolean, errors: Object }}
   */
  validateForm(formData) {
    const data = formData || {};
    const errors = {};

    const requiredResult = this.validateRequiredFields(data);
    if (!requiredResult.valid) {
      requiredResult.errors.forEach(msg => {
        if (msg.includes('name')) errors.name = msg;
        else if (msg.includes('number')) errors.number = msg;
        else if (msg.includes('CVV')) errors.cvv = msg;
        else if (msg.includes('Expiry')) errors.expiry = msg;
      });
    }

    // Validate card number format/Luhn only if provided
    if (data.number && String(data.number).trim() !== '') {
      const numResult = this.validateCardNumber(data.number);
      if (!numResult.valid) errors.number = numResult.error;
    }

    // Validate CVV format only if provided
    if (data.cvv && String(data.cvv).trim() !== '') {
      const cvvResult = this.validateCVV(data.cvv);
      if (!cvvResult.valid) errors.cvv = cvvResult.error;
    }

    // Validate expiry only if provided
    if (data.expiry && String(data.expiry).trim() !== '') {
      const expiryResult = this.validateExpiryDate(data.expiry);
      if (!expiryResult.valid) errors.expiry = expiryResult.error;
    }

    // Validate issue date (optional field)
    if (data.issueDate && String(data.issueDate).trim() !== '') {
      const issueResult = this.validateIssueDate(data.issueDate);
      if (!issueResult.valid) errors.issueDate = issueResult.error;
    }

    // Validate statement date (1-31) if provided
    if (data.statementDate != null && data.statementDate !== '') {
      const day = Number(data.statementDate);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        errors.statementDate = 'Statement date must be between 1 and 31';
      }
    }

    // Validate due date (1-31) if provided
    if (data.dueDate != null && data.dueDate !== '') {
      const day = Number(data.dueDate);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        errors.dueDate = 'Due date must be between 1 and 31';
      }
    }

    // Validate credit limit if provided
    if (data.creditLimit != null && data.creditLimit !== '') {
      const limit = Number(data.creditLimit);
      if (isNaN(limit) || limit < 0) {
        errors.creditLimit = 'Credit limit must be a positive number';
      }
    }

    // Validate annual fee if provided
    if (data.annualFee != null && data.annualFee !== '') {
      const fee = Number(data.annualFee);
      if (isNaN(fee) || fee < 0) {
        errors.annualFee = 'Annual fee must be a positive number';
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ValidatorService };
}

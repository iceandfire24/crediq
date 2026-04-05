/**
 * Property-based tests for ValidatorService
 * Validates: Requirements 1.1-1.8, 1.12, 3.1
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ValidatorService } = require('../../js/services/validator.js');

const validator = new ValidatorService();

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Generate a past MM/YYYY string (at least 1 month ago) */
const pastMonthYear = fc.tuple(
  fc.integer({ min: 2000, max: new Date().getFullYear() }),
  fc.integer({ min: 1, max: 12 })
).filter(([year, month]) => {
  const now = new Date();
  const lastDayOfMonth = new Date(year, month, 0);
  return lastDayOfMonth < now;
}).map(([year, month]) => `${String(month).padStart(2, '0')}/${year}`);

/** Generate a future MM/YYYY string (at least 1 month ahead) */
const futureMonthYear = fc.tuple(
  fc.integer({ min: new Date().getFullYear(), max: new Date().getFullYear() + 20 }),
  fc.integer({ min: 1, max: 12 })
).filter(([year, month]) => {
  const now = new Date();
  // The last day of the month must be in the future
  const lastDayOfMonth = new Date(year, month, 0);
  return lastDayOfMonth >= now;
}).map(([year, month]) => `${String(month).padStart(2, '0')}/${year}`);

/** Generate a valid Luhn number with length 13-19 */
function buildLuhnNumber(digits) {
  // digits is an array of 12-18 digits; we compute the check digit
  let sum = 0;
  let shouldDouble = true; // the check digit position is rightmost, so we start doubling from position 1 from right
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return [...digits, checkDigit].join('');
}

/** Arbitrary for a valid Luhn card number (13-19 digits) */
const validLuhnNumber = fc.integer({ min: 12, max: 18 }).chain(len =>
  fc.array(fc.integer({ min: 0, max: 9 }), { minLength: len, maxLength: len })
    .filter(digits => digits[0] !== 0) // no leading zero
    .map(digits => buildLuhnNumber(digits))
);

/** Arbitrary for a string that fails the Luhn check (13-19 digits) */
const invalidLuhnNumber = fc.integer({ min: 13, max: 19 }).chain(len =>
  fc.stringMatching(new RegExp(`^[1-9]\\d{${len - 1}}$`))
).filter(num => !validator.luhnCheck(num));

/** Valid CVV: exactly 3 or 4 digits */
const validCVV = fc.oneof(
  fc.stringMatching(/^\d{3}$/),
  fc.stringMatching(/^\d{4}$/)
);

/** Invalid CVV: not exactly 3-4 digits */
const invalidCVV = fc.oneof(
  fc.stringMatching(/^\d{1,2}$/),           // too short
  fc.stringMatching(/^\d{5,10}$/),          // too long
  fc.stringMatching(/^[a-zA-Z]{3,4}$/),     // letters
  fc.stringMatching(/^\d{2}[a-zA-Z]\d?$/)  // mixed
);

/** A valid complete card for validateForm */
const validCardData = fc.record({
  name: fc.stringMatching(/^[^\s].*[^\s]$|^[^\s]$/).filter(s => s.trim().length > 0),
  number: validLuhnNumber,
  cvv: validCVV,
  expiry: futureMonthYear,
});

// ─── Property 1: Required Field Validation ───────────────────────────────────
// Validates: Requirements 1.1, 1.2, 1.3, 1.4

describe('Property 1: Required Field Validation', () => {
  it('validateForm() returns errors when name is missing', () => {
    fc.assert(
      fc.property(validCardData, (card) => {
        const data = { ...card, name: '' };
        const result = validator.validateForm(data);
        expect(result.valid).toBe(false);
        expect(result.errors.name).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('validateForm() returns errors when number is missing', () => {
    fc.assert(
      fc.property(validCardData, (card) => {
        const data = { ...card, number: '' };
        const result = validator.validateForm(data);
        expect(result.valid).toBe(false);
        expect(result.errors.number).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('validateForm() returns errors when cvv is missing', () => {
    fc.assert(
      fc.property(validCardData, (card) => {
        const data = { ...card, cvv: '' };
        const result = validator.validateForm(data);
        expect(result.valid).toBe(false);
        expect(result.errors.cvv).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('validateForm() returns errors when expiry is missing', () => {
    fc.assert(
      fc.property(validCardData, (card) => {
        const data = { ...card, expiry: '' };
        const result = validator.validateForm(data);
        expect(result.valid).toBe(false);
        expect(result.errors.expiry).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  it('validateRequiredFields() reports all missing required fields', () => {
    fc.assert(
      fc.property(
        fc.subarray(['name', 'number', 'cvv', 'expiry'], { minLength: 1 }),
        validCardData,
        (missingFields, card) => {
          const data = { ...card };
          missingFields.forEach(f => { data[f] = ''; });
          const result = validator.validateRequiredFields(data);
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThanOrEqual(missingFields.length);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 2: Luhn Algorithm Validation ───────────────────────────────────
// Validates: Requirement 1.5

describe('Property 2: Luhn Algorithm Validation', () => {
  it('validateCardNumber() returns valid for any valid Luhn number (13-19 digits)', () => {
    fc.assert(
      fc.property(validLuhnNumber, (number) => {
        const result = validator.validateCardNumber(number);
        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  it('validateCardNumber() returns invalid for any number that fails Luhn check', () => {
    fc.assert(
      fc.property(invalidLuhnNumber, (number) => {
        const result = validator.validateCardNumber(number);
        expect(result.valid).toBe(false);
        expect(result.error).not.toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  it('luhnCheck() returns false for empty string', () => {
    expect(validator.luhnCheck('')).toBe(false);
  });
});

// ─── Property 3: Future Expiry Date Validation ───────────────────────────────
// Validates: Requirement 1.6

describe('Property 3: Future Expiry Date Validation', () => {
  it('validateExpiryDate() returns invalid for any past date', () => {
    fc.assert(
      fc.property(pastMonthYear, (expiry) => {
        const result = validator.validateExpiryDate(expiry);
        expect(result.valid).toBe(false);
        expect(result.error).not.toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  it('validateExpiryDate() returns valid for any future date', () => {
    fc.assert(
      fc.property(futureMonthYear, (expiry) => {
        const result = validator.validateExpiryDate(expiry);
        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      }),
      { numRuns: 200 }
    );
  });
});

// ─── Property 4: CVV Format Validation ───────────────────────────────────────
// Validates: Requirement 1.7

describe('Property 4: CVV Format Validation', () => {
  it('validateCVV() returns valid for any exactly 3-digit string', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\d{3}$/), (cvv) => {
        const result = validator.validateCVV(cvv);
        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('validateCVV() returns valid for any exactly 4-digit string', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^\d{4}$/), (cvv) => {
        const result = validator.validateCVV(cvv);
        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  it('validateCVV() returns invalid for strings that are not exactly 3 or 4 digits', () => {
    fc.assert(
      fc.property(invalidCVV, (cvv) => {
        const result = validator.validateCVV(cvv);
        expect(result.valid).toBe(false);
        expect(result.error).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 5: Past Issue Date Validation ──────────────────────────────────
// Validates: Requirement 1.8

describe('Property 5: Past Issue Date Validation', () => {
  it('validateIssueDate() returns invalid for any future date', () => {
    // Use a future date that is clearly in the future (next year or later)
    const clearlyFutureMonthYear = fc.tuple(
      fc.integer({ min: new Date().getFullYear() + 1, max: new Date().getFullYear() + 20 }),
      fc.integer({ min: 1, max: 12 })
    ).map(([year, month]) => `${String(month).padStart(2, '0')}/${year}`);

    fc.assert(
      fc.property(clearlyFutureMonthYear, (issueDate) => {
        const result = validator.validateIssueDate(issueDate);
        expect(result.valid).toBe(false);
        expect(result.error).not.toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  it('validateIssueDate() returns valid for any past date', () => {
    fc.assert(
      fc.property(pastMonthYear, (issueDate) => {
        const result = validator.validateIssueDate(issueDate);
        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
      }),
      { numRuns: 200 }
    );
  });

  it('validateIssueDate() returns valid when issueDate is empty (optional field)', () => {
    const result = validator.validateIssueDate('');
    expect(result.valid).toBe(true);
  });
});

// ─── Property 9: Optional Fields Acceptance ──────────────────────────────────
// Validates: Requirement 1.12

describe('Property 9: Optional Fields Acceptance', () => {
  it('validateForm() passes with only required fields (no optional fields)', () => {
    fc.assert(
      fc.property(validCardData, (card) => {
        const result = validator.validateForm(card);
        expect(result.valid).toBe(true);
        expect(Object.keys(result.errors)).toHaveLength(0);
      }),
      { numRuns: 200 }
    );
  });

  it('validateForm() still passes when valid optional fields are added', () => {
    fc.assert(
      fc.property(
        validCardData,
        pastMonthYear,
        fc.integer({ min: 1, max: 31 }),
        fc.integer({ min: 1, max: 31 }),
        fc.nat({ max: 100000 }),
        fc.nat({ max: 10000000 }),
        (card, issueDate, statementDate, dueDate, annualFee, creditLimit) => {
          const data = {
            ...card,
            issueDate,
            statementDate,
            dueDate,
            annualFee,
            creditLimit,
          };
          const result = validator.validateForm(data);
          expect(result.valid).toBe(true);
          expect(Object.keys(result.errors)).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 14: Edit Validation Consistency ────────────────────────────────
// Validates: Requirement 3.1

describe('Property 14: Edit Validation Consistency', () => {
  it('validateForm() produces the same result for the same data regardless of call order', () => {
    fc.assert(
      fc.property(validCardData, (card) => {
        const result1 = validator.validateForm(card);
        const result2 = validator.validateForm(card);
        expect(result1.valid).toBe(result2.valid);
        expect(result1.errors).toEqual(result2.errors);
      }),
      { numRuns: 200 }
    );
  });

  it('validateForm() produces the same result for invalid data regardless of call order', () => {
    fc.assert(
      fc.property(
        validCardData,
        fc.subarray(['name', 'number', 'cvv', 'expiry'], { minLength: 1 }),
        (card, missingFields) => {
          const data = { ...card };
          missingFields.forEach(f => { data[f] = ''; });
          const result1 = validator.validateForm(data);
          const result2 = validator.validateForm(data);
          expect(result1.valid).toBe(result2.valid);
          expect(result1.errors).toEqual(result2.errors);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('a card that passes validation always passes regardless of how many times it is validated', () => {
    fc.assert(
      fc.property(validCardData, fc.integer({ min: 2, max: 5 }), (card, times) => {
        const results = Array.from({ length: times }, () => validator.validateForm(card));
        const allValid = results.every(r => r.valid === true);
        expect(allValid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

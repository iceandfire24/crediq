/**
 * Tests for DetectorService
 * Validates: Requirements 1.10, 1.11, 17.1, 17.2, 17.3, 17.4, 17.7, 17.11
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { DetectorService, NETWORK_PATTERNS, BANK_BINS, DEFAULT_BANK_COLORS } = require('../../js/services/detector.js');

const detector = new DetectorService();

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('detectNetwork', () => {
  it('detects Visa for numbers starting with 4', () => {
    expect(detector.detectNetwork('4111111111111111')).toBe('Visa');
    expect(detector.detectNetwork('4000000000000002')).toBe('Visa');
  });

  it('detects Mastercard for 51-55 prefix', () => {
    expect(detector.detectNetwork('5100000000000000')).toBe('Mastercard');
    expect(detector.detectNetwork('5500000000000000')).toBe('Mastercard');
  });

  it('detects Mastercard for 2221-2720 prefix', () => {
    expect(detector.detectNetwork('2221000000000000')).toBe('Mastercard');
    expect(detector.detectNetwork('2720000000000000')).toBe('Mastercard');
  });

  it('detects American Express for 34/37 prefix', () => {
    expect(detector.detectNetwork('340000000000000')).toBe('American Express');
    expect(detector.detectNetwork('370000000000000')).toBe('American Express');
  });

  it('detects Diners Club for 36/38/300-305 prefix', () => {
    expect(detector.detectNetwork('36000000000000')).toBe('Diners Club');
    expect(detector.detectNetwork('38000000000000')).toBe('Diners Club');
    expect(detector.detectNetwork('30000000000000')).toBe('Diners Club');
  });

  it('detects Discover for 6011/65/644-649/622 prefix', () => {
    expect(detector.detectNetwork('6011000000000000')).toBe('Discover');
    expect(detector.detectNetwork('6500000000000000')).toBe('Discover');
    expect(detector.detectNetwork('6440000000000000')).toBe('Discover');
  });

  it('returns Unknown for unrecognized numbers', () => {
    expect(detector.detectNetwork('9999999999999999')).toBe('Unknown');
    expect(detector.detectNetwork('')).toBe('Unknown');
    expect(detector.detectNetwork(null)).toBe('Unknown');
  });

  it('strips spaces and dashes before detecting', () => {
    expect(detector.detectNetwork('4111 1111 1111 1111')).toBe('Visa');
    expect(detector.detectNetwork('4111-1111-1111-1111')).toBe('Visa');
  });
});

describe('detectBank', () => {
  it('returns Unknown for short card numbers', () => {
    expect(detector.detectBank('12345')).toBe('Unknown');
    expect(detector.detectBank('')).toBe('Unknown');
    expect(detector.detectBank(null)).toBe('Unknown');
  });

  it('returns Unknown for unrecognized BINs', () => {
    expect(detector.detectBank('999999000000')).toBe('Unknown');
  });

  it('detects HDFC Bank for known BINs', () => {
    expect(detector.detectBank('4006660000000000')).toBe('HDFC Bank');
    expect(detector.detectBank('607000000000')).toBe('HDFC Bank');
  });

  it('detects ICICI Bank for known BINs', () => {
    expect(detector.detectBank('4004280000000000')).toBe('ICICI Bank');
  });

  it('detects State Bank of India for known BINs', () => {
    expect(detector.detectBank('4001520000000000')).toBe('State Bank of India');
  });

  it('strips spaces before detecting', () => {
    expect(detector.detectBank('400666 0000 0000 00')).toBe('HDFC Bank');
  });
});

describe('getNetworkLogo', () => {
  it('returns correct path for known networks', () => {
    expect(detector.getNetworkLogo('Visa')).toBe('assets/logos/networks/visa.png');
    expect(detector.getNetworkLogo('Mastercard')).toBe('assets/logos/networks/mastercard.png');
    expect(detector.getNetworkLogo('American Express')).toBe('assets/logos/networks/amex.png');
    expect(detector.getNetworkLogo('RuPay')).toBe('assets/logos/networks/rupay.png');
    expect(detector.getNetworkLogo('Diners Club')).toBe('assets/logos/networks/diners.png');
    expect(detector.getNetworkLogo('Discover')).toBe('assets/logos/networks/discover.png');
  });

  it('returns placeholder for unknown network (Req 17.11)', () => {
    expect(detector.getNetworkLogo('Unknown')).toBe('assets/icons/placeholder.png');
    expect(detector.getNetworkLogo(null)).toBe('assets/icons/placeholder.png');
    expect(detector.getNetworkLogo('')).toBe('assets/icons/placeholder.png');
  });
});

describe('getBankLogo', () => {
  it('returns correct path for known banks', () => {
    expect(detector.getBankLogo('HDFC Bank')).toBe('assets/logos/banks/hdfc.png');
    expect(detector.getBankLogo('ICICI Bank')).toBe('assets/logos/banks/icici.png');
    expect(detector.getBankLogo('State Bank of India')).toBe('assets/logos/banks/sbi.png');
    expect(detector.getBankLogo('Axis Bank')).toBe('assets/logos/banks/axis.png');
    expect(detector.getBankLogo('Kotak Mahindra Bank')).toBe('assets/logos/banks/kotak.png');
    expect(detector.getBankLogo('HSBC')).toBe('assets/logos/banks/hsbc.png');
    expect(detector.getBankLogo('Citibank')).toBe('assets/logos/banks/citibank.png');
    expect(detector.getBankLogo('Standard Chartered')).toBe('assets/logos/banks/sc.png');
    expect(detector.getBankLogo('Yes Bank')).toBe('assets/logos/banks/yes.png');
    expect(detector.getBankLogo('IndusInd Bank')).toBe('assets/logos/banks/indusind.png');
  });

  it('returns placeholder for unknown bank (Req 17.11)', () => {
    expect(detector.getBankLogo('Unknown')).toBe('assets/icons/placeholder.png');
    expect(detector.getBankLogo(null)).toBe('assets/icons/placeholder.png');
    expect(detector.getBankLogo('')).toBe('assets/icons/placeholder.png');
  });
});

describe('getBankColor', () => {
  it('returns correct color for known banks (Req 17.7)', () => {
    expect(detector.getBankColor('HDFC Bank')).toBe('#004C8F');
    expect(detector.getBankColor('ICICI Bank')).toBe('#F37021');
    expect(detector.getBankColor('State Bank of India')).toBe('#22409A');
    expect(detector.getBankColor('Axis Bank')).toBe('#800000');
    expect(detector.getBankColor('Kotak Mahindra Bank')).toBe('#ED232A');
    expect(detector.getBankColor('HSBC')).toBe('#DB0011');
    expect(detector.getBankColor('Citibank')).toBe('#056DAE');
    expect(detector.getBankColor('Standard Chartered')).toBe('#0072BC');
    expect(detector.getBankColor('Yes Bank')).toBe('#00529B');
    expect(detector.getBankColor('IndusInd Bank')).toBe('#C8102E');
  });

  it('returns default color for unknown bank', () => {
    expect(detector.getBankColor('Unknown')).toBe('#64748b');
    expect(detector.getBankColor('Some Random Bank')).toBe('#64748b');
    expect(detector.getBankColor(null)).toBe('#64748b');
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

/**
 * **Validates: Requirements 1.10, 17.3**
 * detectNetwork always returns a known network name or 'Unknown'
 */
describe('PBT: detectNetwork always returns a valid network or Unknown', () => {
  const KNOWN_NETWORKS = ['Visa', 'Mastercard', 'American Express', 'RuPay', 'Diners Club', 'Discover', 'Unknown'];

  it('returns a known network for any string input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = detector.detectNetwork(input);
        expect(KNOWN_NETWORKS).toContain(result);
      })
    );
  });
});

/**
 * **Validates: Requirements 1.11, 17.4**
 * detectBank always returns a known bank name or 'Unknown'
 */
describe('PBT: detectBank always returns a valid bank or Unknown', () => {
  const KNOWN_BANKS = [
    'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank',
    'Kotak Mahindra Bank', 'HSBC', 'Citibank', 'Standard Chartered',
    'Yes Bank', 'IndusInd Bank', 'Unknown'
  ];

  it('returns a known bank for any string input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = detector.detectBank(input);
        expect(KNOWN_BANKS).toContain(result);
      })
    );
  });
});

/**
 * **Validates: Requirements 17.1, 17.11**
 * getNetworkLogo always returns a string path
 */
describe('PBT: getNetworkLogo always returns a string path', () => {
  it('returns a non-empty string for any input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = detector.getNetworkLogo(input);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result.endsWith('.png')).toBe(true);
      })
    );
  });
});

/**
 * **Validates: Requirements 17.2, 17.11**
 * getBankLogo always returns a string path
 */
describe('PBT: getBankLogo always returns a string path', () => {
  it('returns a non-empty string for any input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = detector.getBankLogo(input);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
        expect(result.endsWith('.png')).toBe(true);
      })
    );
  });
});

/**
 * **Validates: Requirements 17.7**
 * getBankColor always returns a valid hex color string
 */
describe('PBT: getBankColor always returns a valid hex color', () => {
  it('returns a hex color string for any input', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = detector.getBankColor(input);
        expect(typeof result).toBe('string');
        expect(/^#[0-9A-Fa-f]{6}$/.test(result)).toBe(true);
      })
    );
  });
});

/**
 * **Validates: Requirements 1.10**
 * Property 7: Network Detection Accuracy
 * For any card number starting with a known network prefix, detectNetwork() returns the correct network.
 */
describe('PBT Property 7: Network Detection Accuracy', () => {
  const networkPrefixes = [
    { network: 'Visa', prefixes: ['4'] },
    { network: 'Mastercard', prefixes: ['51', '52', '53', '54', '55', '22', '23', '24', '25', '26', '27'] },
    { network: 'American Express', prefixes: ['34', '37'] },
    { network: 'Diners Club', prefixes: ['36', '38', '300', '301', '302', '303', '304', '305'] },
    { network: 'Discover', prefixes: ['6011', '65', '644', '645', '646', '647', '648', '649', '622'] },
  ];

  for (const { network, prefixes } of networkPrefixes) {
    it(`detects ${network} for any card number starting with its known prefixes`, () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...prefixes),
          fc.stringOf(fc.char().filter(c => c >= '0' && c <= '9'), { minLength: 6, maxLength: 10 }),
          (prefix, suffix) => {
            const cardNumber = prefix + suffix;
            const result = detector.detectNetwork(cardNumber);
            expect(result).toBe(network);
          }
        )
      );
    });
  }
});

/**
 * **Validates: Requirements 1.11**
 * Property 8: Bank Detection Accuracy
 * For any card number starting with a known bank BIN, detectBank() returns the correct bank.
 */
describe('PBT Property 8: Bank Detection Accuracy', () => {
  // Sample a representative BIN from each bank to keep the test focused
  const bankBinSamples = {
    'HDFC Bank': ['400666', '607000'],
    'ICICI Bank': ['400428', '607106'],
    'State Bank of India': ['400152', '607094'],
    'Axis Bank': ['400062', '607083'],
    'Kotak Mahindra Bank': ['400440', '607110'],
    'HSBC': ['400115', '524060'],
    'Citibank': ['400516', '524064'],
    'Standard Chartered': ['400520', '524068'],
    'Yes Bank': ['400524', '607114'],
    'IndusInd Bank': ['400528', '607118'],
  };

  for (const [bank, bins] of Object.entries(bankBinSamples)) {
    it(`detects ${bank} for card numbers starting with its known BINs`, () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...bins),
          fc.stringOf(fc.char().filter(c => c >= '0' && c <= '9'), { minLength: 6, maxLength: 10 }),
          (bin, suffix) => {
            const cardNumber = bin + suffix;
            const result = detector.detectBank(cardNumber);
            expect(result).toBe(bank);
          }
        )
      );
    });
  }
});

/**
 * **Validates: Requirements 17.11**
 * Property 53: Placeholder Logo Fallback
 * For any network or bank name not in the known set, logo functions return the placeholder path.
 */
describe('PBT Property 53: Placeholder Logo Fallback', () => {
  const KNOWN_NETWORKS = new Set(['Visa', 'Mastercard', 'American Express', 'RuPay', 'Diners Club', 'Discover']);
  const KNOWN_BANKS = new Set([
    'HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank',
    'Kotak Mahindra Bank', 'HSBC', 'Citibank', 'Standard Chartered',
    'Yes Bank', 'IndusInd Bank'
  ]);
  const PLACEHOLDER = 'assets/icons/placeholder.png';

  it('getNetworkLogo returns placeholder for any unrecognized network name', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !KNOWN_NETWORKS.has(s)),
        (unknownNetwork) => {
          const result = detector.getNetworkLogo(unknownNetwork);
          expect(result).toBe(PLACEHOLDER);
        }
      )
    );
  });

  it('getBankLogo returns placeholder for any unrecognized bank name', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !KNOWN_BANKS.has(s)),
        (unknownBank) => {
          const result = detector.getBankLogo(unknownBank);
          expect(result).toBe(PLACEHOLDER);
        }
      )
    );
  });
});

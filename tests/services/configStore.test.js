/**
 * Tests for ConfigStore service
 * Validates: Requirements 11.4, 11.5, 12.3, 12.4, 17.9, 17.10
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ConfigStore } = require('../../js/services/configStore.js');
const { DEFAULT_BANK_COLORS } = require('../../js/models/config.js');

// ─── localStorage mock ────────────────────────────────────────────────────────

function createLocalStorageMock() {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] ?? null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    _reset: () => { store = {}; },
  };
}

const localStorageMock = createLocalStorageMock();
vi.stubGlobal('localStorage', localStorageMock);

function makeStore() {
  localStorageMock._reset();
  return new ConfigStore();
}

// ─── getConfig / saveConfig ───────────────────────────────────────────────────

describe('getConfig / saveConfig', () => {
  it('returns defaults when nothing is stored', () => {
    const store = makeStore();
    const config = store.getConfig();
    expect(config.theme).toBe('light');
    expect(config.dateFormat).toBe('DD/MM/YYYY');
    expect(config.bankColors).toEqual(DEFAULT_BANK_COLORS);
  });

  it('round-trips a saved config', () => {
    const store = makeStore();
    const config = store.getConfig();
    config.theme = 'dark';
    config.dateFormat = 'MM/DD/YYYY';
    store.saveConfig(config);

    const loaded = store.getConfig();
    expect(loaded.theme).toBe('dark');
    expect(loaded.dateFormat).toBe('MM/DD/YYYY');
  });

  it('returns defaults when localStorage contains invalid JSON', () => {
    const store = makeStore();
    localStorageMock.getItem.mockReturnValueOnce('not-json');
    const config = store.getConfig();
    expect(config.theme).toBe('light');
  });
});

// ─── Theme ────────────────────────────────────────────────────────────────────

describe('getTheme / saveTheme', () => {
  it('returns default theme "light" when nothing is stored (Req 11.5)', () => {
    const store = makeStore();
    expect(store.getTheme()).toBe('light');
  });

  it('persists and retrieves "dark" theme (Req 11.4)', () => {
    const store = makeStore();
    store.saveTheme('dark');
    expect(store.getTheme()).toBe('dark');
  });

  it('persists and retrieves "light" theme (Req 11.4)', () => {
    const store = makeStore();
    store.saveTheme('dark');
    store.saveTheme('light');
    expect(store.getTheme()).toBe('light');
  });

  it('saving theme does not affect dateFormat (Req 11.4)', () => {
    const store = makeStore();
    store.saveDateFormat('YYYY-MM-DD');
    store.saveTheme('dark');
    expect(store.getDateFormat()).toBe('YYYY-MM-DD');
  });
});

// ─── Date format ──────────────────────────────────────────────────────────────

describe('getDateFormat / saveDateFormat', () => {
  it('returns default "DD/MM/YYYY" when nothing is stored (Req 12.4)', () => {
    const store = makeStore();
    expect(store.getDateFormat()).toBe('DD/MM/YYYY');
  });

  it('persists and retrieves "MM/DD/YYYY" (Req 12.3)', () => {
    const store = makeStore();
    store.saveDateFormat('MM/DD/YYYY');
    expect(store.getDateFormat()).toBe('MM/DD/YYYY');
  });

  it('persists and retrieves "YYYY-MM-DD" (Req 12.3)', () => {
    const store = makeStore();
    store.saveDateFormat('YYYY-MM-DD');
    expect(store.getDateFormat()).toBe('YYYY-MM-DD');
  });

  it('saving dateFormat does not affect theme (Req 12.3)', () => {
    const store = makeStore();
    store.saveTheme('dark');
    store.saveDateFormat('YYYY-MM-DD');
    expect(store.getTheme()).toBe('dark');
  });
});

// ─── Bank colors ──────────────────────────────────────────────────────────────

describe('getBankColors / saveBankColor', () => {
  it('returns default bank colors when nothing is stored (Req 17.9)', () => {
    const store = makeStore();
    const colors = store.getBankColors();
    expect(colors['HDFC Bank']).toBe('#004C8F');
    expect(colors['ICICI Bank']).toBe('#F37021');
  });

  it('persists a custom bank color (Req 17.10)', () => {
    const store = makeStore();
    store.saveBankColor('HDFC Bank', '#FF0000');
    const colors = store.getBankColors();
    expect(colors['HDFC Bank']).toBe('#FF0000');
  });

  it('adds a new bank color entry (Req 17.10)', () => {
    const store = makeStore();
    store.saveBankColor('New Bank', '#ABCDEF');
    const colors = store.getBankColors();
    expect(colors['New Bank']).toBe('#ABCDEF');
  });

  it('saving one bank color does not remove others (Req 17.10)', () => {
    const store = makeStore();
    store.saveBankColor('HDFC Bank', '#FF0000');
    const colors = store.getBankColors();
    expect(colors['ICICI Bank']).toBe('#F37021');
  });

  it('saving bank color does not affect theme or dateFormat (Req 17.10)', () => {
    const store = makeStore();
    store.saveTheme('dark');
    store.saveDateFormat('YYYY-MM-DD');
    store.saveBankColor('HDFC Bank', '#FF0000');
    expect(store.getTheme()).toBe('dark');
    expect(store.getDateFormat()).toBe('YYYY-MM-DD');
  });
});

// ─── Property-Based Tests ─────────────────────────────────────────────────────

import fc from 'fast-check';

// ─── Property 40: Theme Persistence Round Trip ────────────────────────────────
// Validates: Requirements 11.4, 11.5

describe('Property 40: Theme Persistence Round Trip', () => {
  it(
    'saveTheme() followed by getTheme() returns the same theme value',
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom('light', 'dark'),
          (theme) => {
            const store = makeStore();
            store.saveTheme(theme);
            expect(store.getTheme()).toBe(theme);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ─── Property 42: Date Format Persistence Round Trip ─────────────────────────
// Validates: Requirements 12.3, 12.4

describe('Property 42: Date Format Persistence Round Trip', () => {
  it(
    'saveDateFormat() followed by getDateFormat() returns the same date format',
    () => {
      fc.assert(
        fc.property(
          fc.constantFrom('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'),
          (format) => {
            const store = makeStore();
            store.saveDateFormat(format);
            expect(store.getDateFormat()).toBe(format);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// ─── Property 52: Bank Color Persistence Round Trip ──────────────────────────
// Validates: Requirement 17.10

describe('Property 52: Bank Color Persistence Round Trip', () => {
  it(
    'saveBankColor() followed by getBankColors() returns the same color for that bank',
    () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          (bank, color) => {
            const store = makeStore();
            store.saveBankColor(bank, color);
            const colors = store.getBankColors();
            expect(colors[bank]).toBe(color);
          }
        ),
        { numRuns: 100 }
      );
    }
  );

  it(
    'saveBankColor() for one bank does not overwrite another bank color',
    () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          (bank1, bank2, color1, color2) => {
            fc.pre(bank1 !== bank2);
            const store = makeStore();
            store.saveBankColor(bank1, color1);
            store.saveBankColor(bank2, color2);
            const colors = store.getBankColors();
            expect(colors[bank1]).toBe(color1);
            expect(colors[bank2]).toBe(color2);
          }
        ),
        { numRuns: 100 }
      );
    }
  );
});

// @vitest-environment jsdom
/**
 * Property-based tests for SettingsView
 * Property 41: Date Format Application
 * Validates: Requirements 12.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { SettingsView } = require('../../js/views/settings.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DATE_FORMATS = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

function makeConfigStore(initialConfig = {}) {
  let config = {
    theme: 'light',
    dateFormat: 'DD/MM/YYYY',
    bankColors: { 'HDFC Bank': '#004C8F', 'ICICI Bank': '#F37021' },
    ...initialConfig,
  };
  return {
    getConfig: vi.fn(() => ({ ...config })),
    saveConfig: vi.fn((c) => { config = { ...c }; }),
    saveTheme: vi.fn((t) => { config.theme = t; }),
    saveDateFormat: vi.fn((f) => { config.dateFormat = f; }),
    saveBankColor: vi.fn((bank, color) => { config.bankColors[bank] = color; }),
    getBankColors: vi.fn(() => ({ ...config.bankColors })),
  };
}

function makeEncryptionService() {
  return {
    encryptExport: vi.fn(async (data, pw) => ({ version: 1, salt: 'abc', data: 'enc' })),
    decryptImport: vi.fn(async (enc, pw) => ({ cards: [], config: {} })),
    initializeMasterPassword: vi.fn(async () => {}),
  };
}

function makeCardStore() {
  return {
    getAllCards: vi.fn(async () => []),
    addCard: vi.fn(async (c) => c),
  };
}

function createView(configOverrides = {}) {
  const container = document.createElement('div');
  const configStore = makeConfigStore(configOverrides);
  const view = new SettingsView(container, configStore, makeEncryptionService(), makeCardStore());
  return { container, view, configStore };
}

// ─── Property 41: Date Format Application ────────────────────────────────────

describe('Property 41: Date Format Application', () => {
  it('renders the correct format option as selected for any valid date format', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DATE_FORMATS),
        (format) => {
          const { container } = createView({ dateFormat: format });
          const view = new SettingsView(
            container,
            makeConfigStore({ dateFormat: format }),
            makeEncryptionService(),
            makeCardStore()
          );
          view.render();

          const select = container.querySelector('#date-format-select');
          expect(select, 'date format select should exist').toBeTruthy();
          expect(select.value).toBe(format);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('preview reflects the selected date format correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DATE_FORMATS),
        (format) => {
          const container = document.createElement('div');
          const view = new SettingsView(
            container,
            makeConfigStore({ dateFormat: format }),
            makeEncryptionService(),
            makeCardStore()
          );
          view.render();

          const previewEl = container.querySelector('#date-preview-value');
          expect(previewEl, 'preview element should exist').toBeTruthy();

          const previewText = previewEl.textContent;
          const today = new Date();
          const d = String(today.getDate()).padStart(2, '0');
          const m = String(today.getMonth() + 1).padStart(2, '0');
          const y = String(today.getFullYear());

          if (format === 'DD/MM/YYYY') {
            expect(previewText).toMatch(new RegExp(`^${d}/${m}/${y}$`));
          } else if (format === 'MM/DD/YYYY') {
            expect(previewText).toMatch(new RegExp(`^${m}/${d}/${y}$`));
          } else if (format === 'YYYY-MM-DD') {
            expect(previewText).toMatch(new RegExp(`^${y}-${m}-${d}$`));
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('changing the select persists the new format via configStore', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DATE_FORMATS),
        fc.constantFrom(...DATE_FORMATS),
        (initialFormat, newFormat) => {
          const container = document.createElement('div');
          const configStore = makeConfigStore({ dateFormat: initialFormat });
          const view = new SettingsView(container, configStore, makeEncryptionService(), makeCardStore());
          view.render();

          const select = container.querySelector('#date-format-select');
          if (!select) return;

          // Simulate user changing the format
          select.value = newFormat;
          select.dispatchEvent(new Event('change'));

          expect(configStore.saveDateFormat).toHaveBeenCalledWith(newFormat);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('changing the select updates the preview to match the new format', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...DATE_FORMATS),
        fc.constantFrom(...DATE_FORMATS),
        (initialFormat, newFormat) => {
          const container = document.createElement('div');
          const view = new SettingsView(
            container,
            makeConfigStore({ dateFormat: initialFormat }),
            makeEncryptionService(),
            makeCardStore()
          );
          view.render();

          const select = container.querySelector('#date-format-select');
          const previewEl = container.querySelector('#date-preview-value');
          if (!select || !previewEl) return;

          select.value = newFormat;
          select.dispatchEvent(new Event('change'));

          const today = new Date();
          const d = String(today.getDate()).padStart(2, '0');
          const m = String(today.getMonth() + 1).padStart(2, '0');
          const y = String(today.getFullYear());

          const previewText = previewEl.textContent;

          if (newFormat === 'DD/MM/YYYY') {
            expect(previewText).toMatch(new RegExp(`^${d}/${m}/${y}$`));
          } else if (newFormat === 'MM/DD/YYYY') {
            expect(previewText).toMatch(new RegExp(`^${m}/${d}/${y}$`));
          } else if (newFormat === 'YYYY-MM-DD') {
            expect(previewText).toMatch(new RegExp(`^${y}-${m}-${d}$`));
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

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

// ─── Import Validation Tests (Req 23.3, 23.4, 23.6) ─────────────────────────

// Access the module-level validateImportData via a test-only export approach.
// Since it's a module-level function, we test it indirectly through the view's
// import flow, and also test the backup key behavior.

describe('validateImportData - detailed error messages (Req 23.6)', () => {
  // We test the validation logic by triggering the import flow with mocked data.

  it('shows detailed error when cards array is missing', async () => {
    const container = document.createElement('div');
    const encryptionService = makeEncryptionService();
    // decryptImport returns data without a cards array
    encryptionService.decryptImport = vi.fn(async () => ({ version: 1, exportDate: '2024-01-01' }));

    const cardStore = makeCardStore();
    const view = new SettingsView(container, makeConfigStore(), encryptionService, cardStore);
    view.render();

    // Simulate file selection with a valid encrypted wrapper
    const fileInput = container.querySelector('#import-file-input');
    const encryptedWrapper = { data: 'enc', salt: 'abc' };
    const file = new File([JSON.stringify(encryptedWrapper)], 'export.json', { type: 'application/json' });

    // Trigger file selection
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change'));

    // Wait for async operations
    await new Promise(r => setTimeout(r, 50));

    // Password modal should be open; simulate entering password
    const modal = container.querySelector('#password-modal');
    expect(modal).toBeTruthy();

    const pwInput = container.querySelector('#modal-password');
    if (pwInput) pwInput.value = 'testpassword';

    const confirmBtn = container.querySelector('#modal-confirm-btn');
    if (confirmBtn) confirmBtn.click();

    await new Promise(r => setTimeout(r, 50));

    // Should show error about missing cards
    const errorEl = container.querySelector('#modal-password-error');
    expect(errorEl).toBeTruthy();
    expect(errorEl.textContent).toMatch(/cards/i);
  });

  it('shows detailed error when individual card fields are missing', async () => {
    const container = document.createElement('div');
    const encryptionService = makeEncryptionService();
    // decryptImport returns cards with missing fields
    encryptionService.decryptImport = vi.fn(async () => ({
      version: 1,
      cards: [{ id: '1', name: 'Test' }] // missing number, cvv, expiry
    }));

    const cardStore = makeCardStore();
    const view = new SettingsView(container, makeConfigStore(), encryptionService, cardStore);
    view.render();

    const fileInput = container.querySelector('#import-file-input');
    const encryptedWrapper = { data: 'enc', salt: 'abc' };
    const file = new File([JSON.stringify(encryptedWrapper)], 'export.json', { type: 'application/json' });

    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change'));

    await new Promise(r => setTimeout(r, 50));

    const pwInput = container.querySelector('#modal-password');
    if (pwInput) pwInput.value = 'testpassword';

    const confirmBtn = container.querySelector('#modal-confirm-btn');
    if (confirmBtn) confirmBtn.click();

    await new Promise(r => setTimeout(r, 50));

    const errorEl = container.querySelector('#modal-password-error');
    expect(errorEl).toBeTruthy();
    // Should mention missing fields
    expect(errorEl.textContent).toMatch(/number|cvv|expiry/i);
  });

  it('creates a backup in localStorage before importing (Req 23.4)', async () => {
    const container = document.createElement('div');
    const encryptionService = makeEncryptionService();
    // Valid import data
    encryptionService.decryptImport = vi.fn(async () => ({
      version: 1,
      cards: [{
        id: '1', name: 'Test Card', number: '4111111111111111',
        cvv: '123', expiry: '2099-12'
      }]
    }));

    const cardStore = makeCardStore();
    cardStore.getAllCards = vi.fn(async () => [
      { id: 'existing-1', name: 'Existing', number: '4111', cvv: '111', expiry: '2099-01' }
    ]);

    const view = new SettingsView(container, makeConfigStore(), encryptionService, cardStore);
    view.render();

    const fileInput = container.querySelector('#import-file-input');
    const encryptedWrapper = { data: 'enc', salt: 'abc' };
    const file = new File([JSON.stringify(encryptedWrapper)], 'export.json', { type: 'application/json' });

    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    fileInput.dispatchEvent(new Event('change'));

    await new Promise(r => setTimeout(r, 50));

    const pwInput = container.querySelector('#modal-password');
    if (pwInput) pwInput.value = 'testpassword';

    const confirmBtn = container.querySelector('#modal-confirm-btn');
    if (confirmBtn) confirmBtn.click();

    await new Promise(r => setTimeout(r, 100));

    // Backup should be stored in localStorage
    const backup = localStorage.getItem('cardmanager_backup');
    expect(backup).toBeTruthy();
    const parsed = JSON.parse(backup);
    expect(parsed.backupDate).toBeDefined();
    expect(Array.isArray(parsed.cards)).toBe(true);
  });
});

describe('Download JSON Backup button (Req 23.5)', () => {
  it('renders the Download JSON Backup button in the data section', () => {
    const { container } = createView();
    const view = new SettingsView(
      container,
      makeConfigStore(),
      makeEncryptionService(),
      makeCardStore()
    );
    view.render();

    const btn = container.querySelector('#download-json-btn');
    expect(btn).toBeTruthy();
    expect(btn.textContent.trim()).toMatch(/json backup/i);
  });
});

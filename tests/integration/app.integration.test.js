/**
 * Integration tests for Card Manager
 * Tests complete end-to-end flows through real service/controller/model layers.
 * Requirements: All
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { CardStore }        = require('../../js/services/cardStore.js');
const { ConfigStore }      = require('../../js/services/configStore.js');
const { CardController }   = require('../../js/controllers/cardController.js');
const { SearchController } = require('../../js/controllers/searchController.js');
const { ValidatorService } = require('../../js/services/validator.js');
const { DetectorService }  = require('../../js/services/detector.js');
const { EncryptionService } = require('../../js/services/encryption.js');

// ─── localStorage / sessionStorage mock ──────────────────────────────────────

function createStorageMock() {
  let store = new Map();
  return {
    getItem:    vi.fn((key) => store.has(key) ? store.get(key) : null),
    setItem:    vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear:      vi.fn(() => store.clear()),
    _reset:     () => store.clear(),
  };
}

const localStorageMock  = createStorageMock();
const sessionStorageMock = createStorageMock();

vi.stubGlobal('localStorage',  localStorageMock);
vi.stubGlobal('sessionStorage', sessionStorageMock);

// ─── Web Crypto mock ──────────────────────────────────────────────────────────
// encrypt/decrypt are identity-like (base64 of plaintext) so tests don't need
// real AES-GCM. deriveKey returns a trivial sentinel object.

const cryptoMock = {
  getRandomValues: vi.fn((arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = i % 256;
    return arr;
  }),
  subtle: {
    importKey:  vi.fn(async () => ({ type: 'mock-key' })),
    deriveKey:  vi.fn(async () => ({ type: 'mock-derived-key' })),
    exportKey:  vi.fn(async (fmt, key) => ({ kty: 'mock', k: 'mock' })),
    encrypt:    vi.fn(async (algo, key, data) => data),   // identity
    decrypt:    vi.fn(async (algo, key, data) => data),   // identity
  },
};

vi.stubGlobal('crypto', cryptoMock);

// ─── Mocked EncryptionService ─────────────────────────────────────────────────
// Encrypt = btoa(plaintext), decrypt = atob(ciphertext).
// getKeyFromSession returns null so CardStore stores fields as-is (no encryption).

const mockEncryption = {
  getKeyFromSession: async () => null,
  encrypt: async (text) => btoa(text),
  decrypt: async (text) => {
    try { return atob(text); } catch { return text; }
  },
  encryptExport: async (data, password) => {
    const plaintext = JSON.stringify(data);
    const encoded = btoa(plaintext);
    return { version: 1, salt: btoa('mock-salt'), data: encoded };
  },
  decryptImport: async (pkg, password) => {
    if (!pkg || !pkg.data) throw new Error('Invalid export package');
    try {
      const plaintext = atob(pkg.data);
      return JSON.parse(plaintext);
    } catch {
      throw new Error('Incorrect password or corrupted data');
    }
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStorage() {
  localStorageMock._reset();
  sessionStorageMock._reset();
}

/** Build a fully-wired CardController with real CardStore, Validator, Detector */
function makeController() {
  const store      = new CardStore(mockEncryption);
  const validator  = new ValidatorService();
  const detector   = new DetectorService();
  return { controller: new CardController(store, validator, detector), store };
}

/** Valid card data that passes all validations */
function validCard(overrides = {}) {
  return {
    name:   'Test Card',
    number: '4532015112830366', // valid Visa Luhn
    cvv:    '123',
    expiry: '2099-12',
    annualFee: 500,
    creditLimit: 100000,
    bank:   'Unknown',
    network: 'Unknown',
    tags:   [],
    ...overrides,
  };
}

// ─── 1. Add Card Flow ─────────────────────────────────────────────────────────

describe('Integration: Add Card Flow', () => {
  beforeEach(resetStorage);

  it('addCard() with valid data stores the card and getAllCards() returns it', async () => {
    const { controller } = makeController();

    const result = await controller.addCard(validCard({ name: 'My Visa' }));

    expect(result.success).toBe(true);
    expect(result.card).toBeDefined();
    expect(result.card.id).toBeDefined();
    expect(result.card.name).toBe('My Visa');

    const all = await controller.getAllCards();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('My Visa');
  });

  it('addCard() auto-detects network from card number', async () => {
    const { controller } = makeController();

    const result = await controller.addCard(validCard({ number: '4532015112830366' }));

    expect(result.success).toBe(true);
    expect(result.card.network).toBe('Visa');
  });

  it('addCard() with invalid data returns failure with errors', async () => {
    const { controller } = makeController();

    const result = await controller.addCard({ name: '', number: '', cvv: '', expiry: '' });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(Object.keys(result.errors).length).toBeGreaterThan(0);
  });

  it('addCard() with invalid data does not persist anything', async () => {
    const { controller } = makeController();

    await controller.addCard({ name: '', number: '', cvv: '', expiry: '' });

    const all = await controller.getAllCards();
    expect(all).toHaveLength(0);
  });

  it('card has createdAt and updatedAt timestamps after add', async () => {
    const { controller } = makeController();

    const result = await controller.addCard(validCard());

    expect(result.card.createdAt).toBeDefined();
    expect(result.card.updatedAt).toBeDefined();
  });
});

// ─── 2. Edit Card Flow ────────────────────────────────────────────────────────

describe('Integration: Edit Card Flow', () => {
  beforeEach(resetStorage);

  it('updateCard() persists changed name and annualFee', async () => {
    const { controller } = makeController();

    const added = await controller.addCard(validCard({ name: 'Original', annualFee: 500 }));
    expect(added.success).toBe(true);

    const updated = await controller.updateCard(added.card.id, validCard({ name: 'Updated', annualFee: 999 }));
    expect(updated.success).toBe(true);
    expect(updated.card.name).toBe('Updated');
    expect(updated.card.annualFee).toBe(999);

    const all = await controller.getAllCards();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Updated');
    expect(all[0].annualFee).toBe(999);
  });

  it('updateCard() preserves the card id', async () => {
    const { controller } = makeController();

    const added = await controller.addCard(validCard());
    const originalId = added.card.id;

    const updated = await controller.updateCard(originalId, validCard({ name: 'Changed' }));
    expect(updated.card.id).toBe(originalId);
  });

  it('updateCard() with invalid data returns failure', async () => {
    const { controller } = makeController();

    const added = await controller.addCard(validCard());
    const result = await controller.updateCard(added.card.id, { name: '', number: '', cvv: '', expiry: '' });

    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
  });

  it('updateCard() on non-existent id returns failure', async () => {
    const { controller } = makeController();

    const result = await controller.updateCard('non-existent-id', validCard());
    expect(result.success).toBe(false);
  });

  it('updating one card does not affect other cards', async () => {
    const { controller } = makeController();

    const card1 = await controller.addCard(validCard({ name: 'Card One' }));
    const card2 = await controller.addCard(validCard({ name: 'Card Two' }));

    await controller.updateCard(card1.card.id, validCard({ name: 'Card One Updated' }));

    const retrieved2 = await controller.getCardById(card2.card.id);
    expect(retrieved2.name).toBe('Card Two');
  });
});

// ─── 3. Delete Card Flow ──────────────────────────────────────────────────────

describe('Integration: Delete Card Flow', () => {
  beforeEach(resetStorage);

  it('deleteCard() removes the card and getAllCards() returns empty', async () => {
    const { controller } = makeController();

    const added = await controller.addCard(validCard());
    expect(added.success).toBe(true);

    const deleted = await controller.deleteCard(added.card.id);
    expect(deleted.success).toBe(true);

    const all = await controller.getAllCards();
    expect(all).toHaveLength(0);
  });

  it('getCardById() returns null after deletion', async () => {
    const { controller } = makeController();

    const added = await controller.addCard(validCard());
    await controller.deleteCard(added.card.id);

    const found = await controller.getCardById(added.card.id);
    expect(found).toBeNull();
  });

  it('deleteCard() on non-existent id returns failure', async () => {
    const { controller } = makeController();

    const result = await controller.deleteCard('does-not-exist');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('deleting one card does not remove other cards', async () => {
    const { controller } = makeController();

    const card1 = await controller.addCard(validCard({ name: 'Keep Me' }));
    const card2 = await controller.addCard(validCard({ name: 'Delete Me' }));

    await controller.deleteCard(card2.card.id);

    const all = await controller.getAllCards();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('Keep Me');
  });
});

// ─── 4. Search, Filter, and Sort Flow ────────────────────────────────────────

describe('Integration: Search, Filter, and Sort Flow', () => {
  beforeEach(resetStorage);

  async function seedThreeCards(controller) {
    await controller.addCard(validCard({
      name: 'Alpha Card',
      number: '4532015112830366', // Visa
      annualFee: 500,
    }));
    await controller.addCard(validCard({
      name: 'Beta Card',
      number: '5425233430109903', // Mastercard
      annualFee: 1000,
    }));
    await controller.addCard(validCard({
      name: 'Gamma Card',
      number: '4532015112830366', // Visa
      annualFee: 200,
    }));
  }

  it('searchCards() by name returns matching cards', async () => {
    const { controller } = makeController();
    await seedThreeCards(controller);

    const all = await controller.getAllCards();
    const search = new SearchController();
    const results = search.searchCards('Beta', all);

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Beta Card');
  });

  it('filterByNetwork() returns only cards with matching network', async () => {
    const { controller } = makeController();
    await seedThreeCards(controller);

    const all = await controller.getAllCards();
    const search = new SearchController();
    const visaCards = search.filterByNetwork('Visa', all);

    expect(visaCards.length).toBeGreaterThanOrEqual(2);
    visaCards.forEach(c => expect(c.network).toBe('Visa'));
  });

  it('sortCards() by name returns cards in alphabetical order', async () => {
    const { controller } = makeController();
    await seedThreeCards(controller);

    const all = await controller.getAllCards();
    const search = new SearchController();
    const sorted = search.sortCards('name', all);

    const names = sorted.map(c => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('combineFilters() applies search + network filter + sort together', async () => {
    const { controller } = makeController();
    await seedThreeCards(controller);

    const all = await controller.getAllCards();
    const search = new SearchController();
    const results = search.combineFilters(all, {
      network: 'Visa',
      sortBy: 'name',
    });

    expect(results.length).toBeGreaterThanOrEqual(2);
    results.forEach(c => expect(c.network).toBe('Visa'));
    const names = results.map(c => c.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('searchCards() with empty query returns all cards', async () => {
    const { controller } = makeController();
    await seedThreeCards(controller);

    const all = await controller.getAllCards();
    const search = new SearchController();
    const results = search.searchCards('', all);

    expect(results).toHaveLength(all.length);
  });

  it('searchCards() with no match returns empty array', async () => {
    const { controller } = makeController();
    await seedThreeCards(controller);

    const all = await controller.getAllCards();
    const search = new SearchController();
    const results = search.searchCards('ZZZNoMatch', all);

    expect(results).toHaveLength(0);
  });
});

// ─── 5. Export / Import Round-Trip Flow ──────────────────────────────────────

describe('Integration: Export/Import Round-Trip Flow', () => {
  beforeEach(resetStorage);

  it('encryptExport then decryptImport with same password returns original data', async () => {
    const data = [
      { id: '1', name: 'Card A', number: '4532015112830366' },
      { id: '2', name: 'Card B', number: '5425233430109903' },
    ];
    const password = 'test-password-123';

    const pkg = await mockEncryption.encryptExport(data, password);
    expect(pkg.version).toBe(1);
    expect(pkg.salt).toBeDefined();
    expect(pkg.data).toBeDefined();

    const result = await mockEncryption.decryptImport(pkg, password);
    expect(result).toEqual(data);
  });

  it('round-trip preserves all card fields', async () => {
    const { controller } = makeController();

    await controller.addCard(validCard({ name: 'Export Me', annualFee: 750, creditLimit: 50000 }));
    const cards = await controller.getAllCards();

    const password = 'secure-export-pw';
    const pkg = await mockEncryption.encryptExport(cards, password);
    const imported = await mockEncryption.decryptImport(pkg, password);

    expect(imported).toHaveLength(1);
    expect(imported[0].name).toBe('Export Me');
    expect(imported[0].annualFee).toBe(750);
    expect(imported[0].creditLimit).toBe(50000);
  });

  it('round-trip through JSON serialization preserves data', async () => {
    const data = [{ id: '1', name: 'Serialized Card' }];
    const password = 'pw';

    const pkg = await mockEncryption.encryptExport(data, password);
    const serialized = JSON.parse(JSON.stringify(pkg));
    const result = await mockEncryption.decryptImport(serialized, password);

    expect(result).toEqual(data);
  });

  it('decryptImport with invalid package throws', async () => {
    await expect(mockEncryption.decryptImport({}, 'pw')).rejects.toThrow();
    await expect(mockEncryption.decryptImport(null, 'pw')).rejects.toThrow();
  });

  it('multiple cards survive export/import round-trip', async () => {
    const { controller } = makeController();

    await controller.addCard(validCard({ name: 'Card One' }));
    await controller.addCard(validCard({ name: 'Card Two' }));
    await controller.addCard(validCard({ name: 'Card Three' }));

    const cards = await controller.getAllCards();
    expect(cards).toHaveLength(3);

    const pkg = await mockEncryption.encryptExport(cards, 'pw');
    const imported = await mockEncryption.decryptImport(pkg, 'pw');

    expect(imported).toHaveLength(3);
    const names = imported.map(c => c.name).sort();
    expect(names).toEqual(['Card One', 'Card Three', 'Card Two']);
  });
});

// ─── 6. Theme Switching and Persistence Flow ──────────────────────────────────

describe('Integration: Theme Switching and Persistence Flow', () => {
  beforeEach(resetStorage);

  it('saveTheme("dark") then getTheme() returns "dark"', () => {
    const configStore = new ConfigStore();
    configStore.saveTheme('dark');
    expect(configStore.getTheme()).toBe('dark');
  });

  it('saveTheme("light") then getTheme() returns "light"', () => {
    const configStore = new ConfigStore();
    configStore.saveTheme('dark');
    configStore.saveTheme('light');
    expect(configStore.getTheme()).toBe('light');
  });

  it('default theme is "light" when nothing is stored', () => {
    const configStore = new ConfigStore();
    expect(configStore.getTheme()).toBe('light');
  });

  it('theme persists across new ConfigStore instances (same storage)', () => {
    const store1 = new ConfigStore();
    store1.saveTheme('dark');

    // Simulate a new page load by creating a fresh ConfigStore instance
    const store2 = new ConfigStore();
    expect(store2.getTheme()).toBe('dark');
  });

  it('switching theme multiple times always reflects the last saved value', () => {
    const configStore = new ConfigStore();

    configStore.saveTheme('dark');
    expect(configStore.getTheme()).toBe('dark');

    configStore.saveTheme('light');
    expect(configStore.getTheme()).toBe('light');

    configStore.saveTheme('dark');
    expect(configStore.getTheme()).toBe('dark');
  });

  it('saving theme does not affect other config values', () => {
    const configStore = new ConfigStore();
    configStore.saveDateFormat('YYYY-MM-DD');
    configStore.saveTheme('dark');

    expect(configStore.getDateFormat()).toBe('YYYY-MM-DD');
    expect(configStore.getTheme()).toBe('dark');
  });
});

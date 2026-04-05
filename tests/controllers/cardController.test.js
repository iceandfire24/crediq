/**
 * Tests for CardController
 * Validates: Requirements 1.9, 1.10, 1.11, 3.1, 3.2, 3.3, 3.4, 3.5, 16.1, 16.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { CardController } = require('../../js/controllers/cardController.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeValidCardData(overrides = {}) {
  return {
    name: 'Test Card',
    number: '4532015112830366', // valid Visa Luhn number
    cvv: '123',
    expiry: '2099-12',
    ...overrides
  };
}

function makeCard(overrides = {}) {
  return {
    id: overrides.id || crypto.randomUUID(),
    name: 'Test Card',
    number: '4532015112830366',
    cvv: '123',
    expiry: '2099-12',
    bank: 'Unknown',
    network: 'Visa',
    ...overrides
  };
}

function makeCardStore(cards = []) {
  const store = [...cards];
  return {
    getAllCards: vi.fn(async () => [...store]),
    getCardById: vi.fn(async (id) => store.find(c => c.id === id) || null),
    addCard: vi.fn(async (card) => {
      const newCard = { id: crypto.randomUUID(), ...card };
      store.push(newCard);
      return newCard;
    }),
    updateCard: vi.fn(async (id, updates) => {
      const idx = store.findIndex(c => c.id === id);
      if (idx === -1) return null;
      store[idx] = { ...store[idx], ...updates, id };
      return store[idx];
    }),
    deleteCard: vi.fn(async (id) => {
      const idx = store.findIndex(c => c.id === id);
      if (idx === -1) return false;
      store.splice(idx, 1);
      return true;
    })
  };
}

function makeValidator(valid = true, errors = {}) {
  return {
    validateForm: vi.fn(() => ({ valid, errors }))
  };
}

function makeDetector(network = 'Visa', bank = 'HDFC Bank') {
  return {
    detectNetwork: vi.fn(() => network),
    detectBank: vi.fn(() => bank)
  };
}

function makeEventBus() {
  const listeners = {};
  return {
    dispatchEvent: vi.fn((event) => {
      const handlers = listeners[event.type] || [];
      handlers.forEach(h => h(event));
    }),
    addEventListener: (type, handler) => {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    capturedEvents: () => Object.keys(listeners)
  };
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('CardController - getAllCards', () => {
  it('returns all cards from the store', async () => {
    const cards = [makeCard(), makeCard()];
    const ctrl = new CardController(makeCardStore(cards), makeValidator(), makeDetector());
    const result = await ctrl.getAllCards();
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no cards exist', async () => {
    const ctrl = new CardController(makeCardStore([]), makeValidator(), makeDetector());
    const result = await ctrl.getAllCards();
    expect(result).toEqual([]);
  });
});

describe('CardController - getCardById', () => {
  it('returns the card with the given id', async () => {
    const card = makeCard({ id: 'abc-123' });
    const ctrl = new CardController(makeCardStore([card]), makeValidator(), makeDetector());
    const result = await ctrl.getCardById('abc-123');
    expect(result).not.toBeNull();
    expect(result.id).toBe('abc-123');
  });

  it('returns null when card is not found', async () => {
    const ctrl = new CardController(makeCardStore([]), makeValidator(), makeDetector());
    const result = await ctrl.getCardById('nonexistent');
    expect(result).toBeNull();
  });
});

describe('CardController - addCard', () => {
  it('returns success with card when validation passes (Req 1.9)', async () => {
    const store = makeCardStore();
    const ctrl = new CardController(store, makeValidator(true), makeDetector());
    const result = await ctrl.addCard(makeValidCardData());
    expect(result.success).toBe(true);
    expect(result.card).toBeDefined();
    expect(store.addCard).toHaveBeenCalledOnce();
  });

  it('returns failure with errors when validation fails (Req 3.1)', async () => {
    const errors = { name: 'Card name is required' };
    const ctrl = new CardController(makeCardStore(), makeValidator(false, errors), makeDetector());
    const result = await ctrl.addCard({});
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(errors);
  });

  it('does not call cardStore.addCard when validation fails', async () => {
    const store = makeCardStore();
    const ctrl = new CardController(store, makeValidator(false, { name: 'required' }), makeDetector());
    await ctrl.addCard({});
    expect(store.addCard).not.toHaveBeenCalled();
  });

  it('detects network and bank from card number (Req 1.10, 1.11)', async () => {
    const detector = makeDetector('Mastercard', 'ICICI Bank');
    const store = makeCardStore();
    const ctrl = new CardController(store, makeValidator(true), detector);
    const result = await ctrl.addCard(makeValidCardData());
    expect(result.success).toBe(true);
    expect(detector.detectNetwork).toHaveBeenCalledWith(makeValidCardData().number);
    expect(detector.detectBank).toHaveBeenCalledWith(makeValidCardData().number);
    expect(result.card.network).toBe('Mastercard');
    expect(result.card.bank).toBe('ICICI Bank');
  });

  it('emits card-added event after successful add (Req 16.1)', async () => {
    const eventBus = makeEventBus();
    const ctrl = new CardController(makeCardStore(), makeValidator(true), makeDetector(), eventBus);
    await ctrl.addCard(makeValidCardData());
    expect(eventBus.dispatchEvent).toHaveBeenCalledOnce();
    const event = eventBus.dispatchEvent.mock.calls[0][0];
    expect(event.type).toBe('card-added');
    expect(event.detail.card).toBeDefined();
  });

  it('does not emit event when validation fails', async () => {
    const eventBus = makeEventBus();
    const ctrl = new CardController(makeCardStore(), makeValidator(false, {}), makeDetector(), eventBus);
    await ctrl.addCard({});
    expect(eventBus.dispatchEvent).not.toHaveBeenCalled();
  });
});

describe('CardController - updateCard', () => {
  it('returns success with updated card when validation passes (Req 3.3)', async () => {
    const card = makeCard({ id: 'card-1' });
    const store = makeCardStore([card]);
    const ctrl = new CardController(store, makeValidator(true), makeDetector());
    const result = await ctrl.updateCard('card-1', makeValidCardData({ name: 'Updated' }));
    expect(result.success).toBe(true);
    expect(result.card).toBeDefined();
    expect(store.updateCard).toHaveBeenCalledOnce();
  });

  it('returns failure with errors when validation fails (Req 3.1)', async () => {
    const errors = { cvv: 'CVV is required' };
    const ctrl = new CardController(makeCardStore(), makeValidator(false, errors), makeDetector());
    const result = await ctrl.updateCard('card-1', {});
    expect(result.success).toBe(false);
    expect(result.errors).toEqual(errors);
  });

  it('returns failure when card is not found', async () => {
    const store = makeCardStore();
    store.updateCard = vi.fn(async () => null);
    const ctrl = new CardController(store, makeValidator(true), makeDetector());
    const result = await ctrl.updateCard('nonexistent', makeValidCardData());
    expect(result.success).toBe(false);
    expect(result.errors.general).toBeDefined();
  });

  it('re-detects network and bank on update (Req 1.10, 1.11)', async () => {
    const card = makeCard({ id: 'card-1' });
    const detector = makeDetector('RuPay', 'State Bank of India');
    const ctrl = new CardController(makeCardStore([card]), makeValidator(true), detector);
    const result = await ctrl.updateCard('card-1', makeValidCardData());
    expect(result.success).toBe(true);
    expect(result.card.network).toBe('RuPay');
    expect(result.card.bank).toBe('State Bank of India');
  });

  it('emits card-updated event after successful update', async () => {
    const card = makeCard({ id: 'card-1' });
    const eventBus = makeEventBus();
    const ctrl = new CardController(makeCardStore([card]), makeValidator(true), makeDetector(), eventBus);
    await ctrl.updateCard('card-1', makeValidCardData());
    expect(eventBus.dispatchEvent).toHaveBeenCalledOnce();
    const event = eventBus.dispatchEvent.mock.calls[0][0];
    expect(event.type).toBe('card-updated');
  });

  it('does not emit event when validation fails', async () => {
    const eventBus = makeEventBus();
    const ctrl = new CardController(makeCardStore(), makeValidator(false, {}), makeDetector(), eventBus);
    await ctrl.updateCard('card-1', {});
    expect(eventBus.dispatchEvent).not.toHaveBeenCalled();
  });
});

describe('CardController - deleteCard', () => {
  it('returns success when card is deleted (Req 3.5)', async () => {
    const card = makeCard({ id: 'card-1' });
    const ctrl = new CardController(makeCardStore([card]), makeValidator(), makeDetector());
    const result = await ctrl.deleteCard('card-1');
    expect(result.success).toBe(true);
  });

  it('returns failure when card is not found', async () => {
    const ctrl = new CardController(makeCardStore([]), makeValidator(), makeDetector());
    const result = await ctrl.deleteCard('nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('emits card-deleted event with the deleted card id', async () => {
    const card = makeCard({ id: 'card-1' });
    const eventBus = makeEventBus();
    const ctrl = new CardController(makeCardStore([card]), makeValidator(), makeDetector(), eventBus);
    await ctrl.deleteCard('card-1');
    expect(eventBus.dispatchEvent).toHaveBeenCalledOnce();
    const event = eventBus.dispatchEvent.mock.calls[0][0];
    expect(event.type).toBe('card-deleted');
    expect(event.detail.id).toBe('card-1');
  });

  it('does not emit event when card is not found', async () => {
    const eventBus = makeEventBus();
    const ctrl = new CardController(makeCardStore([]), makeValidator(), makeDetector(), eventBus);
    await ctrl.deleteCard('nonexistent');
    expect(eventBus.dispatchEvent).not.toHaveBeenCalled();
  });
});

describe('CardController - getSharedLimitCards', () => {
  it('returns cards from the same bank (Req 16.1, 16.6)', async () => {
    const cards = [
      makeCard({ id: '1', bank: 'HDFC Bank' }),
      makeCard({ id: '2', bank: 'HDFC Bank' }),
      makeCard({ id: '3', bank: 'ICICI Bank' })
    ];
    const ctrl = new CardController(makeCardStore(cards), makeValidator(), makeDetector());
    const result = await ctrl.getSharedLimitCards('HDFC Bank');
    expect(result).toHaveLength(2);
    result.forEach(c => expect(c.bank).toBe('HDFC Bank'));
  });

  it('excludes the card being edited (Req 16.6)', async () => {
    const cards = [
      makeCard({ id: '1', bank: 'HDFC Bank' }),
      makeCard({ id: '2', bank: 'HDFC Bank' })
    ];
    const ctrl = new CardController(makeCardStore(cards), makeValidator(), makeDetector());
    const result = await ctrl.getSharedLimitCards('HDFC Bank', '1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns empty array when bankName is Unknown', async () => {
    const cards = [makeCard({ bank: 'Unknown' })];
    const ctrl = new CardController(makeCardStore(cards), makeValidator(), makeDetector());
    const result = await ctrl.getSharedLimitCards('Unknown');
    expect(result).toEqual([]);
  });

  it('returns empty array when bankName is null or empty', async () => {
    const ctrl = new CardController(makeCardStore([makeCard()]), makeValidator(), makeDetector());
    expect(await ctrl.getSharedLimitCards(null)).toEqual([]);
    expect(await ctrl.getSharedLimitCards('')).toEqual([]);
  });

  it('returns empty array when no cards match the bank', async () => {
    const cards = [makeCard({ bank: 'ICICI Bank' })];
    const ctrl = new CardController(makeCardStore(cards), makeValidator(), makeDetector());
    const result = await ctrl.getSharedLimitCards('HDFC Bank');
    expect(result).toEqual([]);
  });
});

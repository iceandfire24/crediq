// @vitest-environment jsdom
/**
 * Unit tests for WelcomeView
 * Validates: Requirements 20.1, 20.2, 20.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { isFirstRun, markWelcomed, showWelcome, DEMO_CARDS, STEPS } = require('../../js/views/welcome.js');

const WELCOMED_KEY = 'cardmanager_welcomed';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCardStore(addCardImpl) {
  return {
    addCard: vi.fn(addCardImpl || (async (card) => card)),
  };
}

function getOverlay() {
  return document.getElementById('welcome-overlay');
}

function getModal() {
  const overlay = getOverlay();
  return overlay ? overlay.querySelector('.welcome-modal') : null;
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  // Remove any leftover overlay
  const existing = document.getElementById('welcome-overlay');
  if (existing) existing.remove();
});

afterEach(() => {
  const existing = document.getElementById('welcome-overlay');
  if (existing) existing.remove();
  localStorage.clear();
});

// ─── isFirstRun ──────────────────────────────────────────────────────────────

describe('isFirstRun()', () => {
  it('returns true when localStorage key is absent', () => {
    localStorage.removeItem(WELCOMED_KEY);
    expect(isFirstRun()).toBe(true);
  });

  it('returns false when localStorage key is set to "1"', () => {
    localStorage.setItem(WELCOMED_KEY, '1');
    expect(isFirstRun()).toBe(false);
  });
});

// ─── markWelcomed ────────────────────────────────────────────────────────────

describe('markWelcomed()', () => {
  it('sets the localStorage key to "1"', () => {
    markWelcomed();
    expect(localStorage.getItem(WELCOMED_KEY)).toBe('1');
  });

  it('isFirstRun() returns false after markWelcomed()', () => {
    markWelcomed();
    expect(isFirstRun()).toBe(false);
  });
});

// ─── showWelcome ─────────────────────────────────────────────────────────────

describe('showWelcome()', () => {
  it('renders the welcome modal into the DOM', () => {
    showWelcome();
    expect(getOverlay()).not.toBeNull();
    expect(getModal()).not.toBeNull();
  });

  it('shows the first step title on open', () => {
    showWelcome();
    const title = document.getElementById('welcome-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toBe(STEPS[0].title);
  });

  it('"Next" button advances to the second step', () => {
    showWelcome();
    const nextBtn = document.getElementById('welcome-next');
    expect(nextBtn).not.toBeNull();
    nextBtn.click();
    const title = document.getElementById('welcome-title');
    expect(title.textContent).toBe(STEPS[1].title);
  });

  it('"Back" button returns to the previous step', () => {
    showWelcome();
    // Advance to step 2
    document.getElementById('welcome-next').click();
    // Go back
    const backBtn = document.getElementById('welcome-back');
    expect(backBtn).not.toBeNull();
    backBtn.click();
    const title = document.getElementById('welcome-title');
    expect(title.textContent).toBe(STEPS[0].title);
  });

  it('"Back" button is not shown on the first step', () => {
    showWelcome();
    expect(document.getElementById('welcome-back')).toBeNull();
  });

  it('last step shows "Get Started" instead of "Next"', () => {
    showWelcome();
    // Navigate to last step
    for (let i = 0; i < STEPS.length - 1; i++) {
      document.getElementById('welcome-next').click();
    }
    expect(document.getElementById('welcome-start')).not.toBeNull();
    expect(document.getElementById('welcome-next')).toBeNull();
  });

  it('"Get Started" button removes the modal and marks welcomed', () => {
    showWelcome();
    // Navigate to last step
    for (let i = 0; i < STEPS.length - 1; i++) {
      document.getElementById('welcome-next').click();
    }
    document.getElementById('welcome-start').click();
    expect(getOverlay()).toBeNull();
    expect(localStorage.getItem(WELCOMED_KEY)).toBe('1');
  });

  it('close (×) button removes the modal and marks welcomed', () => {
    showWelcome();
    document.getElementById('welcome-close').click();
    expect(getOverlay()).toBeNull();
    expect(localStorage.getItem(WELCOMED_KEY)).toBe('1');
  });

  it('last step shows "Try Demo" button', () => {
    showWelcome();
    for (let i = 0; i < STEPS.length - 1; i++) {
      document.getElementById('welcome-next').click();
    }
    expect(document.getElementById('welcome-demo')).not.toBeNull();
  });

  it('"Try Demo" button calls cardStore.addCard for each demo card and closes modal', async () => {
    const store = makeCardStore();
    showWelcome(store);
    // Navigate to last step
    for (let i = 0; i < STEPS.length - 1; i++) {
      document.getElementById('welcome-next').click();
    }
    await document.getElementById('welcome-demo').click();

    // Wait for async addCard calls
    await new Promise((r) => setTimeout(r, 50));

    expect(store.addCard).toHaveBeenCalledTimes(DEMO_CARDS.length);
    expect(getOverlay()).toBeNull();
    expect(localStorage.getItem(WELCOMED_KEY)).toBe('1');
  });

  it('"Try Demo" dispatches demo-cards-loaded event', async () => {
    const store = makeCardStore();
    const handler = vi.fn();
    document.addEventListener('demo-cards-loaded', handler, { once: true });

    showWelcome(store);
    for (let i = 0; i < STEPS.length - 1; i++) {
      document.getElementById('welcome-next').click();
    }
    document.getElementById('welcome-demo').click();

    await new Promise((r) => setTimeout(r, 50));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('step indicator dots reflect the current step', () => {
    showWelcome();
    const activeDot = () => getModal().querySelectorAll('.welcome-dot-active').length;
    expect(activeDot()).toBe(1);

    document.getElementById('welcome-next').click();
    expect(activeDot()).toBe(1);

    // The active dot should be the second one
    const dots = getModal().querySelectorAll('.welcome-dot');
    expect(dots[1].classList.contains('welcome-dot-active')).toBe(true);
  });
});

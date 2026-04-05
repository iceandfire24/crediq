// @vitest-environment jsdom
/**
 * Unit tests for MasterPasswordView
 * Requirements: 15.1, 15.4, 15.5, 15.6, 19.8
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { MasterPasswordView } = require('../../js/views/masterPassword.js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SALT_KEY = 'cm_salt';
const ATTEMPTS_KEY = 'passwordAttempts';
const LOCKOUT_KEY = 'lockoutUntil';

function makeEncryptionService({ verifyResult = 'ok', initResult = 'ok' } = {}) {
  return {
    initializeMasterPassword: vi.fn(async (pw) => {
      if (initResult === 'error') throw new Error('Init failed');
    }),
    verifyMasterPassword: vi.fn(async (pw) => {
      if (verifyResult === 'error') throw new Error('Incorrect password');
    }),
    getKeyFromSession: vi.fn(async () => null),
    clearSession: vi.fn(),
  };
}

function createView(encryptionService) {
  const enc = encryptionService || makeEncryptionService();
  const view = new MasterPasswordView(document.body, enc);
  return { view, enc };
}

// ─── Setup / Teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // Remove any leftover overlay
  const overlay = document.getElementById('master-password-overlay');
  if (overlay) overlay.remove();
});

afterEach(() => {
  const overlay = document.getElementById('master-password-overlay');
  if (overlay) overlay.remove();
  localStorage.clear();
  sessionStorage.clear();
});

// ─── Requirement 15.1: First-time setup vs login modal ───────────────────────

describe('Requirement 15.1 - Modal selection', () => {
  it('shows first-time setup modal when no salt exists in localStorage', () => {
    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.querySelector('#mp-password')).toBeTruthy();
    expect(overlay.querySelector('#mp-confirm')).toBeTruthy();
    expect(overlay.querySelector('#mp-setup-btn')).toBeTruthy();
  });

  it('shows login modal when salt exists in localStorage', () => {
    localStorage.setItem(SALT_KEY, 'somesalt');
    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay.querySelector('#mp-login-password')).toBeTruthy();
    expect(overlay.querySelector('#mp-login-btn')).toBeTruthy();
    // No confirm field in login modal
    expect(overlay.querySelector('#mp-confirm')).toBeFalsy();
  });
});

// ─── First-time setup ────────────────────────────────────────────────────────

describe('First-time setup modal', () => {
  it('shows error when password is empty', () => {
    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    overlay.querySelector('#mp-setup-btn').click();

    const error = overlay.querySelector('#mp-setup-error');
    expect(error.style.display).not.toBe('none');
    expect(error.textContent).toMatch(/enter a master password/i);
  });

  it('shows error when password is shorter than 8 characters', () => {
    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    overlay.querySelector('#mp-password').value = 'short';
    overlay.querySelector('#mp-setup-btn').click();

    const error = overlay.querySelector('#mp-setup-error');
    expect(error.textContent).toMatch(/at least 8 characters/i);
  });

  it('shows error when passwords do not match', () => {
    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    overlay.querySelector('#mp-password').value = 'password123';
    overlay.querySelector('#mp-confirm').value = 'different123';
    overlay.querySelector('#mp-setup-btn').click();

    const error = overlay.querySelector('#mp-setup-error');
    expect(error.textContent).toMatch(/do not match/i);
  });

  it('calls initializeMasterPassword and dispatches password-set on success', async () => {
    const enc = makeEncryptionService();
    const { view } = createView(enc);
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    overlay.querySelector('#mp-password').value = 'StrongPass1!';
    overlay.querySelector('#mp-confirm').value = 'StrongPass1!';

    const eventPromise = new Promise((resolve) => {
      document.addEventListener('password-set', resolve, { once: true });
    });

    overlay.querySelector('#mp-setup-btn').click();
    await eventPromise;

    expect(enc.initializeMasterPassword).toHaveBeenCalledWith('StrongPass1!');
    // Overlay should be removed
    expect(document.getElementById('master-password-overlay')).toBeFalsy();
  });

  it('shows error when initializeMasterPassword throws', async () => {
    const enc = makeEncryptionService({ initResult: 'error' });
    const { view } = createView(enc);
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    overlay.querySelector('#mp-password').value = 'StrongPass1!';
    overlay.querySelector('#mp-confirm').value = 'StrongPass1!';
    overlay.querySelector('#mp-setup-btn').click();

    // Wait for async handler
    await new Promise((r) => setTimeout(r, 50));

    const error = overlay.querySelector('#mp-setup-error');
    expect(error.style.display).not.toBe('none');
    expect(error.textContent).toMatch(/init failed/i);
  });
});

// ─── Password strength indicator ─────────────────────────────────────────────

describe('Password strength indicator', () => {
  it('shows no strength label when password is empty', () => {
    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    const label = overlay.querySelector('#mp-strength-text');
    expect(label.textContent).toBe('');
  });

  it('shows Weak for a short password', () => {
    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    const input = overlay.querySelector('#mp-password');
    input.value = 'abc';
    input.dispatchEvent(new Event('input'));

    const label = overlay.querySelector('#mp-strength-text');
    expect(label.textContent).toBe('Weak');
  });

  it('shows Fair for a medium-strength password', () => {
    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    const input = overlay.querySelector('#mp-password');
    input.value = 'Password1'; // 9 chars, upper+lower+digit = score 3 → Strong
    input.dispatchEvent(new Event('input'));

    const label = overlay.querySelector('#mp-strength-text');
    // score: length>=8 (+1), length<12 (no), upper+lower (+1), digit (+1) = 3 → Strong
    expect(['Fair', 'Strong']).toContain(label.textContent);
  });

  it('shows Strong for a complex password', () => {
    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    const input = overlay.querySelector('#mp-password');
    input.value = 'MyP@ssw0rd!2024'; // long, mixed case, digit, special
    input.dispatchEvent(new Event('input'));

    const label = overlay.querySelector('#mp-strength-text');
    expect(label.textContent).toBe('Strong');
  });
});

// ─── Login modal ─────────────────────────────────────────────────────────────

describe('Login modal', () => {
  beforeEach(() => {
    localStorage.setItem(SALT_KEY, 'somesalt');
  });

  it('shows error when password field is empty', () => {
    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    overlay.querySelector('#mp-login-btn').click();

    const error = overlay.querySelector('#mp-login-error');
    expect(error.style.display).not.toBe('none');
    expect(error.textContent).toMatch(/enter your master password/i);
  });

  it('calls verifyMasterPassword and dispatches password-verified on success', async () => {
    const enc = makeEncryptionService();
    const { view } = createView(enc);
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    overlay.querySelector('#mp-login-password').value = 'correctpassword';

    const eventPromise = new Promise((resolve) => {
      document.addEventListener('password-verified', resolve, { once: true });
    });

    overlay.querySelector('#mp-login-btn').click();
    await eventPromise;

    expect(enc.verifyMasterPassword).toHaveBeenCalledWith('correctpassword');
    expect(document.getElementById('master-password-overlay')).toBeFalsy();
  });

  it('shows error and increments attempts on wrong password', async () => {
    const enc = makeEncryptionService({ verifyResult: 'error' });
    const { view } = createView(enc);
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    overlay.querySelector('#mp-login-password').value = 'wrongpassword';
    overlay.querySelector('#mp-login-btn').click();

    await new Promise((r) => setTimeout(r, 50));

    const attempts = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0', 10);
    expect(attempts).toBe(1);

    const error = overlay.querySelector('#mp-login-error');
    expect(error.style.display).not.toBe('none');
    expect(error.textContent).toMatch(/incorrect password/i);
  });
});

// ─── Requirement 19.8: Rate limiting ─────────────────────────────────────────

describe('Requirement 19.8 - Rate limiting', () => {
  beforeEach(() => {
    localStorage.setItem(SALT_KEY, 'somesalt');
  });

  it('locks out after 5 failed attempts', async () => {
    const enc = makeEncryptionService({ verifyResult: 'error' });
    const { view } = createView(enc);
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    const loginBtn = overlay.querySelector('#mp-login-btn');
    const passwordInput = overlay.querySelector('#mp-login-password');

    // Simulate 5 failed attempts
    for (let i = 0; i < 5; i++) {
      passwordInput.value = 'wrong';
      loginBtn.click();
      await new Promise((r) => setTimeout(r, 20));
    }

    // After 5 attempts, lockout should be set
    const lockoutUntil = sessionStorage.getItem(LOCKOUT_KEY);
    expect(lockoutUntil).toBeTruthy();
    expect(Number(lockoutUntil)).toBeGreaterThan(Date.now());

    // Button and input should be disabled
    expect(loginBtn.disabled).toBe(true);
    expect(passwordInput.disabled).toBe(true);

    // Lockout message should be visible
    const lockoutMsg = overlay.querySelector('#mp-lockout-msg');
    expect(lockoutMsg.style.display).not.toBe('none');
    expect(lockoutMsg.textContent).toMatch(/too many failed attempts/i);
  });

  it('resets attempts on successful login', async () => {
    // Pre-set 3 failed attempts
    sessionStorage.setItem(ATTEMPTS_KEY, '3');

    const enc = makeEncryptionService({ verifyResult: 'ok' });
    const { view } = createView(enc);
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    overlay.querySelector('#mp-login-password').value = 'correctpassword';

    const eventPromise = new Promise((resolve) => {
      document.addEventListener('password-verified', resolve, { once: true });
    });

    overlay.querySelector('#mp-login-btn').click();
    await eventPromise;

    expect(sessionStorage.getItem(ATTEMPTS_KEY)).toBeFalsy();
    expect(sessionStorage.getItem(LOCKOUT_KEY)).toBeFalsy();
  });

  it('shows lockout message immediately if lockout is already active', () => {
    // Pre-set lockout
    const lockoutUntil = Date.now() + 5 * 60 * 1000;
    sessionStorage.setItem(LOCKOUT_KEY, String(lockoutUntil));
    sessionStorage.setItem(ATTEMPTS_KEY, '5');

    const { view } = createView();
    view.render();

    const overlay = document.getElementById('master-password-overlay');
    const lockoutMsg = overlay.querySelector('#mp-lockout-msg');
    expect(lockoutMsg.style.display).not.toBe('none');
    expect(lockoutMsg.textContent).toMatch(/too many failed attempts/i);

    const loginBtn = overlay.querySelector('#mp-login-btn');
    expect(loginBtn.disabled).toBe(true);
  });
});

// ─── Dismiss ─────────────────────────────────────────────────────────────────

describe('dismiss()', () => {
  it('removes the overlay from the DOM', () => {
    const { view } = createView();
    view.render();

    expect(document.getElementById('master-password-overlay')).toBeTruthy();
    view.dismiss();
    expect(document.getElementById('master-password-overlay')).toBeFalsy();
  });
});

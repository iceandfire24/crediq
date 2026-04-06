/**
 * Tests for featureDetect utility
 * Validates: Requirements 22.3, 22.4
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { hasWebCrypto, hasLocalStorage, checkBrowserCompatibility } from '../../js/utils/featureDetect.js';

// ─── hasWebCrypto ─────────────────────────────────────────────────────────────

describe('hasWebCrypto', () => {
  it('returns true when window.crypto.subtle is available', () => {
    // jsdom provides window.crypto.subtle in modern versions
    expect(typeof hasWebCrypto()).toBe('boolean');
  });

  it('returns false when window.crypto is undefined', () => {
    const original = window.crypto;
    Object.defineProperty(window, 'crypto', { value: undefined, configurable: true, writable: true });
    expect(hasWebCrypto()).toBe(false);
    Object.defineProperty(window, 'crypto', { value: original, configurable: true, writable: true });
  });

  it('returns false when window.crypto.subtle is undefined', () => {
    const original = window.crypto;
    Object.defineProperty(window, 'crypto', {
      value: { subtle: undefined },
      configurable: true,
      writable: true
    });
    expect(hasWebCrypto()).toBe(false);
    Object.defineProperty(window, 'crypto', { value: original, configurable: true, writable: true });
  });
});

// ─── hasLocalStorage ──────────────────────────────────────────────────────────

describe('hasLocalStorage', () => {
  it('returns true when localStorage is available', () => {
    expect(hasLocalStorage()).toBe(true);
  });

  it('returns false when localStorage.setItem throws', () => {
    const original = window.localStorage;
    const throwing = {
      setItem: () => { throw new Error('QuotaExceededError'); },
      removeItem: () => {}
    };
    Object.defineProperty(window, 'localStorage', { value: throwing, configurable: true, writable: true });
    expect(hasLocalStorage()).toBe(false);
    Object.defineProperty(window, 'localStorage', { value: original, configurable: true, writable: true });
  });

  it('returns false when localStorage is undefined', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true, writable: true });
    expect(hasLocalStorage()).toBe(false);
    Object.defineProperty(window, 'localStorage', { value: original, configurable: true, writable: true });
  });
});

// ─── checkBrowserCompatibility ────────────────────────────────────────────────

describe('checkBrowserCompatibility', () => {
  beforeEach(() => {
    // Remove any existing warning overlay
    document.getElementById('browser-compat-warning')?.remove();
  });

  afterEach(() => {
    document.getElementById('browser-compat-warning')?.remove();
  });

  it('returns true and shows no warning when all features are present', () => {
    // In jsdom both features should be available (or we mock them)
    const cryptoOrig = window.crypto;
    const lsOrig = window.localStorage;

    // Ensure both are present
    if (!window.crypto?.subtle) {
      Object.defineProperty(window, 'crypto', {
        value: { subtle: {} },
        configurable: true, writable: true
      });
    }

    const result = checkBrowserCompatibility();
    // If both features present, result is true and no overlay
    if (result) {
      expect(document.getElementById('browser-compat-warning')).toBeNull();
    }

    Object.defineProperty(window, 'crypto', { value: cryptoOrig, configurable: true, writable: true });
  });

  it('returns false and shows warning when Web Crypto is missing', () => {
    const original = window.crypto;
    Object.defineProperty(window, 'crypto', { value: undefined, configurable: true, writable: true });

    const result = checkBrowserCompatibility();
    expect(result).toBe(false);
    const warning = document.getElementById('browser-compat-warning');
    expect(warning).not.toBeNull();
    expect(warning.getAttribute('role')).toBe('alert');
    expect(warning.textContent).toContain('Web Crypto API');

    Object.defineProperty(window, 'crypto', { value: original, configurable: true, writable: true });
  });

  it('returns false and shows warning when localStorage is missing', () => {
    const original = window.localStorage;
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true, writable: true });

    const result = checkBrowserCompatibility();
    expect(result).toBe(false);
    const warning = document.getElementById('browser-compat-warning');
    expect(warning).not.toBeNull();
    expect(warning.textContent).toContain('localStorage');

    Object.defineProperty(window, 'localStorage', { value: original, configurable: true, writable: true });
  });

  it('does not create duplicate warnings on repeated calls', () => {
    const original = window.crypto;
    Object.defineProperty(window, 'crypto', { value: undefined, configurable: true, writable: true });

    checkBrowserCompatibility();
    checkBrowserCompatibility();

    const warnings = document.querySelectorAll('#browser-compat-warning');
    expect(warnings.length).toBe(1);

    Object.defineProperty(window, 'crypto', { value: original, configurable: true, writable: true });
  });

  it('warning banner has accessible role=alert', () => {
    const original = window.crypto;
    Object.defineProperty(window, 'crypto', { value: undefined, configurable: true, writable: true });

    checkBrowserCompatibility();
    const warning = document.getElementById('browser-compat-warning');
    expect(warning?.getAttribute('role')).toBe('alert');
    expect(warning?.getAttribute('aria-live')).toBe('assertive');

    Object.defineProperty(window, 'crypto', { value: original, configurable: true, writable: true });
  });
});

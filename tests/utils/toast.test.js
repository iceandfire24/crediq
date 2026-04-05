// @vitest-environment jsdom
/**
 * Unit tests for toast notification utility
 * Requirements: 3.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Use require for CJS-compat modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { showToast } = require('../../js/utils/toast.js');

describe('showToast', () => {
  beforeEach(() => {
    // Clean up any existing toast container
    document.getElementById('toast-container')?.remove();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.getElementById('toast-container')?.remove();
  });

  it('creates a toast container if one does not exist', () => {
    showToast('Hello');
    expect(document.getElementById('toast-container')).toBeTruthy();
  });

  it('reuses an existing toast container', () => {
    showToast('First');
    showToast('Second');
    expect(document.querySelectorAll('#toast-container').length).toBe(1);
  });

  it('renders the message text', () => {
    showToast('Test message', 'success');
    const msg = document.querySelector('.toast-message');
    expect(msg).toBeTruthy();
    expect(msg.textContent).toBe('Test message');
  });

  it('applies the correct type class', () => {
    for (const type of ['success', 'error', 'warning', 'info']) {
      document.getElementById('toast-container')?.remove();
      showToast('msg', type);
      const toast = document.querySelector(`.toast-${type}`);
      expect(toast, `toast-${type} class should exist`).toBeTruthy();
    }
  });

  it('has role="alert" for accessibility', () => {
    showToast('Accessible', 'info');
    const toast = document.querySelector('.toast');
    expect(toast.getAttribute('role')).toBe('alert');
  });

  it('stacks multiple toasts', () => {
    showToast('First', 'success');
    showToast('Second', 'error');
    showToast('Third', 'info');
    expect(document.querySelectorAll('.toast').length).toBe(3);
  });

  it('auto-dismisses after the default duration', () => {
    showToast('Auto dismiss', 'info');
    expect(document.querySelectorAll('.toast').length).toBe(1);

    // Advance past the 3s auto-dismiss + 200ms animation
    vi.advanceTimersByTime(3200);
    expect(document.querySelectorAll('.toast').length).toBe(0);
  });

  it('dismiss button removes the toast', () => {
    showToast('Dismiss me', 'success');
    const dismissBtn = document.querySelector('.toast-dismiss');
    expect(dismissBtn).toBeTruthy();
    dismissBtn.click();
    vi.advanceTimersByTime(300);
    expect(document.querySelectorAll('.toast').length).toBe(0);
  });

  it('escapes HTML in the message to prevent XSS', () => {
    showToast('<script>alert(1)</script>', 'error');
    const msg = document.querySelector('.toast-message');
    expect(msg.innerHTML).not.toContain('<script>');
    expect(msg.innerHTML).toContain('&lt;script&gt;');
  });
});

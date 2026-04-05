// @vitest-environment jsdom
/**
 * Unit tests for confirmation dialog utility
 * Requirements: 3.4
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { showConfirm, hideConfirm } = require('../../js/utils/confirm.js');

describe('showConfirm', () => {
  afterEach(() => {
    hideConfirm();
  });

  it('renders the confirmation dialog', () => {
    showConfirm('Are you sure?', () => {});
    expect(document.getElementById('confirm-dialog-overlay')).toBeTruthy();
  });

  it('displays the message', () => {
    showConfirm('Delete this card?', () => {});
    expect(document.querySelector('#confirm-dialog-body').textContent).toBe('Delete this card?');
  });

  it('displays the title', () => {
    showConfirm('msg', () => {}, null, { title: 'Delete Card' });
    expect(document.querySelector('#confirm-dialog-title').textContent).toBe('Delete Card');
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    showConfirm('Sure?', onConfirm);
    document.querySelector('#confirm-ok-btn').click();
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    showConfirm('Sure?', () => {}, onCancel);
    document.querySelector('#confirm-cancel-btn').click();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('removes the dialog after confirm', () => {
    showConfirm('Sure?', () => {});
    document.querySelector('#confirm-ok-btn').click();
    expect(document.getElementById('confirm-dialog-overlay')).toBeNull();
  });

  it('removes the dialog after cancel', () => {
    showConfirm('Sure?', () => {}, () => {});
    document.querySelector('#confirm-cancel-btn').click();
    expect(document.getElementById('confirm-dialog-overlay')).toBeNull();
  });

  it('closes on Escape key and calls onCancel', () => {
    const onCancel = vi.fn();
    showConfirm('Sure?', () => {}, onCancel);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(document.getElementById('confirm-dialog-overlay')).toBeNull();
  });

  it('closes on backdrop click and calls onCancel', () => {
    const onCancel = vi.fn();
    showConfirm('Sure?', () => {}, onCancel);
    const overlay = document.getElementById('confirm-dialog-overlay');
    overlay.click();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('replaces an existing dialog when called again', () => {
    showConfirm('First', () => {});
    showConfirm('Second', () => {});
    expect(document.querySelectorAll('#confirm-dialog-overlay').length).toBe(1);
    expect(document.querySelector('#confirm-dialog-body').textContent).toBe('Second');
  });

  it('has role="dialog" and aria-modal for accessibility', () => {
    showConfirm('Sure?', () => {});
    const overlay = document.getElementById('confirm-dialog-overlay');
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
  });

  it('uses danger button by default', () => {
    showConfirm('Delete?', () => {});
    expect(document.querySelector('#confirm-ok-btn').classList.contains('btn-danger')).toBe(true);
  });

  it('uses primary button when danger=false', () => {
    showConfirm('Proceed?', () => {}, null, { danger: false });
    expect(document.querySelector('#confirm-ok-btn').classList.contains('btn-primary')).toBe(true);
  });

  it('escapes HTML in message to prevent XSS', () => {
    showConfirm('<script>alert(1)</script>', () => {});
    const body = document.querySelector('#confirm-dialog-body');
    expect(body.innerHTML).not.toContain('<script>');
  });

  it('hideConfirm removes the dialog without callbacks', () => {
    const onCancel = vi.fn();
    showConfirm('Sure?', () => {}, onCancel);
    hideConfirm();
    expect(document.getElementById('confirm-dialog-overlay')).toBeNull();
    expect(onCancel).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
/**
 * Unit tests for progress bar utility
 * Requirements: 6.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { showProgress, updateProgress, hideProgress } = require('../../js/utils/progress.js');

describe('showProgress / updateProgress / hideProgress', () => {
  afterEach(() => {
    hideProgress();
  });

  it('creates a progress modal overlay', () => {
    showProgress('Exporting…');
    expect(document.getElementById('progress-modal-overlay')).toBeTruthy();
  });

  it('displays the provided label', () => {
    showProgress('Importing data');
    const label = document.querySelector('#progress-modal-label');
    expect(label.textContent).toBe('Importing data');
  });

  it('starts at 0%', () => {
    showProgress();
    const bar = document.querySelector('.progress-bar');
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
    expect(document.querySelector('.progress-fill').style.width).toBe('0%');
  });

  it('updateProgress sets the correct percentage', () => {
    showProgress();
    updateProgress(50);
    const bar = document.querySelector('.progress-bar');
    expect(bar.getAttribute('aria-valuenow')).toBe('50');
    expect(document.querySelector('.progress-fill').style.width).toBe('50%');
    expect(document.querySelector('.progress-percent').textContent).toBe('50%');
  });

  it('clamps progress to 0–100', () => {
    showProgress();
    updateProgress(-10);
    expect(document.querySelector('.progress-bar').getAttribute('aria-valuenow')).toBe('0');
    updateProgress(150);
    expect(document.querySelector('.progress-bar').getAttribute('aria-valuenow')).toBe('100');
  });

  it('updateProgress can update the label', () => {
    showProgress('Starting…');
    updateProgress(75, 'Almost done…');
    expect(document.querySelector('#progress-modal-label').textContent).toBe('Almost done…');
  });

  it('hideProgress removes the modal', () => {
    showProgress();
    hideProgress();
    expect(document.getElementById('progress-modal-overlay')).toBeNull();
  });

  it('showProgress replaces an existing modal', () => {
    showProgress('First');
    showProgress('Second');
    expect(document.querySelectorAll('#progress-modal-overlay').length).toBe(1);
    expect(document.querySelector('#progress-modal-label').textContent).toBe('Second');
  });

  it('has role="dialog" and aria-modal for accessibility', () => {
    showProgress();
    const overlay = document.getElementById('progress-modal-overlay');
    expect(overlay.getAttribute('role')).toBe('dialog');
    expect(overlay.getAttribute('aria-modal')).toBe('true');
  });

  it('updateProgress is a no-op when no modal is shown', () => {
    expect(() => updateProgress(50)).not.toThrow();
  });
});

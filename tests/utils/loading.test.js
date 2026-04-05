// @vitest-environment jsdom
/**
 * Unit tests for loading/skeleton utility
 * Requirements: 3.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { showLoading, hideLoading, showSkeleton, hideSkeleton } = require('../../js/utils/loading.js');

describe('showLoading / hideLoading', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('adds a loading overlay to the container', () => {
    showLoading(container);
    expect(container.querySelector('.loading-overlay-local')).toBeTruthy();
  });

  it('does not add duplicate overlays', () => {
    showLoading(container);
    showLoading(container);
    expect(container.querySelectorAll('.loading-overlay-local').length).toBe(1);
  });

  it('removes the overlay on hideLoading', () => {
    showLoading(container);
    hideLoading(container);
    expect(container.querySelector('.loading-overlay-local')).toBeNull();
  });

  it('overlay has role="status" for accessibility', () => {
    showLoading(container, 'Loading cards…');
    const overlay = container.querySelector('.loading-overlay-local');
    expect(overlay.getAttribute('role')).toBe('status');
    expect(overlay.getAttribute('aria-label')).toBe('Loading cards…');
  });

  it('handles null container gracefully', () => {
    expect(() => showLoading(null)).not.toThrow();
    expect(() => hideLoading(null)).not.toThrow();
  });
});

describe('showSkeleton / hideSkeleton', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('adds the specified number of skeleton cards', () => {
    showSkeleton(container, 4);
    expect(container.querySelectorAll('[data-skeleton]').length).toBe(4);
  });

  it('defaults to 3 skeleton cards', () => {
    showSkeleton(container);
    expect(container.querySelectorAll('[data-skeleton]').length).toBe(3);
  });

  it('removes existing skeletons before adding new ones', () => {
    showSkeleton(container, 2);
    showSkeleton(container, 5);
    expect(container.querySelectorAll('[data-skeleton]').length).toBe(5);
  });

  it('hideSkeleton removes all skeleton elements', () => {
    showSkeleton(container, 3);
    hideSkeleton(container);
    expect(container.querySelectorAll('[data-skeleton]').length).toBe(0);
  });

  it('skeleton cards have aria-hidden="true"', () => {
    showSkeleton(container, 1);
    const card = container.querySelector('[data-skeleton]');
    expect(card.getAttribute('aria-hidden')).toBe('true');
  });

  it('handles null container gracefully', () => {
    expect(() => showSkeleton(null)).not.toThrow();
    expect(() => hideSkeleton(null)).not.toThrow();
  });
});

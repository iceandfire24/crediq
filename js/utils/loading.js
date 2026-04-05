/**
 * Loading / Skeleton Utility
 * Provides spinner overlays and skeleton screen placeholders for async operations.
 * Requirements: 3.4
 */

const OVERLAY_ATTR = 'data-loading-overlay';

/**
 * Show a spinner overlay on a container element.
 * @param {HTMLElement} container - The element to overlay
 * @param {string} [label='Loading…'] - Accessible label for the spinner
 */
export function showLoading(container, label = 'Loading\u2026') {
  if (!container) return;

  // Avoid duplicate overlays
  if (container.querySelector(`[${OVERLAY_ATTR}]`)) return;

  // Make container a positioning context if needed
  const pos = getComputedStyle(container).position;
  if (pos === 'static') container.style.position = 'relative';

  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay loading-overlay-local';
  overlay.setAttribute(OVERLAY_ATTR, '');
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-label', label);
  overlay.innerHTML = `<div class="spinner spinner-lg" aria-hidden="true"></div>`;

  container.appendChild(overlay);
}

/**
 * Remove the spinner overlay from a container element.
 * @param {HTMLElement} container
 */
export function hideLoading(container) {
  if (!container) return;
  const overlay = container.querySelector(`[${OVERLAY_ATTR}]`);
  if (overlay) overlay.remove();
}

/**
 * Show skeleton card placeholders inside a container.
 * @param {HTMLElement} container - The element to fill with skeletons
 * @param {number} [count=3] - Number of skeleton cards to show
 */
export function showSkeleton(container, count = 3) {
  if (!container) return;

  // Remove any existing skeletons first
  hideSkeleton(container);

  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const card = document.createElement('div');
    card.className = 'card-item-skeleton';
    card.setAttribute('aria-hidden', 'true');
    card.setAttribute('data-skeleton', '');
    card.innerHTML = `
      <div class="skeleton skeleton-line skeleton-line-lg" style="width:60%"></div>
      <div class="skeleton skeleton-line" style="width:80%;margin-top:8px"></div>
      <div class="skeleton skeleton-line skeleton-line-sm" style="width:40%;margin-top:8px"></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px">
        <div class="skeleton skeleton-line skeleton-line-sm" style="width:30%"></div>
        <div class="skeleton skeleton-line skeleton-line-sm" style="width:20%"></div>
      </div>
    `;
    fragment.appendChild(card);
  }
  container.appendChild(fragment);
}

/**
 * Remove skeleton placeholders from a container.
 * @param {HTMLElement} container
 */
export function hideSkeleton(container) {
  if (!container) return;
  container.querySelectorAll('[data-skeleton]').forEach(el => el.remove());
}

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showLoading, hideLoading, showSkeleton, hideSkeleton };
}

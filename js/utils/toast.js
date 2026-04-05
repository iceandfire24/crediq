/**
 * Toast Notification Utility
 * Provides accessible, auto-dismissing toast notifications.
 * Requirements: 3.4
 */

const TOAST_DURATION = 3000;
const TOAST_ANIMATION_DURATION = 200;

const ICONS = {
  success: `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
  error:   `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
  warning: `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
  info:    `<svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
};

/**
 * Get or create the toast container element.
 * @returns {HTMLElement}
 */
function getContainer() {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'false');
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Show a toast notification.
 * @param {string} message - The message to display
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Toast type
 * @param {number} [duration] - Auto-dismiss duration in ms (default 3000)
 */
export function showToast(message, type = 'info', duration = TOAST_DURATION) {
  const container = getContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  const icon = ICONS[type] || ICONS.info;

  toast.innerHTML = `
    ${icon}
    <div class="toast-content">
      <span class="toast-message">${_esc(message)}</span>
    </div>
    <button class="toast-dismiss" aria-label="Dismiss notification" type="button">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  `;

  const dismissBtn = toast.querySelector('.toast-dismiss');
  dismissBtn.addEventListener('click', () => _dismiss(toast));

  container.appendChild(toast);

  // Auto-dismiss
  const timer = setTimeout(() => _dismiss(toast), duration);

  // Store timer so manual dismiss can clear it
  toast._dismissTimer = timer;
}

/**
 * Dismiss a toast element with animation.
 * @param {HTMLElement} toast
 */
function _dismiss(toast) {
  if (!toast || !toast.parentNode) return;
  clearTimeout(toast._dismissTimer);
  toast.classList.add('toast-hiding');
  setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, TOAST_ANIMATION_DURATION);
}

/**
 * Escape HTML to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function _esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { showToast };
}

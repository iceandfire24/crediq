/**
 * Progress Bar Utility
 * Provides a modal progress bar for long-running operations like export/import.
 * Requirements: 6.7
 */

const PROGRESS_ID = 'progress-modal-overlay';

/**
 * Show a progress bar modal.
 * @param {string} [label='Processing…'] - Label shown above the progress bar
 */
export function showProgress(label = 'Processing\u2026') {
  // Remove any existing progress modal
  hideProgress();

  const overlay = document.createElement('div');
  overlay.id = PROGRESS_ID;
  overlay.className = 'progress-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'progress-modal-label');

  overlay.innerHTML = `
    <div class="progress-modal">
      <p id="progress-modal-label" class="progress-label">${_esc(label)}</p>
      <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-fill" style="width:0%"></div>
      </div>
      <p class="progress-percent" aria-live="polite">0%</p>
    </div>
  `;

  document.body.appendChild(overlay);
}

/**
 * Update the progress bar value and optional label.
 * @param {number} percent - Progress percentage (0–100)
 * @param {string} [label] - Optional updated label
 */
export function updateProgress(percent, label) {
  const overlay = document.getElementById(PROGRESS_ID);
  if (!overlay) return;

  const clamped = Math.min(100, Math.max(0, Math.round(percent)));

  const bar = overlay.querySelector('.progress-bar');
  const fill = overlay.querySelector('.progress-fill');
  const percentEl = overlay.querySelector('.progress-percent');
  const labelEl = overlay.querySelector('#progress-modal-label');

  if (bar) bar.setAttribute('aria-valuenow', String(clamped));
  if (fill) fill.style.width = `${clamped}%`;
  if (percentEl) percentEl.textContent = `${clamped}%`;
  if (label && labelEl) labelEl.textContent = label;
}

/**
 * Hide and remove the progress bar modal.
 */
export function hideProgress() {
  const overlay = document.getElementById(PROGRESS_ID);
  if (overlay) overlay.remove();
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
  module.exports = { showProgress, updateProgress, hideProgress };
}

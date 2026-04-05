/**
 * Confirmation Dialog Utility
 * Provides an accessible modal confirmation dialog for destructive actions.
 * Requirements: 3.4
 */

const CONFIRM_ID = 'confirm-dialog-overlay';

/**
 * Show a confirmation dialog.
 * @param {string} message - The confirmation message/question
 * @param {Function} onConfirm - Callback invoked when user confirms
 * @param {Function} [onCancel] - Optional callback invoked when user cancels
 * @param {Object} [options]
 * @param {string} [options.title='Confirm'] - Dialog title
 * @param {string} [options.confirmLabel='Confirm'] - Confirm button label
 * @param {string} [options.cancelLabel='Cancel'] - Cancel button label
 * @param {boolean} [options.danger=true] - Use danger styling for confirm button
 */
export function showConfirm(message, onConfirm, onCancel, options = {}) {
  const {
    title = 'Confirm',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = true,
  } = options;

  // Remove any existing confirm dialog
  _removeDialog();

  const overlay = document.createElement('div');
  overlay.id = CONFIRM_ID;
  overlay.className = 'confirm-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'confirm-dialog-title');
  overlay.setAttribute('aria-describedby', 'confirm-dialog-body');

  overlay.innerHTML = `
    <div class="confirm-dialog">
      <h2 id="confirm-dialog-title" class="confirm-title">${_esc(title)}</h2>
      <p id="confirm-dialog-body" class="confirm-body">${_esc(message)}</p>
      <div class="confirm-actions">
        <button id="confirm-cancel-btn" class="btn btn-secondary" type="button">${_esc(cancelLabel)}</button>
        <button id="confirm-ok-btn" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button">${_esc(confirmLabel)}</button>
      </div>
    </div>
  `;

  const cancelBtn = overlay.querySelector('#confirm-cancel-btn');
  const okBtn = overlay.querySelector('#confirm-ok-btn');

  cancelBtn.addEventListener('click', () => {
    _removeDialog();
    if (typeof onCancel === 'function') onCancel();
  });

  okBtn.addEventListener('click', () => {
    _removeDialog();
    if (typeof onConfirm === 'function') onConfirm();
  });

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      _removeDialog();
      if (typeof onCancel === 'function') onCancel();
    }
  });

  // Close on Escape key
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', handleKeydown);
      _removeDialog();
      if (typeof onCancel === 'function') onCancel();
    }
  };
  document.addEventListener('keydown', handleKeydown);

  document.body.appendChild(overlay);

  // Focus the cancel button by default (safer for destructive actions)
  cancelBtn.focus();
}

/**
 * Programmatically close the confirmation dialog without triggering callbacks.
 */
export function hideConfirm() {
  _removeDialog();
}

function _removeDialog() {
  const existing = document.getElementById(CONFIRM_ID);
  if (existing) existing.remove();
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
  module.exports = { showConfirm, hideConfirm };
}

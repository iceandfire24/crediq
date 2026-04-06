/**
 * Settings View
 * App configuration and preferences
 * Requirements: 6.1, 6.4, 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 17.9, 17.10, 23.2, 23.3, 23.4, 23.5, 23.6
 */

const LAST_EXPORT_KEY = 'cm_last_export';
const BACKUP_KEY = 'cardmanager_backup';

// ---------------------------------------------------------------------------
// Import validation helpers (Req 23.3, 23.6)
// ---------------------------------------------------------------------------

/**
 * Validate the decrypted import data structure.
 * Returns { valid: true } or { valid: false, errors: string[] }
 * Requirement 23.6
 * @param {*} data
 * @returns {{ valid: boolean, errors?: string[] }}
 */
function validateImportData(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Import data is not a valid object.'] };
  }

  if (!Array.isArray(data.cards)) {
    errors.push('Missing required field: "cards" (must be an array).');
  } else {
    data.cards.forEach((card, idx) => {
      const label = `Card[${idx}]${card.name ? ` ("${card.name}")` : ''}`;
      if (!card.id) errors.push(`${label}: missing "id".`);
      if (!card.name) errors.push(`${label}: missing "name".`);
      if (!card.number) errors.push(`${label}: missing "number".`);
      if (!card.cvv) errors.push(`${label}: missing "cvv".`);
      if (!card.expiry) errors.push(`${label}: missing "expiry".`);
    });
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true };
}

class SettingsView {
  /**
   * @param {HTMLElement} container
   * @param {ConfigStore} configStore
   * @param {EncryptionService} encryptionService
   * @param {CardStore} cardStore
   */
  constructor(container, configStore, encryptionService, cardStore) {
    this.container = container;
    this.configStore = configStore;
    this.encryptionService = encryptionService;
    this.cardStore = cardStore;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Render the settings page.
   * Requirements: 11.1, 12.1, 17.9
   * @param {Object} [config]
   */
  render(config) {
    const cfg = config || (this.configStore ? this.configStore.getConfig() : {});
    const theme = (cfg && cfg.theme) || 'light';
    const dateFormat = (cfg && cfg.dateFormat) || 'DD/MM/YYYY';
    const bankColors = (cfg && cfg.bankColors) || {};
    const lastExport = this._getLastExportDate();

    this.container.innerHTML = this._buildPageHTML(theme, dateFormat, bankColors, lastExport);
    this._attachEventListeners(theme, dateFormat, bankColors);
  }

  // ---------------------------------------------------------------------------
  // Private: HTML builders
  // ---------------------------------------------------------------------------

  _buildPageHTML(theme, dateFormat, bankColors, lastExport) {
    return `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">Settings</h1>
        </div>

        ${this._buildAppearanceSection(theme, dateFormat)}
        ${this._buildBankColorsSection(bankColors)}
        ${this._buildSecuritySection()}
        ${this._buildDataSection(lastExport)}

        <!-- Password prompt modal -->
        <div id="password-modal" class="modal-overlay" role="dialog" aria-modal="true"
          aria-labelledby="password-modal-title" style="display:none;">
          <div class="modal-content">
            <h2 id="password-modal-title" class="modal-title"></h2>
            <p id="password-modal-desc" class="modal-body"></p>
            <div class="form-group">
              <label for="modal-password" class="form-label">Password</label>
              <input id="modal-password" type="password" class="form-input"
                autocomplete="current-password" placeholder="Enter password" />
              <span id="modal-password-error" class="form-error" style="display:none;"></span>
            </div>
            <div id="modal-confirm-group" class="form-group" style="display:none;">
              <label for="modal-password-confirm" class="form-label">Confirm Password</label>
              <input id="modal-password-confirm" type="password" class="form-input"
                autocomplete="new-password" placeholder="Confirm password" />
              <span id="modal-confirm-error" class="form-error" style="display:none;"></span>
            </div>
            <div class="modal-actions">
              <button id="modal-cancel-btn" class="btn btn-secondary" type="button">Cancel</button>
              <button id="modal-confirm-btn" class="btn btn-primary" type="button">Confirm</button>
            </div>
          </div>
        </div>

        <!-- Confirm dialog (clear data, etc.) -->
        <div id="confirm-dialog" class="modal-overlay" role="dialog" aria-modal="true"
          aria-labelledby="confirm-dialog-title" style="display:none;">
          <div class="modal-content">
            <h2 id="confirm-dialog-title" class="modal-title"></h2>
            <p id="confirm-dialog-body" class="modal-body"></p>
            <div class="modal-actions">
              <button id="confirm-cancel-btn" class="btn btn-secondary" type="button">Cancel</button>
              <button id="confirm-ok-btn" class="btn btn-danger" type="button">Confirm</button>
            </div>
          </div>
        </div>

        <!-- Toast notification -->
        <div id="settings-toast" class="toast" role="status" aria-live="polite" style="display:none;"></div>
      </div>
    `;
  }

  _buildAppearanceSection(theme, dateFormat) {
    const today = new Date();
    const previewDate = this._formatDatePreview(today, dateFormat);

    return `
      <section class="section" aria-labelledby="appearance-heading">
        <h2 id="appearance-heading" class="section-title">Appearance</h2>

        <!-- Theme toggle (Req 11.1, 11.2, 11.3) -->
        <div class="detail-row">
          <span class="detail-label">Theme</span>
          <div class="toggle-group" role="radiogroup" aria-label="Theme selection">
            <button id="theme-light-btn" type="button" role="radio"
              aria-checked="${theme === 'light'}"
              class="btn btn-sm ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}"
              data-theme="light">
              ☀ Light
            </button>
            <button id="theme-dark-btn" type="button" role="radio"
              aria-checked="${theme === 'dark'}"
              class="btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}"
              data-theme="dark">
              ☾ Dark
            </button>
          </div>
        </div>

        <!-- Date format selector (Req 12.1, 12.2) -->
        <div class="detail-row" style="margin-top:var(--spacing-md);">
          <label for="date-format-select" class="detail-label">Date Format</label>
          <div>
            <select id="date-format-select" class="form-input" style="width:auto;">
              <option value="DD/MM/YYYY" ${dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
              <option value="MM/DD/YYYY" ${dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
              <option value="YYYY-MM-DD" ${dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
            </select>
            <p id="date-format-preview" class="form-hint" style="margin-top:var(--spacing-xs);">
              Preview: <span id="date-preview-value">${this._esc(previewDate)}</span>
            </p>
          </div>
        </div>
      </section>
    `;
  }

  _buildBankColorsSection(bankColors) {
    const banks = Object.keys(bankColors);
    if (banks.length === 0) return '';

    const rows = banks.map(bank => {
      const color = bankColors[bank] || '#64748b';
      return `
        <div class="detail-row bank-color-row" style="align-items:center;">
          <span class="detail-label">${this._esc(bank)}</span>
          <div style="display:flex;align-items:center;gap:var(--spacing-sm);">
            <span class="bank-color-swatch" style="display:inline-block;width:24px;height:24px;
              border-radius:4px;background:${this._esc(color)};border:1px solid var(--border);"
              aria-hidden="true"></span>
            <input type="color" class="bank-color-picker" data-bank="${this._esc(bank)}"
              value="${this._esc(color)}" aria-label="Color for ${this._esc(bank)}"
              style="width:40px;height:32px;padding:2px;border:1px solid var(--border);
              border-radius:4px;cursor:pointer;background:transparent;" />
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="section" aria-labelledby="bank-colors-heading">
        <h2 id="bank-colors-heading" class="section-title">Bank Colors</h2>
        ${rows}
      </section>
    `;
  }

  _buildSecuritySection() {
    return `
      <section class="section" aria-labelledby="security-heading">
        <h2 id="security-heading" class="section-title">Security</h2>
        <div class="detail-row">
          <button id="change-password-btn" class="btn btn-secondary" type="button">
            Change Master Password
          </button>
        </div>
      </section>
    `;
  }

  _buildDataSection(lastExport) {
    const lastExportText = lastExport
      ? `Last exported: ${this._esc(lastExport)}`
      : 'No export on record';

    return `
      <section class="section" aria-labelledby="data-heading">
        <h2 id="data-heading" class="section-title">Data Management</h2>

        <div class="detail-row" style="flex-direction:column;align-items:flex-start;gap:var(--spacing-sm);">
          <div style="display:flex;gap:var(--spacing-sm);flex-wrap:wrap;">
            <button id="export-btn" class="btn btn-secondary" type="button">
              Export Data
            </button>
            <button id="import-btn" class="btn btn-secondary" type="button">
              Import Data
            </button>
            <button id="download-json-btn" class="btn btn-secondary" type="button"
              title="Download a plain JSON backup (no password required)">
              Download JSON Backup
            </button>
            <input id="import-file-input" type="file" accept=".json" style="display:none;"
              aria-label="Select import file" />
          </div>
          <p id="last-export-date" class="form-hint">${lastExportText}</p>
        </div>

        <div class="detail-row" style="margin-top:var(--spacing-md);">
          <button id="clear-data-btn" class="btn btn-danger" type="button">
            Clear All Data
          </button>
        </div>
      </section>
    `;
  }

  // ---------------------------------------------------------------------------
  // Private: Event listeners
  // ---------------------------------------------------------------------------

  _attachEventListeners(theme, dateFormat, bankColors) {
    this._attachThemeListeners();
    this._attachDateFormatListeners(dateFormat);
    this._attachBankColorListeners();
    this._attachSecurityListeners();
    this._attachDataListeners();
    this._attachModalListeners();
  }

  _attachThemeListeners() {
    const lightBtn = this.container.querySelector('#theme-light-btn');
    const darkBtn = this.container.querySelector('#theme-dark-btn');

    const applyTheme = (newTheme) => {
      // Immediate preview (Req 11.2, 11.3)
      document.documentElement.setAttribute('data-theme', newTheme);

      // Persist (Req 11.4)
      if (this.configStore) this.configStore.saveTheme(newTheme);

      // Update button states
      if (lightBtn) {
        lightBtn.setAttribute('aria-checked', String(newTheme === 'light'));
        lightBtn.className = `btn btn-sm ${newTheme === 'light' ? 'btn-primary' : 'btn-secondary'}`;
      }
      if (darkBtn) {
        darkBtn.setAttribute('aria-checked', String(newTheme === 'dark'));
        darkBtn.className = `btn btn-sm ${newTheme === 'dark' ? 'btn-primary' : 'btn-secondary'}`;
      }

      document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: newTheme } }));
    };

    if (lightBtn) lightBtn.addEventListener('click', () => applyTheme('light'));
    if (darkBtn) darkBtn.addEventListener('click', () => applyTheme('dark'));
  }

  _attachDateFormatListeners(currentFormat) {
    const select = this.container.querySelector('#date-format-select');
    const previewEl = this.container.querySelector('#date-preview-value');

    if (!select) return;

    select.addEventListener('change', () => {
      const newFormat = select.value;

      // Update preview (Req 12.2)
      if (previewEl) {
        previewEl.textContent = this._formatDatePreview(new Date(), newFormat);
      }

      // Persist (Req 12.3)
      if (this.configStore) this.configStore.saveDateFormat(newFormat);

      document.dispatchEvent(new CustomEvent('date-format-changed', { detail: { format: newFormat } }));
    });
  }

  _attachBankColorListeners() {
    const pickers = this.container.querySelectorAll('.bank-color-picker');
    pickers.forEach(picker => {
      picker.addEventListener('input', () => {
        const bank = picker.dataset.bank;
        const color = picker.value;

        // Update swatch preview
        const row = picker.closest('.bank-color-row');
        if (row) {
          const swatch = row.querySelector('.bank-color-swatch');
          if (swatch) swatch.style.background = color;
        }

        // Persist (Req 17.10)
        if (this.configStore) this.configStore.saveBankColor(bank, color);

        document.dispatchEvent(new CustomEvent('bank-color-changed', { detail: { bank, color } }));
      });
    });
  }

  _attachSecurityListeners() {
    const changePasswordBtn = this.container.querySelector('#change-password-btn');
    if (changePasswordBtn) {
      changePasswordBtn.addEventListener('click', () => this._handleChangePassword());
    }
  }

  _attachDataListeners() {
    const exportBtn = this.container.querySelector('#export-btn');
    const importBtn = this.container.querySelector('#import-btn');
    const fileInput = this.container.querySelector('#import-file-input');
    const clearBtn = this.container.querySelector('#clear-data-btn');
    const downloadJsonBtn = this.container.querySelector('#download-json-btn');

    if (exportBtn) exportBtn.addEventListener('click', () => this._handleExport());
    if (importBtn) importBtn.addEventListener('click', () => fileInput && fileInput.click());
    if (fileInput) fileInput.addEventListener('change', (e) => this._handleImportFileSelected(e));
    if (clearBtn) clearBtn.addEventListener('click', () => this._handleClearData());
    if (downloadJsonBtn) downloadJsonBtn.addEventListener('click', () => this._handleDownloadJson());
  }

  _attachModalListeners() {
    const cancelBtn = this.container.querySelector('#modal-cancel-btn');
    const confirmBtn = this.container.querySelector('#modal-confirm-btn');
    const confirmCancelBtn = this.container.querySelector('#confirm-cancel-btn');

    if (cancelBtn) cancelBtn.addEventListener('click', () => this._closePasswordModal());
    if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', () => this._closeConfirmDialog());

    // Enter key in password field triggers confirm
    const pwInput = this.container.querySelector('#modal-password');
    if (pwInput) {
      pwInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmBtn && confirmBtn.click();
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Export flow (Req 6.1, 6.2, 6.3)
  // ---------------------------------------------------------------------------

  _handleExport() {
    this._openPasswordModal({
      title: 'Export Data',
      description: 'Enter a password to encrypt your exported data.',
      confirmLabel: 'Export',
      showConfirm: false,
      onConfirm: async (password) => {
        try {
          const cards = await this.cardStore.getAllCards();
          const config = this.configStore ? this.configStore.getConfig() : {};
          const exportData = { cards, config, exportDate: new Date().toISOString() };

          const encrypted = await this.encryptionService.encryptExport(exportData, password);
          const blob = new Blob([JSON.stringify(encrypted)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);

          const a = document.createElement('a');
          a.href = url;
          a.download = `card-manager-export-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          // Record last export date (Req 23.2)
          const exportDateStr = new Date().toLocaleString();
          localStorage.setItem(LAST_EXPORT_KEY, exportDateStr);
          const lastExportEl = this.container.querySelector('#last-export-date');
          if (lastExportEl) lastExportEl.textContent = `Last exported: ${exportDateStr}`;

          this._closePasswordModal();
          this._showToast('Data exported successfully.', 'success');
        } catch (err) {
          this._showModalError(err.message || 'Export failed.');
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private: Download JSON backup (Req 23.5)
  // ---------------------------------------------------------------------------

  async _handleDownloadJson() {
    try {
      const cards = await this.cardStore.getAllCards();
      const config = this.configStore ? this.configStore.getConfig() : {};
      const backupData = {
        version: 1,
        exportDate: new Date().toISOString(),
        cards,
        config
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `card-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this._showToast('JSON backup downloaded.', 'success');
    } catch (err) {
      this._showToast(err.message || 'Failed to download backup.', 'error');
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Import flow (Req 6.4, 6.5, 6.6, 6.7, 23.3, 23.4, 23.6)
  // ---------------------------------------------------------------------------

  async _handleImportFileSelected(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    let encryptedData;
    try {
      const text = await file.text();
      encryptedData = JSON.parse(text);
    } catch {
      this._showToast('Invalid file format. Please select a valid export file.', 'error');
      event.target.value = '';
      return;
    }

    // Validate encrypted wrapper structure (Req 23.3)
    if (!encryptedData || !encryptedData.data || !encryptedData.salt) {
      this._showToast('Invalid export file structure. Expected an encrypted export package.', 'error');
      event.target.value = '';
      return;
    }

    this._openPasswordModal({
      title: 'Import Data',
      description: 'Enter the password used when this file was exported.',
      confirmLabel: 'Import',
      showConfirm: false,
      onConfirm: async (password) => {
        try {
          const importedData = await this.encryptionService.decryptImport(encryptedData, password);

          // Validate decrypted data structure with detailed errors (Req 23.6)
          const validation = validateImportData(importedData);
          if (!validation.valid) {
            const errorList = validation.errors.join('\n• ');
            this._showModalError(`Invalid import data:\n• ${errorList}`);
            return;
          }

          // Create automatic backup before applying import (Req 23.4)
          await this._createPreImportBackup();

          // Merge/replace cards
          for (const card of importedData.cards) {
            await this.cardStore.addCard(card);
          }

          this._closePasswordModal();
          this._showToast(`Imported ${importedData.cards.length} card(s) successfully.`, 'success');
          document.dispatchEvent(new CustomEvent('cards-imported'));
        } catch (err) {
          this._showModalError(err.message || 'Import failed. Check your password and try again.');
        }
      }
    });

    event.target.value = '';
  }

  async _createPreImportBackup() {
    try {
      const cards = await this.cardStore.getAllCards();
      const backup = { cards, backupDate: new Date().toISOString() };
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    } catch {
      // Non-fatal — proceed with import
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Change master password
  // ---------------------------------------------------------------------------

  _handleChangePassword() {
    this._openPasswordModal({
      title: 'Change Master Password',
      description: 'Enter your current password, then choose a new one.',
      confirmLabel: 'Change Password',
      showConfirm: true,
      onConfirm: async (password, confirmPassword) => {
        if (password !== confirmPassword) {
          this._showModalError('Passwords do not match.', true);
          return;
        }
        if (password.length < 8) {
          this._showModalError('Password must be at least 8 characters.');
          return;
        }
        try {
          await this.encryptionService.initializeMasterPassword(password);
          this._closePasswordModal();
          this._showToast('Master password changed successfully.', 'success');
        } catch (err) {
          this._showModalError(err.message || 'Failed to change password.');
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private: Clear all data
  // ---------------------------------------------------------------------------

  _handleClearData() {
    this._openConfirmDialog({
      title: 'Clear All Data',
      body: 'This will permanently delete all cards and settings. This action cannot be undone.',
      onConfirm: () => {
        localStorage.clear();
        sessionStorage.clear();
        this._closeConfirmDialog();
        this._showToast('All data cleared. Reloading…', 'success');
        setTimeout(() => window.location.reload(), 1500);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private: Password modal helpers
  // ---------------------------------------------------------------------------

  _openPasswordModal({ title, description, confirmLabel, showConfirm, onConfirm }) {
    const modal = this.container.querySelector('#password-modal');
    if (!modal) return;

    modal.querySelector('#password-modal-title').textContent = title;
    modal.querySelector('#password-modal-desc').textContent = description;

    const confirmGroup = modal.querySelector('#modal-confirm-group');
    if (confirmGroup) confirmGroup.style.display = showConfirm ? 'block' : 'none';

    const confirmBtn = modal.querySelector('#modal-confirm-btn');
    if (confirmBtn) confirmBtn.textContent = confirmLabel || 'Confirm';

    // Clear previous values and errors
    const pwInput = modal.querySelector('#modal-password');
    const pwConfirm = modal.querySelector('#modal-password-confirm');
    const pwError = modal.querySelector('#modal-password-error');
    const confirmError = modal.querySelector('#modal-confirm-error');
    if (pwInput) pwInput.value = '';
    if (pwConfirm) pwConfirm.value = '';
    if (pwError) { pwError.textContent = ''; pwError.style.display = 'none'; }
    if (confirmError) { confirmError.textContent = ''; confirmError.style.display = 'none'; }

    // Attach confirm handler
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', async () => {
      const password = pwInput ? pwInput.value : '';
      const confirmPassword = pwConfirm ? pwConfirm.value : '';
      if (!password) {
        this._showModalError('Password is required.');
        return;
      }
      await onConfirm(password, confirmPassword);
    });

    modal.style.display = 'flex';
    if (pwInput) pwInput.focus();
  }

  _closePasswordModal() {
    const modal = this.container.querySelector('#password-modal');
    if (modal) modal.style.display = 'none';
  }

  _showModalError(message, isConfirmField = false) {
    const errorId = isConfirmField ? '#modal-confirm-error' : '#modal-password-error';
    const errorEl = this.container.querySelector(errorId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Confirm dialog helpers
  // ---------------------------------------------------------------------------

  _openConfirmDialog({ title, body, onConfirm }) {
    const dialog = this.container.querySelector('#confirm-dialog');
    if (!dialog) return;

    dialog.querySelector('#confirm-dialog-title').textContent = title;
    dialog.querySelector('#confirm-dialog-body').textContent = body;

    const okBtn = dialog.querySelector('#confirm-ok-btn');
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    newOkBtn.addEventListener('click', onConfirm);

    dialog.style.display = 'flex';
  }

  _closeConfirmDialog() {
    const dialog = this.container.querySelector('#confirm-dialog');
    if (dialog) dialog.style.display = 'none';
  }

  // ---------------------------------------------------------------------------
  // Private: Toast
  // ---------------------------------------------------------------------------

  _showToast(message, type = 'success') {
    const toast = this.container.querySelector('#settings-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast toast-${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
  }

  // ---------------------------------------------------------------------------
  // Private: Helpers
  // ---------------------------------------------------------------------------

  _getLastExportDate() {
    try {
      return localStorage.getItem(LAST_EXPORT_KEY) || null;
    } catch {
      return null;
    }
  }

  /**
   * Format a Date using the given format string for preview.
   * Requirement 12.2
   */
  _formatDatePreview(date, format) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    switch (format) {
      case 'MM/DD/YYYY': return `${m}/${d}/${y}`;
      case 'YYYY-MM-DD': return `${y}-${m}-${d}`;
      default: return `${d}/${m}/${y}`;
    }
  }

  _esc(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// ES module export
export { SettingsView };

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsView };
}

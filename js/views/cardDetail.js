/**
 * Card Detail View
 * Display full card information with secure reveal for CVV and card number
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.4, 16.5, 17.2, 17.6, 19.5
 */

class CardDetailView {
  /**
   * @param {HTMLElement} container - DOM element to render into
   * @param {CardController} cardController - Card CRUD controller
   * @param {Object} crypto - Encryption service (unused directly; decryption handled by store)
   */
  constructor(container, cardController, crypto) {
    this.container = container;
    this.cardController = cardController;
    this.crypto = crypto;

    // Currently loaded card
    this._card = null;

    // Reveal state: 'none' | 'cvv' | 'number'
    this._revealed = 'none';

    // Auto-hide timer handle
    this._hideTimer = null;

    // Clipboard clear timer handle
    this._clipboardTimer = null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Render the card detail page for the given card id.
   * Requirements: 2.1, 17.2, 17.6
   *
   * @param {string} cardId - UUID of the card to display
   */
  async render(cardId) {
    this._revealed = 'none';
    this._clearHideTimer();
    this._clearClipboardTimer();

    let card = null;
    try {
      card = await this.cardController.getCardById(cardId);
    } catch (_) {
      card = null;
    }

    if (!card) {
      this.container.innerHTML = this._buildNotFoundHTML();
      return;
    }

    this._card = card;
    this.container.innerHTML = this._buildPageHTML(card);
    this.attachEventListeners();

    // Async: load shared limit card names (Req 16.5)
    this._loadSharedLimitNames();
  }

  /**
   * Reveal the CVV and mask the card number.
   * Requirement 2.2
   * Auto-hides after 30 seconds.
   */
  revealCVV() {
    this._revealed = 'cvv';
    this._updateSecureFields();
    this._startHideTimer();
  }

  /**
   * Reveal the card number and mask the CVV.
   * Requirement 2.3
   * Auto-hides after 30 seconds.
   */
  revealCardNumber() {
    this._revealed = 'number';
    this._updateSecureFields();
    this._startHideTimer();
  }

  /**
   * Copy a value to the clipboard with visual feedback.
   * Clears clipboard after 60 seconds (Req 19.5).
   * Requirement 2.4
   *
   * @param {string} value - The value to copy
   * @param {string} fieldType - 'cvv' or 'number' (for feedback label)
   */
  async copyToClipboard(value, fieldType) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
    } catch (_) {
      // Fallback for environments without clipboard API
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }

    // Visual feedback
    this._showCopyFeedback(fieldType);

    // Clear clipboard after 60 seconds (Req 19.5)
    this._clearClipboardTimer();
    this._clipboardTimer = setTimeout(async () => {
      try {
        await navigator.clipboard.writeText('');
      } catch (_) { /* ignore */ }
    }, 60000);
  }

  /**
   * Calculate a human-readable card age string from an issue date.
   * Requirement 2.5
   *
   * @param {string} issueDate - YYYY-MM format
   * @returns {string} e.g. "2 years 3 months" or "5 months"
   */
  calculateCardAge(issueDate) {
    if (!issueDate) return '—';
    const [year, month] = issueDate.split('-').map(Number);
    if (!year || !month) return '—';

    const issue = new Date(year, month - 1, 1);
    const now = new Date();
    const totalMonths = (now.getFullYear() - issue.getFullYear()) * 12
      + (now.getMonth() - issue.getMonth());

    if (totalMonths < 0) return '—';
    if (totalMonths === 0) return 'Less than a month';

    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;

    const parts = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    return parts.join(' ');
  }

  /**
   * Attach all event listeners for the detail page.
   */
  attachEventListeners() {
    // Back button
    const backBtn = this.container.querySelector('#btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => this._navigateBack());
    }

    // Edit button
    const editBtn = this.container.querySelector('#btn-edit');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        if (this._card && typeof router !== 'undefined') {
          router.navigate(`/edit/${this._card.id}`);
        }
      });
    }

    // Delete button
    const deleteBtn = this.container.querySelector('#btn-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this._handleDelete());
    }

    // Reveal CVV button
    const revealCvvBtn = this.container.querySelector('#btn-reveal-cvv');
    if (revealCvvBtn) {
      revealCvvBtn.addEventListener('click', () => {
        if (this._revealed === 'cvv') {
          this._hideSecureFields();
        } else {
          this.revealCVV();
        }
      });
    }

    // Reveal card number button
    const revealNumBtn = this.container.querySelector('#btn-reveal-number');
    if (revealNumBtn) {
      revealNumBtn.addEventListener('click', () => {
        if (this._revealed === 'number') {
          this._hideSecureFields();
        } else {
          this.revealCardNumber();
        }
      });
    }

    // Copy CVV button
    const copyCvvBtn = this.container.querySelector('#btn-copy-cvv');
    if (copyCvvBtn) {
      copyCvvBtn.addEventListener('click', () => {
        const cvv = this._card ? this._card.cvv : '';
        this.copyToClipboard(cvv, 'cvv');
      });
    }

    // Copy card number button
    const copyNumBtn = this.container.querySelector('#btn-copy-number');
    if (copyNumBtn) {
      copyNumBtn.addEventListener('click', () => {
        const num = this._card ? this._card.number : '';
        this.copyToClipboard(num, 'number');
      });
    }

    // Delete confirmation dialog buttons
    const confirmDeleteBtn = this.container.querySelector('#btn-confirm-delete');
    if (confirmDeleteBtn) {
      confirmDeleteBtn.addEventListener('click', () => this._confirmDelete());
    }

    const cancelDeleteBtn = this.container.querySelector('#btn-cancel-delete');
    if (cancelDeleteBtn) {
      cancelDeleteBtn.addEventListener('click', () => this._closeDeleteDialog());
    }
  }

  // ---------------------------------------------------------------------------
  // Private: HTML builders
  // ---------------------------------------------------------------------------

  /**
   * Build the full detail page HTML.
   * @param {Object} card
   * @returns {string}
   */
  _buildPageHTML(card) {
    const bankColor = this._getBankColor(card.bank);
    const networkLogoSrc = this._getNetworkLogo(card.network);
    const bankLogoSrc = this._getBankLogo(card.bank);

    return `
      <div class="page-container">
        <div class="page-header">
          <button id="btn-back" class="btn btn-secondary btn-sm" type="button" aria-label="Go back">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h1 class="page-title">${this._esc(card.name || 'Card Details')}</h1>
          <div style="display:flex;gap:var(--spacing-xs);">
            <button id="btn-edit" class="btn btn-secondary btn-sm" type="button" aria-label="Edit card">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              Edit
            </button>
            <button id="btn-delete" class="btn btn-danger btn-sm" type="button" aria-label="Delete card">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
              Delete
            </button>
          </div>
        </div>

        ${this._buildCardVisualHTML(card, bankColor, networkLogoSrc, bankLogoSrc)}
        ${this._buildSecureFieldsHTML(card)}
        ${this._buildCardInfoHTML(card)}
        ${this._buildFinancialInfoHTML(card)}
        ${this._buildBillingInfoHTML(card)}
        ${this._buildTagsHTML(card)}
        ${this._buildDeleteDialogHTML(card)}
      </div>
    `;
  }

  /**
   * Build the card visual section (header with logos).
   * Requirements: 17.2, 17.6
   */
  _buildCardVisualHTML(card, bankColor, networkLogoSrc, bankLogoSrc) {
    const maskedNum = card.maskedNumber || (card.number ? '•••• ' + String(card.number).slice(-4) : '•••• ••••');
    const expiryDisplay = card.expiry ? this._formatExpiry(card.expiry) : '—';
    const expiryClass = this._expiryClass(card);

    const networkLogoHTML = networkLogoSrc
      ? `<img class="card-detail-network-logo" src="${this._esc(networkLogoSrc)}" alt="${this._esc(card.network || 'Unknown')} logo" loading="lazy" onerror="this.src='assets/icons/placeholder.png'">`
      : `<span class="card-network-placeholder" aria-label="Unknown network"></span>`;

    const bankLogoHTML = bankLogoSrc
      ? `<img class="card-detail-bank-logo" src="${this._esc(bankLogoSrc)}" alt="${this._esc(card.bank || 'Unknown')} bank logo" loading="lazy" onerror="this.src='assets/icons/placeholder.png'">`
      : `<span class="card-bank-placeholder" aria-label="Unknown bank"></span>`;

    return `
      <div class="section">
        <div class="card-preview" style="background: linear-gradient(135deg, ${this._esc(bankColor)}, ${this._esc(bankColor)}cc);" aria-label="Card visual for ${this._esc(card.name)}">
          <div class="card-preview-header">
            ${networkLogoHTML}
            ${bankLogoHTML}
          </div>
          <div class="card-preview-name">${this._esc(card.name || '')}</div>
          <div id="card-number-display" class="card-preview-number">${this._esc(maskedNum)}</div>
          <div class="card-preview-footer">
            <span class="card-preview-label">VALID THRU</span>
            <span class="card-preview-expiry ${expiryClass}">${this._esc(expiryDisplay)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build the secure fields section (card number + CVV with reveal/copy).
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  _buildSecureFieldsHTML(card) {
    return `
      <div class="section">
        <h2 class="section-title">Secure Information</h2>

        <div class="detail-row" style="margin-bottom:var(--spacing-md);">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--spacing-sm);">
            <div>
              <span class="detail-label">Card Number</span>
              <div id="card-number-value" class="detail-value monospace" aria-live="polite" aria-label="Card number">
                •••• •••• •••• ••••
              </div>
            </div>
            <div style="display:flex;gap:var(--spacing-xs);">
              <button id="btn-reveal-number" class="btn btn-secondary btn-sm" type="button" aria-label="Show card number" aria-pressed="false">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                Show
              </button>
              <button id="btn-copy-number" class="btn btn-secondary btn-sm" type="button" aria-label="Copy card number">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                Copy
              </button>
              <span id="copy-number-feedback" class="copy-feedback" aria-live="polite" style="display:none;font-size:var(--text-xs);color:var(--success);align-self:center;">Copied!</span>
            </div>
          </div>
        </div>

        <div class="detail-row">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--spacing-sm);">
            <div>
              <span class="detail-label">CVV</span>
              <div id="cvv-value" class="detail-value monospace" aria-live="polite" aria-label="CVV">
                •••
              </div>
            </div>
            <div style="display:flex;gap:var(--spacing-xs);">
              <button id="btn-reveal-cvv" class="btn btn-secondary btn-sm" type="button" aria-label="Show CVV" aria-pressed="false">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                Show
              </button>
              <button id="btn-copy-cvv" class="btn btn-secondary btn-sm" type="button" aria-label="Copy CVV">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                Copy
              </button>
              <span id="copy-cvv-feedback" class="copy-feedback" aria-live="polite" style="display:none;font-size:var(--text-xs);color:var(--success);align-self:center;">Copied!</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build the card information section (expiry, issue date, age).
   * Requirement 2.5
   */
  _buildCardInfoHTML(card) {
    const expiryDisplay = card.expiry ? this._formatExpiry(card.expiry) : '—';
    const issueDateDisplay = card.issueDate ? this._formatExpiry(card.issueDate) : '—';
    const cardAge = this.calculateCardAge(card.issueDate);
    const expiryClass = this._expiryClass(card);

    let expiryStatusBadge = '';
    if (card.expiry) {
      if (expiryClass === 'expired') {
        expiryStatusBadge = `<span class="badge badge-danger" style="margin-left:var(--spacing-xs);">Expired</span>`;
      } else if (expiryClass === 'expiring-soon') {
        expiryStatusBadge = `<span class="badge badge-warning" style="margin-left:var(--spacing-xs);">Expiring Soon</span>`;
      }
    }

    return `
      <div class="section">
        <h2 class="section-title">Card Information</h2>
        <dl class="detail-list">
          <div class="detail-row">
            <dt class="detail-label">Network</dt>
            <dd class="detail-value">${this._esc(card.network && card.network !== 'Unknown' ? card.network : '—')}</dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Bank</dt>
            <dd class="detail-value">${this._esc(card.bank && card.bank !== 'Unknown' ? card.bank : '—')}</dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Expiry Date</dt>
            <dd class="detail-value">${this._esc(expiryDisplay)}${expiryStatusBadge}</dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Issue Date</dt>
            <dd class="detail-value">${this._esc(issueDateDisplay)}</dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Card Age</dt>
            <dd class="detail-value">${this._esc(cardAge)}</dd>
          </div>
        </dl>
      </div>
    `;
  }

  /**
   * Build the financial information section.
   * Requirements: 16.5
   */
  _buildFinancialInfoHTML(card) {
    const creditLimit = card.creditLimit ? this._formatCurrency(card.creditLimit) : '—';
    const annualFee = card.annualFee ? this._formatCurrency(card.annualFee) : '—';

    // Shared limit display (Req 16.5)
    let sharedLimitHTML = '<dd class="detail-value">—</dd>';
    if (card.sharedLimitWith && card.sharedLimitWith.length > 0) {
      sharedLimitHTML = `<dd class="detail-value" id="shared-limit-names" aria-label="Cards sharing this limit">Loading…</dd>`;
    }

    return `
      <div class="section">
        <h2 class="section-title">Financial Information</h2>
        <dl class="detail-list">
          <div class="detail-row">
            <dt class="detail-label">Credit Limit</dt>
            <dd class="detail-value">${this._esc(creditLimit)}</dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Annual Fee</dt>
            <dd class="detail-value">${this._esc(annualFee)}</dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Shared Limit With</dt>
            ${sharedLimitHTML}
          </div>
        </dl>
      </div>
    `;
  }

  /**
   * Build the billing information section.
   */
  _buildBillingInfoHTML(card) {
    const statementDate = card.statementDate ? `${card.statementDate}${this._ordinalSuffix(card.statementDate)} of each month` : '—';
    const dueDate = card.dueDate ? `${card.dueDate}${this._ordinalSuffix(card.dueDate)} of each month` : '—';
    const notifStatus = card.notificationsEnabled
      ? `Enabled (${card.reminderPeriod === 0 ? 'same day' : `${card.reminderPeriod} day${card.reminderPeriod !== 1 ? 's' : ''} before`})`
      : 'Disabled';

    return `
      <div class="section">
        <h2 class="section-title">Billing Information</h2>
        <dl class="detail-list">
          <div class="detail-row">
            <dt class="detail-label">Statement Date</dt>
            <dd class="detail-value">${this._esc(statementDate)}</dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Payment Due Date</dt>
            <dd class="detail-value">${this._esc(dueDate)}</dd>
          </div>
          <div class="detail-row">
            <dt class="detail-label">Notifications</dt>
            <dd class="detail-value">${this._esc(notifStatus)}</dd>
          </div>
        </dl>
      </div>
    `;
  }

  /**
   * Build the tags section.
   * Requirement 2.6
   */
  _buildTagsHTML(card) {
    const tags = card.tags || [];
    const tagsHTML = tags.length
      ? tags.map(t => `<span class="card-tag">${this._esc(t)}</span>`).join('')
      : '<span class="detail-value" style="color:var(--text-secondary);">No tags</span>';

    return `
      <div class="section">
        <h2 class="section-title">Tags</h2>
        <div class="card-tags" aria-label="Card tags">
          ${tagsHTML}
        </div>
      </div>
    `;
  }

  /**
   * Build the delete confirmation dialog.
   * Requirement 3.4
   */
  _buildDeleteDialogHTML(card) {
    return `
      <div id="delete-dialog" class="modal-overlay" role="dialog" aria-modal="true"
        aria-labelledby="delete-dialog-title" style="display:none;">
        <div class="modal-content">
          <h2 id="delete-dialog-title" class="modal-title">Delete Card</h2>
          <p class="modal-body">
            Are you sure you want to delete <strong>${this._esc(card.name || 'this card')}</strong>?
            This action cannot be undone.
          </p>
          <div class="modal-actions">
            <button id="btn-cancel-delete" class="btn btn-secondary" type="button">Cancel</button>
            <button id="btn-confirm-delete" class="btn btn-danger" type="button">Delete</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build the not-found page HTML.
   */
  _buildNotFoundHTML() {
    return `
      <div class="page-container">
        <div class="page-header">
          <button class="btn btn-secondary btn-sm" type="button" onclick="history.back()" aria-label="Go back">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h1 class="page-title">Card Not Found</h1>
        </div>
        <div class="section" style="text-align:center;padding:var(--spacing-2xl);">
          <p style="color:var(--text-secondary);">The requested card could not be found.</p>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Private: Secure field state management
  // ---------------------------------------------------------------------------

  /**
   * Update the secure field display based on current reveal state.
   * Requirements: 2.1, 2.2, 2.3
   */
  _updateSecureFields() {
    if (!this._card) return;

    const numberEl = this.container.querySelector('#card-number-value');
    const cvvEl = this.container.querySelector('#cvv-value');
    const revealNumBtn = this.container.querySelector('#btn-reveal-number');
    const revealCvvBtn = this.container.querySelector('#btn-reveal-cvv');
    const cardNumberDisplay = this.container.querySelector('#card-number-display');

    const maskedNum = this._card.maskedNumber
      || (this._card.number ? '•••• ' + String(this._card.number).slice(-4) : '•••• ••••');
    const formattedNum = this._card.number
      ? String(this._card.number).replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1 ')
      : '—';

    if (this._revealed === 'number') {
      // Show card number, mask CVV (Req 2.3)
      if (numberEl) numberEl.textContent = formattedNum;
      if (cvvEl) cvvEl.textContent = '•••';
      if (revealNumBtn) {
        revealNumBtn.textContent = 'Hide';
        revealNumBtn.setAttribute('aria-pressed', 'true');
      }
      if (revealCvvBtn) {
        revealCvvBtn.textContent = 'Show';
        revealCvvBtn.setAttribute('aria-pressed', 'false');
      }
      if (cardNumberDisplay) cardNumberDisplay.textContent = formattedNum;
    } else if (this._revealed === 'cvv') {
      // Show CVV, mask card number (Req 2.2)
      if (numberEl) numberEl.textContent = '•••• •••• •••• ••••';
      if (cvvEl) cvvEl.textContent = this._card.cvv || '—';
      if (revealNumBtn) {
        revealNumBtn.textContent = 'Show';
        revealNumBtn.setAttribute('aria-pressed', 'false');
      }
      if (revealCvvBtn) {
        revealCvvBtn.textContent = 'Hide';
        revealCvvBtn.setAttribute('aria-pressed', 'true');
      }
      if (cardNumberDisplay) cardNumberDisplay.textContent = maskedNum;
    } else {
      // Both hidden (Req 2.1)
      if (numberEl) numberEl.textContent = '•••• •••• •••• ••••';
      if (cvvEl) cvvEl.textContent = '•••';
      if (revealNumBtn) {
        revealNumBtn.textContent = 'Show';
        revealNumBtn.setAttribute('aria-pressed', 'false');
      }
      if (revealCvvBtn) {
        revealCvvBtn.textContent = 'Show';
        revealCvvBtn.setAttribute('aria-pressed', 'false');
      }
      if (cardNumberDisplay) cardNumberDisplay.textContent = maskedNum;
    }
  }

  /**
   * Hide all secure fields and reset reveal state.
   */
  _hideSecureFields() {
    this._revealed = 'none';
    this._clearHideTimer();
    this._updateSecureFields();
  }

  /**
   * Start the 30-second auto-hide timer.
   */
  _startHideTimer() {
    this._clearHideTimer();
    this._hideTimer = setTimeout(() => {
      this._hideSecureFields();
    }, 30000);
  }

  /**
   * Clear the auto-hide timer.
   */
  _clearHideTimer() {
    if (this._hideTimer !== null) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
  }

  /**
   * Clear the clipboard auto-clear timer.
   */
  _clearClipboardTimer() {
    if (this._clipboardTimer !== null) {
      clearTimeout(this._clipboardTimer);
      this._clipboardTimer = null;
    }
  }

  /**
   * Show copy feedback for a field.
   * @param {'cvv'|'number'} fieldType
   */
  _showCopyFeedback(fieldType) {
    const feedbackId = fieldType === 'cvv' ? '#copy-cvv-feedback' : '#copy-number-feedback';
    const feedbackEl = this.container.querySelector(feedbackId);
    if (!feedbackEl) return;

    feedbackEl.style.display = 'inline';
    setTimeout(() => {
      feedbackEl.style.display = 'none';
    }, 2000);
  }

  // ---------------------------------------------------------------------------
  // Private: Delete flow
  // ---------------------------------------------------------------------------

  /**
   * Show the delete confirmation dialog.
   * Requirement 3.4
   */
  _handleDelete() {
    const dialog = this.container.querySelector('#delete-dialog');
    if (dialog) {
      dialog.style.display = 'flex';
      // Focus the cancel button for accessibility
      const cancelBtn = dialog.querySelector('#btn-cancel-delete');
      if (cancelBtn) cancelBtn.focus();
    }
  }

  /**
   * Close the delete confirmation dialog without deleting.
   */
  _closeDeleteDialog() {
    const dialog = this.container.querySelector('#delete-dialog');
    if (dialog) dialog.style.display = 'none';
  }

  /**
   * Perform the actual card deletion after confirmation.
   * Requirement 3.5
   */
  async _confirmDelete() {
    if (!this._card) return;

    const confirmBtn = this.container.querySelector('#btn-confirm-delete');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Deleting…';
    }

    try {
      const result = await this.cardController.deleteCard(this._card.id);
      if (result.success) {
        this._navigateBack();
      } else {
        this._closeDeleteDialog();
        // Re-enable button on failure
        if (confirmBtn) {
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Delete';
        }
      }
    } catch (_) {
      this._closeDeleteDialog();
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Delete';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Async data loading
  // ---------------------------------------------------------------------------

  /**
   * Load and display shared limit card names after render.
   * Requirement 16.5
   */
  async _loadSharedLimitNames() {
    if (!this._card || !this._card.sharedLimitWith || this._card.sharedLimitWith.length === 0) return;

    const el = this.container.querySelector('#shared-limit-names');
    if (!el) return;

    try {
      const allCards = await this.cardController.getAllCards();
      const sharedCards = allCards.filter(c => this._card.sharedLimitWith.includes(c.id));
      if (sharedCards.length > 0) {
        el.textContent = sharedCards.map(c => c.name).join(', ');
      } else {
        el.textContent = '—';
      }
    } catch (_) {
      el.textContent = '—';
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Navigation
  // ---------------------------------------------------------------------------

  _navigateBack() {
    if (typeof router !== 'undefined' && router) {
      router.navigate('/');
    } else {
      history.back();
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Formatting helpers
  // ---------------------------------------------------------------------------

  /**
   * Format YYYY-MM expiry to MM/YYYY.
   * @param {string} expiry
   * @returns {string}
   */
  _formatExpiry(expiry) {
    if (!expiry) return '';
    const [year, month] = expiry.split('-');
    if (!year || !month) return expiry;
    return `${month}/${year}`;
  }

  /**
   * Format a number as Indian Rupee currency.
   * @param {number} amount
   * @returns {string}
   */
  _formatCurrency(amount) {
    if (!amount && amount !== 0) return '—';
    const num = Number(amount);
    if (isNaN(num)) return '—';
    const numStr = Math.abs(num).toString();
    const lastThree = numStr.substring(numStr.length - 3);
    const otherNumbers = numStr.substring(0, numStr.length - 3);
    const formatted = otherNumbers !== ''
      ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
      : lastThree;
    return `₹${num < 0 ? '-' : ''}${formatted}`;
  }

  /**
   * Get ordinal suffix for a day number.
   * @param {number} day
   * @returns {string}
   */
  _ordinalSuffix(day) {
    const n = Number(day);
    if (n >= 11 && n <= 13) return 'th';
    switch (n % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  /**
   * Determine CSS class for expiry date display.
   * @param {Object} card
   * @returns {string}
   */
  _expiryClass(card) {
    if (!card.expiry) return '';
    if (typeof card.isExpired !== 'undefined' && card.isExpired) return 'expired';
    if (typeof card.isExpiringSoon !== 'undefined' && card.isExpiringSoon) return 'expiring-soon';

    const [year, month] = card.expiry.split('-').map(Number);
    if (!year || !month) return '';
    const expiryDate = new Date(year, month, 0);
    const now = new Date();
    if (expiryDate < now) return 'expired';
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    if (expiryDate <= threeMonths) return 'expiring-soon';
    return '';
  }

  /**
   * Get bank color from detector service or fall back to default.
   * @param {string} bank
   * @returns {string}
   */
  _getBankColor(bank) {
    if (typeof detectorService !== 'undefined' && detectorService) {
      return detectorService.getBankColor(bank || 'Unknown');
    }
    return '#64748b';
  }

  /**
   * Get network logo path from detector service.
   * @param {string} network
   * @returns {string}
   */
  _getNetworkLogo(network) {
    if (typeof detectorService !== 'undefined' && detectorService) {
      return detectorService.getNetworkLogo(network || 'Unknown');
    }
    return 'assets/icons/placeholder.png';
  }

  /**
   * Get bank logo path from detector service.
   * @param {string} bank
   * @returns {string}
   */
  _getBankLogo(bank) {
    if (typeof detectorService !== 'undefined' && detectorService) {
      return detectorService.getBankLogo(bank || 'Unknown');
    }
    return 'assets/icons/placeholder.png';
  }

  /**
   * Escape HTML special characters to prevent XSS.
   * Requirement 19.4
   *
   * @param {string} str
   * @returns {string}
   */
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardDetailView };
}

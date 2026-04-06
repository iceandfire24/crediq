/**
 * Card Form View
 * Add/Edit card form with real-time validation, network/bank detection, and card preview
 * Requirements: 1.1-1.12, 3.1, 3.2, 8.2, 8.3, 10.1, 16.1, 16.6
 */

class CardFormView {
  /**
   * @param {HTMLElement} container - DOM element to render into
   * @param {CardController} cardController - Card CRUD controller
   * @param {ValidatorService} validator - Validator service instance
   * @param {DetectorService} detector - Detector service instance
   */
  constructor(container, cardController, validator, detector) {
    this.container = container;
    this.cardController = cardController;
    this.validator = validator;
    this.detector = detector;

    // Card being edited (null for add mode)
    this._card = null;

    // Current detected network/bank
    this._detectedNetwork = 'Unknown';
    this._detectedBank = 'Unknown';

    // Available tags (loaded from existing cards)
    this._availableTags = [];

    // Currently selected tags
    this._selectedTags = [];

    // Shared limit cards (same bank)
    this._sharedLimitCards = [];

    // Track touched fields for blur validation
    this._touchedFields = new Set();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Render the form for add or edit mode.
   * @param {Object|null} card - Card object for edit mode, null for add mode
   */
  async render(card = null) {
    this._card = card;
    this._detectedNetwork = card ? (card.network || 'Unknown') : 'Unknown';
    this._detectedBank = card ? (card.bank || 'Unknown') : 'Unknown';
    this._selectedTags = card ? [...(card.tags || [])] : [];
    this._touchedFields = new Set();

    // Load available tags from all cards
    await this._loadAvailableTags();

    // Load shared limit cards if editing and bank is known
    if (card && card.bank && card.bank !== 'Unknown') {
      await this._loadSharedLimitCards(card.bank, card.id);
    } else {
      this._sharedLimitCards = [];
    }

    const isEdit = card !== null;
    const title = isEdit ? 'Edit Card' : 'Add Card';

    this.container.innerHTML = this._buildFormHTML(card, title, isEdit);
    this.attachEventListeners();
    this._updateCardPreview();
    this._updateSaveButton();
  }

  /**
   * Attach all event listeners to the form.
   */
  attachEventListeners() {
    const form = this.container.querySelector('#card-form');
    if (!form) return;

    // Back button
    const backBtn = this.container.querySelector('#btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => this._navigateBack());
    }

    // Card number input: real-time detection + preview (Req 1.10, 1.11)
    const numberInput = form.querySelector('#field-number');
    if (numberInput) {
      numberInput.addEventListener('input', (e) => this.handleCardNumberInput(e));
      numberInput.addEventListener('blur', () => this._validateField('number'));
    }

    // Blur validation for required fields
    ['name', 'cvv', 'expiry'].forEach(field => {
      const el = form.querySelector(`#field-${field}`);
      if (el) {
        el.addEventListener('blur', () => this._validateField(field));
        el.addEventListener('input', () => {
          if (this._touchedFields.has(field)) this._validateField(field);
          this._updateCardPreview();
          this._updateSaveButton();
        });
      }
    });

    // Optional fields: validate on blur if filled
    ['issueDate', 'statementDate', 'dueDate', 'creditLimit', 'annualFee'].forEach(field => {
      const el = form.querySelector(`#field-${field}`);
      if (el) {
        el.addEventListener('blur', () => {
          if (el.value.trim()) this._validateField(field);
        });
        el.addEventListener('input', () => {
          if (this._touchedFields.has(field)) this._validateField(field);
          this._updateSaveButton();
        });
      }
    });

    // Card name input: update preview
    const nameInput = form.querySelector('#field-name');
    if (nameInput) {
      nameInput.addEventListener('input', () => this._updateCardPreview());
    }

    // Expiry input: update preview
    const expiryInput = form.querySelector('#field-expiry');
    if (expiryInput) {
      expiryInput.addEventListener('input', () => this._updateCardPreview());
    }

    // Notifications toggle (Req 8.2)
    const notifToggle = form.querySelector('#field-notificationsEnabled');
    if (notifToggle) {
      notifToggle.addEventListener('change', () => this._toggleReminderPeriod());
    }

    // Tag input: add tag on Enter or comma
    const tagInput = form.querySelector('#tag-input');
    if (tagInput) {
      tagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          this._addTagFromInput();
        }
      });
      tagInput.addEventListener('blur', () => this._addTagFromInput());
    }

    // Add tag button
    const addTagBtn = form.querySelector('#btn-add-tag');
    if (addTagBtn) {
      addTagBtn.addEventListener('click', () => this._addTagFromInput());
    }

    // Existing tag checkboxes
    this._attachTagCheckboxListeners();

    // Shared limit dropdown: update on bank change
    const sharedLimitSelect = form.querySelector('#field-sharedLimitWith');
    if (sharedLimitSelect) {
      sharedLimitSelect.addEventListener('change', () => this._updateSaveButton());
    }

    // Form submit
    form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  /**
   * Handle card number input: format, detect network/bank, update preview.
   * Requirements: 1.10, 1.11
   * @param {Event} event
   */
  handleCardNumberInput(event) {
    const input = event.target;
    const raw = input.value.replace(/\D/g, '');

    // Format with spaces every 4 digits
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    input.value = formatted;

    // Detect network and bank (Req 1.10, 1.11)
    const prevNetwork = this._detectedNetwork;
    const prevBank = this._detectedBank;

    this._detectedNetwork = this.detector ? this.detector.detectNetwork(raw) : 'Unknown';
    this._detectedBank = this.detector ? this.detector.detectBank(raw) : 'Unknown';

    // Update card preview
    this._updateCardPreview();

    // If bank changed, reload shared limit dropdown (Req 16.1, 16.6)
    if (this._detectedBank !== prevBank) {
      this._reloadSharedLimitDropdown();
    }

    // Validate if already touched
    if (this._touchedFields.has('number')) {
      this._validateField('number');
    }

    this._updateSaveButton();
  }

  /**
   * Handle form submission with full validation.
   * @param {Event} event
   */
  async handleSubmit(event) {
    event.preventDefault();

    // Mark all required fields as touched
    ['name', 'number', 'cvv', 'expiry'].forEach(f => this._touchedFields.add(f));

    const formData = this._collectFormData();
    const validation = this.validateForm(formData);

    if (!validation.valid) {
      this.showValidationErrors(validation.errors);
      return;
    }

    const saveBtn = this.container.querySelector('#btn-save');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
    }

    try {
      let result;
      if (this._card) {
        result = await this.cardController.updateCard(this._card.id, formData);
      } else {
        result = await this.cardController.addCard(formData);
      }

      if (result.success) {
        this._navigateBack();
      } else {
        this.showValidationErrors(result.errors || {});
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = 'Save';
        }
      }
    } catch (err) {
      this._showGeneralError('An unexpected error occurred. Please try again.');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
      }
    }
  }

  /**
   * Run full form validation and return result.
   * @returns {{ valid: boolean, errors: Object }}
   */
  validateForm(formData) {
    if (this.validator) {
      return this.validator.validateForm(formData || this._collectFormData());
    }
    return { valid: true, errors: {} };
  }

  /**
   * Display inline validation errors below fields.
   * @param {Object} errors - Map of field name to error message
   */
  showValidationErrors(errors) {
    if (!errors) return;
    Object.entries(errors).forEach(([field, message]) => {
      this._setFieldError(field, message);
    });
  }

  // ---------------------------------------------------------------------------
  // Private: HTML builders
  // ---------------------------------------------------------------------------

  /**
   * Build the full form page HTML.
   * @param {Object|null} card
   * @param {string} title
   * @param {boolean} isEdit
   * @returns {string}
   */
  _buildFormHTML(card, title, isEdit) {
    const v = (field) => card ? this._esc(card[field] != null ? String(card[field]) : '') : '';
    const expiryVal = card && card.expiry ? this._formatExpiryForInput(card.expiry) : '';
    const issueDateVal = card && card.issueDate ? this._formatExpiryForInput(card.issueDate) : '';
    const notifChecked = card && card.notificationsEnabled ? 'checked' : '';
    const reminderPeriod = card ? (card.reminderPeriod || 3) : 3;
    const reminderHidden = (!card || !card.notificationsEnabled) ? 'style="display:none"' : '';

    return `
      <div class="page-container">
        <div class="page-header">
          <button id="btn-back" class="btn btn-secondary btn-sm" type="button" aria-label="Go back">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
          <h1 class="page-title">${this._esc(title)}</h1>
          <button id="btn-save" class="btn btn-primary btn-sm" type="submit" form="card-form" disabled aria-label="Save card">
            Save
          </button>
        </div>

        ${this._buildCardPreviewHTML(card)}

        <form id="card-form" novalidate>
          <div class="section">
            <h2 class="section-title">Basic Information</h2>

            <div class="form-group">
              <label class="form-label" for="field-name">Card Name <span aria-hidden="true">*</span></label>
              <input id="field-name" class="form-input" type="text" name="name"
                value="${v('name')}" placeholder="e.g. HDFC Regalia"
                autocomplete="off" required aria-required="true"
                aria-describedby="error-name">
              <span id="error-name" class="form-error" role="alert" aria-live="polite"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="field-number">Card Number <span aria-hidden="true">*</span></label>
              <div style="position:relative;">
                <input id="field-number" class="form-input" type="text" name="number"
                  value="${card && card.number ? this._formatCardNumberDisplay(card.number) : ''}"
                  placeholder="1234 5678 9012 3456"
                  inputmode="numeric" autocomplete="cc-number"
                  maxlength="23" required aria-required="true"
                  aria-describedby="error-number">
                <span id="network-badge" class="network-badge" aria-live="polite" aria-label="Detected network"></span>
              </div>
              <span id="error-number" class="form-error" role="alert" aria-live="polite"></span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="field-cvv">CVV <span aria-hidden="true">*</span></label>
                <input id="field-cvv" class="form-input" type="password" name="cvv"
                  value="${v('cvv')}" placeholder="•••"
                  inputmode="numeric" autocomplete="cc-csc"
                  maxlength="4" required aria-required="true"
                  aria-describedby="error-cvv">
                <span id="error-cvv" class="form-error" role="alert" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="field-expiry">Expiry Date <span aria-hidden="true">*</span></label>
                <input id="field-expiry" class="form-input" type="text" name="expiry"
                  value="${expiryVal}" placeholder="MM/YYYY"
                  inputmode="numeric" autocomplete="cc-exp"
                  maxlength="7" required aria-required="true"
                  aria-describedby="error-expiry">
                <span id="error-expiry" class="form-error" role="alert" aria-live="polite"></span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="field-issueDate">Issue Date <span class="form-label-optional">(optional)</span></label>
              <input id="field-issueDate" class="form-input" type="text" name="issueDate"
                value="${issueDateVal}" placeholder="MM/YYYY"
                inputmode="numeric" autocomplete="off"
                maxlength="7" aria-describedby="error-issueDate">
              <span id="error-issueDate" class="form-error" role="alert" aria-live="polite"></span>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Financial Information</h2>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="field-creditLimit">Credit Limit <span class="form-label-optional">(optional)</span></label>
                <input id="field-creditLimit" class="form-input" type="number" name="creditLimit"
                  value="${v('creditLimit') || ''}" placeholder="0"
                  min="0" step="1" autocomplete="off"
                  aria-describedby="error-creditLimit">
                <span id="error-creditLimit" class="form-error" role="alert" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="field-annualFee">Annual Fee <span class="form-label-optional">(optional)</span></label>
                <input id="field-annualFee" class="form-input" type="number" name="annualFee"
                  value="${v('annualFee') || ''}" placeholder="0"
                  min="0" step="1" autocomplete="off"
                  aria-describedby="error-annualFee">
                <span id="error-annualFee" class="form-error" role="alert" aria-live="polite"></span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="field-sharedLimitWith" data-tooltip="Select other cards from the same bank that share a combined credit limit with this card.">Shared Limit With <span class="form-label-optional">(optional, same bank only)</span></label>
              ${this._buildSharedLimitHTML(card)}
              <span id="error-sharedLimitWith" class="form-error" role="alert" aria-live="polite"></span>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Billing Information</h2>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="field-statementDate" data-tooltip="The day of the month your billing cycle closes and your statement is generated (1–31).">Statement Date <span class="form-label-optional">(day 1–31)</span></label>
                <input id="field-statementDate" class="form-input" type="number" name="statementDate"
                  value="${v('statementDate') || ''}" placeholder="e.g. 5"
                  min="1" max="31" step="1" autocomplete="off"
                  aria-describedby="error-statementDate">
                <span id="error-statementDate" class="form-error" role="alert" aria-live="polite"></span>
              </div>

              <div class="form-group">
                <label class="form-label" for="field-dueDate">Payment Due Date <span class="form-label-optional">(day 1–31)</span></label>
                <input id="field-dueDate" class="form-input" type="number" name="dueDate"
                  value="${v('dueDate') || ''}" placeholder="e.g. 20"
                  min="1" max="31" step="1" autocomplete="off"
                  aria-describedby="error-dueDate">
                <span id="error-dueDate" class="form-error" role="alert" aria-live="polite"></span>
              </div>
            </div>

            <div class="form-group">
              <div class="toggle-row">
                <label class="form-label" for="field-notificationsEnabled">Enable Notifications</label>
                <label class="toggle" aria-label="Enable payment notifications">
                  <input id="field-notificationsEnabled" type="checkbox" name="notificationsEnabled"
                    ${notifChecked} role="switch" aria-checked="${notifChecked ? 'true' : 'false'}">
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div id="reminder-period-group" class="form-group" ${reminderHidden}>
              <label class="form-label" for="field-reminderPeriod" data-tooltip="How many days before the payment due date you want to receive a reminder notification.">Reminder Period</label>
              <select id="field-reminderPeriod" class="form-select" name="reminderPeriod"
                aria-describedby="error-reminderPeriod">
                <option value="7" ${reminderPeriod == 7 ? 'selected' : ''}>7 days before</option>
                <option value="3" ${reminderPeriod == 3 ? 'selected' : ''}>3 days before</option>
                <option value="1" ${reminderPeriod == 1 ? 'selected' : ''}>1 day before</option>
                <option value="0" ${reminderPeriod == 0 ? 'selected' : ''}>Same day</option>
              </select>
              <span id="error-reminderPeriod" class="form-error" role="alert" aria-live="polite"></span>
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">Tags <span class="form-label-optional">(optional)</span></h2>
            ${this._buildTagsHTML()}
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Build the card preview section HTML.
   * @param {Object|null} card
   * @returns {string}
   */
  _buildCardPreviewHTML(card) {
    const name = card ? this._esc(card.name || '') : '';
    const maskedNum = card && card.number
      ? '•••• •••• •••• ' + String(card.number).replace(/\D/g, '').slice(-4)
      : '•••• •••• •••• ••••';
    const expiry = card && card.expiry ? this._formatExpiryForDisplay(card.expiry) : 'MM/YY';
    const bankColor = this._getBankColor(this._detectedBank);
    const networkLogoSrc = this._getNetworkLogo(this._detectedNetwork);
    const bankLogoSrc = this._getBankLogo(this._detectedBank);

    return `
      <div class="section">
        <div id="card-preview" class="card-preview" style="background: linear-gradient(135deg, ${this._esc(bankColor)}, ${this._esc(bankColor)}cc);" aria-label="Card preview">
          <div class="card-preview-header">
            <img id="preview-network-logo" class="card-preview-logo"
              src="${this._esc(networkLogoSrc)}" alt="${this._esc(this._detectedNetwork)} logo"
              loading="lazy" onerror="this.src='assets/icons/placeholder.png'">
            <img id="preview-bank-logo" class="card-preview-logo card-preview-bank-logo"
              src="${this._esc(bankLogoSrc)}" alt="${this._esc(this._detectedBank)} logo"
              loading="lazy" onerror="this.src='assets/icons/placeholder.png'">
          </div>
          <div id="preview-name" class="card-preview-name">${name || 'Card Name'}</div>
          <div id="preview-number" class="card-preview-number">${this._esc(maskedNum)}</div>
          <div class="card-preview-footer">
            <span class="card-preview-label">VALID THRU</span>
            <span id="preview-expiry" class="card-preview-expiry">${this._esc(expiry)}</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Build the shared limit dropdown HTML.
   * Requirements: 16.1, 16.6
   * @param {Object|null} card
   * @returns {string}
   */
  _buildSharedLimitHTML(card) {
    const currentShared = card ? (card.sharedLimitWith || []) : [];

    if (this._sharedLimitCards.length === 0) {
      return `
        <select id="field-sharedLimitWith" class="form-select" name="sharedLimitWith" disabled
          aria-label="Shared limit with (no cards from same bank available)">
          <option value="">No cards from same bank</option>
        </select>
        <p class="form-hint">Enter a card number to detect the bank, then cards from the same bank will appear here.</p>
      `;
    }

    const options = this._sharedLimitCards.map(c => {
      const selected = currentShared.includes(c.id) ? 'selected' : '';
      return `<option value="${this._esc(c.id)}" ${selected}>${this._esc(c.name)}</option>`;
    }).join('');

    return `
      <select id="field-sharedLimitWith" class="form-select" name="sharedLimitWith" multiple
        aria-label="Select cards that share the credit limit">
        ${options}
      </select>
      <p class="form-hint">Hold Ctrl/Cmd to select multiple cards.</p>
    `;
  }

  /**
   * Build the tags section HTML.
   * Requirements: 10.1
   * @returns {string}
   */
  _buildTagsHTML() {
    const selectedTagsHTML = this._selectedTags.map(tag => `
      <span class="tag-chip" data-tag="${this._esc(tag)}">
        ${this._esc(tag)}
        <button type="button" class="tag-remove" aria-label="Remove tag ${this._esc(tag)}" data-tag="${this._esc(tag)}">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </span>
    `).join('');

    // Available tags not yet selected
    const availableForSelect = this._availableTags.filter(t => !this._selectedTags.includes(t));
    const availableTagsHTML = availableForSelect.map(tag => `
      <label class="tag-option">
        <input type="checkbox" class="tag-checkbox" value="${this._esc(tag)}" aria-label="Add tag ${this._esc(tag)}">
        ${this._esc(tag)}
      </label>
    `).join('');

    return `
      <div id="selected-tags" class="tag-chips" aria-label="Selected tags">
        ${selectedTagsHTML}
      </div>
      ${availableForSelect.length > 0 ? `
        <div class="tag-available" role="group" aria-label="Available tags">
          <p class="form-hint">Select existing tags:</p>
          <div class="tag-options">${availableTagsHTML}</div>
        </div>
      ` : ''}
      <div class="tag-add-row">
        <input id="tag-input" class="form-input" type="text" placeholder="Create new tag…"
          autocomplete="off" aria-label="New tag name" maxlength="50">
        <button id="btn-add-tag" type="button" class="btn btn-secondary btn-sm" aria-label="Add tag">
          Add
        </button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Private: Card preview updates
  // ---------------------------------------------------------------------------

  /**
   * Update the card preview with current form values.
   */
  _updateCardPreview() {
    const form = this.container.querySelector('#card-form');
    if (!form) return;

    const nameEl = this.container.querySelector('#preview-name');
    const numberEl = this.container.querySelector('#preview-number');
    const expiryEl = this.container.querySelector('#preview-expiry');
    const networkLogoEl = this.container.querySelector('#preview-network-logo');
    const bankLogoEl = this.container.querySelector('#preview-bank-logo');
    const previewEl = this.container.querySelector('#card-preview');
    const networkBadge = this.container.querySelector('#network-badge');

    const nameInput = form.querySelector('#field-name');
    const numberInput = form.querySelector('#field-number');
    const expiryInput = form.querySelector('#field-expiry');

    if (nameEl && nameInput) {
      nameEl.textContent = nameInput.value.trim() || 'Card Name';
    }

    if (numberEl && numberInput) {
      const raw = numberInput.value.replace(/\D/g, '');
      const lastFour = raw.slice(-4);
      numberEl.textContent = raw.length > 0
        ? '•••• •••• •••• ' + (lastFour || '••••')
        : '•••• •••• •••• ••••';
    }

    if (expiryEl && expiryInput) {
      const val = expiryInput.value.trim();
      if (val.match(/^\d{1,2}\/\d{4}$/)) {
        const [m, y] = val.split('/');
        expiryEl.textContent = `${m.padStart(2, '0')}/${y.slice(-2)}`;
      } else {
        expiryEl.textContent = 'MM/YY';
      }
    }

    // Update network logo
    if (networkLogoEl) {
      const src = this._getNetworkLogo(this._detectedNetwork);
      networkLogoEl.src = src;
      networkLogoEl.alt = `${this._detectedNetwork} logo`;
    }

    // Update bank logo
    if (bankLogoEl) {
      const src = this._getBankLogo(this._detectedBank);
      bankLogoEl.src = src;
      bankLogoEl.alt = `${this._detectedBank} logo`;
    }

    // Update card background color
    if (previewEl) {
      const bankColor = this._getBankColor(this._detectedBank);
      previewEl.style.background = `linear-gradient(135deg, ${bankColor}, ${bankColor}cc)`;
    }

    // Update network badge
    if (networkBadge) {
      if (this._detectedNetwork && this._detectedNetwork !== 'Unknown') {
        networkBadge.textContent = this._detectedNetwork;
        networkBadge.style.display = 'inline-block';
      } else {
        networkBadge.textContent = '';
        networkBadge.style.display = 'none';
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Validation helpers
  // ---------------------------------------------------------------------------

  /**
   * Validate a single field and show/clear its error.
   * @param {string} field - Field name
   */
  _validateField(field) {
    this._touchedFields.add(field);
    const form = this.container.querySelector('#card-form');
    if (!form || !this.validator) return;

    const input = form.querySelector(`#field-${field}`);
    const value = input ? input.value.trim() : '';
    let error = null;

    switch (field) {
      case 'name':
        if (!value) error = 'Card name is required';
        break;
      case 'number': {
        const result = this.validator.validateCardNumber(value);
        error = result.error;
        break;
      }
      case 'cvv': {
        const result = this.validator.validateCVV(value);
        error = result.error;
        break;
      }
      case 'expiry': {
        const result = this.validator.validateExpiryDate(value);
        error = result.error;
        break;
      }
      case 'issueDate':
        if (value) {
          const result = this.validator.validateIssueDate(value);
          error = result.error;
        }
        break;
      case 'statementDate':
        if (value) {
          const day = Number(value);
          if (!Number.isInteger(day) || day < 1 || day > 31) {
            error = 'Statement date must be between 1 and 31';
          }
        }
        break;
      case 'dueDate':
        if (value) {
          const day = Number(value);
          if (!Number.isInteger(day) || day < 1 || day > 31) {
            error = 'Due date must be between 1 and 31';
          }
        }
        break;
      case 'creditLimit':
        if (value) {
          const num = Number(value);
          if (isNaN(num) || num < 0) error = 'Credit limit must be a positive number';
        }
        break;
      case 'annualFee':
        if (value) {
          const num = Number(value);
          if (isNaN(num) || num < 0) error = 'Annual fee must be a positive number';
        }
        break;
    }

    this._setFieldError(field, error);
    this._updateSaveButton();
  }

  /**
   * Set or clear an inline error message for a field.
   * @param {string} field
   * @param {string|null} message
   */
  _setFieldError(field, message) {
    const errorEl = this.container.querySelector(`#error-${field}`);
    const inputEl = this.container.querySelector(`#field-${field}`);

    if (errorEl) {
      errorEl.textContent = message || '';
    }
    if (inputEl) {
      if (message) {
        inputEl.classList.add('form-input-error');
        inputEl.setAttribute('aria-invalid', 'true');
      } else {
        inputEl.classList.remove('form-input-error');
        inputEl.removeAttribute('aria-invalid');
      }
    }
  }

  /**
   * Enable/disable the save button based on form validity.
   */
  _updateSaveButton() {
    const saveBtn = this.container.querySelector('#btn-save');
    if (!saveBtn) return;

    const formData = this._collectFormData();
    const validation = this.validateForm(formData);
    saveBtn.disabled = !validation.valid;
  }

  // ---------------------------------------------------------------------------
  // Private: Form data collection
  // ---------------------------------------------------------------------------

  /**
   * Collect all form field values into a plain object.
   * @returns {Object}
   */
  _collectFormData() {
    const form = this.container.querySelector('#card-form');
    if (!form) return {};

    const get = (id) => {
      const el = form.querySelector(`#field-${id}`);
      return el ? el.value.trim() : '';
    };

    const getNum = (id) => {
      const val = get(id);
      return val !== '' ? Number(val) : null;
    };

    // Shared limit: collect selected options from multi-select
    const sharedLimitEl = form.querySelector('#field-sharedLimitWith');
    const sharedLimitWith = sharedLimitEl && !sharedLimitEl.disabled
      ? Array.from(sharedLimitEl.selectedOptions).map(o => o.value).filter(Boolean)
      : (this._card ? (this._card.sharedLimitWith || []) : []);

    // Notifications
    const notifEl = form.querySelector('#field-notificationsEnabled');
    const notificationsEnabled = notifEl ? notifEl.checked : false;

    const reminderPeriodEl = form.querySelector('#field-reminderPeriod');
    const reminderPeriod = reminderPeriodEl ? Number(reminderPeriodEl.value) : 3;

    // Card number: strip spaces
    const numberRaw = get('number').replace(/\s/g, '');

    // Convert expiry from MM/YYYY to YYYY-MM for storage
    const expiryInput = get('expiry');
    const expiry = this._parseExpiryToStorage(expiryInput);

    // Convert issue date from MM/YYYY to YYYY-MM for storage
    const issueDateInput = get('issueDate');
    const issueDate = issueDateInput ? this._parseExpiryToStorage(issueDateInput) : null;

    return {
      name: get('name'),
      number: numberRaw,
      cvv: get('cvv'),
      expiry: expiry || expiryInput,
      issueDate: issueDate || (issueDateInput || null),
      statementDate: getNum('statementDate'),
      dueDate: getNum('dueDate'),
      annualFee: getNum('annualFee') || 0,
      creditLimit: getNum('creditLimit') || 0,
      sharedLimitWith,
      tags: [...this._selectedTags],
      notificationsEnabled,
      reminderPeriod,
      network: this._detectedNetwork,
      bank: this._detectedBank
    };
  }

  // ---------------------------------------------------------------------------
  // Private: Tag management
  // ---------------------------------------------------------------------------

  /**
   * Load all unique tags from existing cards.
   * Requirements: 10.4, 10.5
   */
  async _loadAvailableTags() {
    try {
      // Use getAvailableTags() if available (Req 10.4), otherwise fall back to getAllCards()
      if (typeof this.cardController.getAvailableTags === 'function') {
        this._availableTags = await this.cardController.getAvailableTags();
      } else {
        const cards = await this.cardController.getAllCards();
        const allTags = cards.flatMap(c => c.tags || []);
        this._availableTags = [...new Set(allTags)].sort();
      }
    } catch (_) {
      this._availableTags = [];
    }
  }

  /**
   * Attach event listeners to tag checkboxes and remove buttons.
   */
  _attachTagCheckboxListeners() {
    // Existing tag checkboxes
    const checkboxes = this.container.querySelectorAll('.tag-checkbox');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) {
          this._addTag(cb.value);
        } else {
          this._removeTag(cb.value);
        }
      });
    });

    // Remove buttons on selected tag chips
    const removeButtons = this.container.querySelectorAll('.tag-remove');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this._removeTag(btn.dataset.tag);
      });
    });
  }

  /**
   * Add a tag from the text input.
   */
  _addTagFromInput() {
    const tagInput = this.container.querySelector('#tag-input');
    if (!tagInput) return;

    const value = tagInput.value.trim().replace(/,/g, '').trim();
    if (value) {
      this._addTag(value);
      tagInput.value = '';
    }
  }

  /**
   * Add a tag to the selected list and re-render tags section.
   * @param {string} tag
   */
  _addTag(tag) {
    const normalized = tag.trim();
    if (!normalized || this._selectedTags.includes(normalized)) return;

    this._selectedTags.push(normalized);

    // Add to available tags if new
    if (!this._availableTags.includes(normalized)) {
      this._availableTags.push(normalized);
      this._availableTags.sort();
    }

    this._rerenderTagsSection();
  }

  /**
   * Remove a tag from the selected list and re-render.
   * @param {string} tag
   */
  _removeTag(tag) {
    this._selectedTags = this._selectedTags.filter(t => t !== tag);
    this._rerenderTagsSection();
  }

  /**
   * Re-render just the tags section in place.
   */
  _rerenderTagsSection() {
    const tagsSection = this.container.querySelector('.section:last-of-type .form-group, .section:last-of-type');
    // Find the tags container inside the last section
    const form = this.container.querySelector('#card-form');
    if (!form) return;

    // Find the last section (tags section)
    const sections = form.querySelectorAll('.section');
    const lastSection = sections[sections.length - 1];
    if (lastSection) {
      // Replace content after the h2
      const h2 = lastSection.querySelector('h2');
      // Remove everything after h2
      while (lastSection.lastChild && lastSection.lastChild !== h2) {
        lastSection.removeChild(lastSection.lastChild);
      }
      // Insert new tags HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this._buildTagsHTML();
      while (tempDiv.firstChild) {
        lastSection.appendChild(tempDiv.firstChild);
      }
      this._attachTagCheckboxListeners();
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Shared limit management
  // ---------------------------------------------------------------------------

  /**
   * Load cards from the same bank for the shared limit dropdown.
   * Requirements: 16.1, 16.6
   * @param {string} bankName
   * @param {string|null} excludeId
   */
  async _loadSharedLimitCards(bankName, excludeId = null) {
    try {
      this._sharedLimitCards = await this.cardController.getSharedLimitCards(bankName, excludeId);
    } catch (_) {
      this._sharedLimitCards = [];
    }
  }

  /**
   * Reload the shared limit dropdown when bank changes.
   */
  async _reloadSharedLimitDropdown() {
    const excludeId = this._card ? this._card.id : null;
    await this._loadSharedLimitCards(this._detectedBank, excludeId);

    const sharedGroup = this.container.querySelector('#field-sharedLimitWith')?.closest('.form-group');
    if (sharedGroup) {
      const currentShared = this._card ? (this._card.sharedLimitWith || []) : [];
      const tempCard = currentShared.length ? { sharedLimitWith: currentShared } : null;
      sharedGroup.innerHTML = `
        <label class="form-label" for="field-sharedLimitWith">Shared Limit With <span class="form-label-optional">(optional, same bank only)</span></label>
        ${this._buildSharedLimitHTML(tempCard)}
        <span id="error-sharedLimitWith" class="form-error" role="alert" aria-live="polite"></span>
      `;
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Notification toggle
  // ---------------------------------------------------------------------------

  /**
   * Show/hide the reminder period dropdown based on notification toggle.
   * Requirement 8.2, 8.3
   */
  _toggleReminderPeriod() {
    const toggle = this.container.querySelector('#field-notificationsEnabled');
    const reminderGroup = this.container.querySelector('#reminder-period-group');
    if (!toggle || !reminderGroup) return;

    reminderGroup.style.display = toggle.checked ? '' : 'none';
    toggle.setAttribute('aria-checked', toggle.checked ? 'true' : 'false');
  }

  // ---------------------------------------------------------------------------
  // Private: Navigation and error display
  // ---------------------------------------------------------------------------

  /**
   * Navigate back to the previous page.
   */
  _navigateBack() {
    if (typeof router !== 'undefined' && router) {
      if (this._card) {
        router.navigate(`/card/${this._card.id}`);
      } else {
        router.navigate('/');
      }
    }
  }

  /**
   * Show a general error message at the top of the form.
   * @param {string} message
   */
  _showGeneralError(message) {
    let errorBanner = this.container.querySelector('#form-general-error');
    if (!errorBanner) {
      errorBanner = document.createElement('div');
      errorBanner.id = 'form-general-error';
      errorBanner.className = 'form-error-banner';
      errorBanner.setAttribute('role', 'alert');
      errorBanner.setAttribute('aria-live', 'assertive');
      const form = this.container.querySelector('#card-form');
      if (form) form.prepend(errorBanner);
    }
    errorBanner.textContent = message;
  }

  // ---------------------------------------------------------------------------
  // Private: Format helpers
  // ---------------------------------------------------------------------------

  /**
   * Format YYYY-MM to MM/YYYY for display in input fields.
   * @param {string} value - YYYY-MM
   * @returns {string} MM/YYYY
   */
  _formatExpiryForInput(value) {
    if (!value) return '';
    const match = value.match(/^(\d{4})-(\d{2})$/);
    if (match) return `${match[2]}/${match[1]}`;
    return value;
  }

  /**
   * Format YYYY-MM to MM/YY for card preview display.
   * @param {string} value - YYYY-MM
   * @returns {string} MM/YY
   */
  _formatExpiryForDisplay(value) {
    if (!value) return 'MM/YY';
    const match = value.match(/^(\d{4})-(\d{2})$/);
    if (match) return `${match[2]}/${match[1].slice(-2)}`;
    return value;
  }

  /**
   * Parse MM/YYYY input to YYYY-MM storage format.
   * @param {string} value - MM/YYYY
   * @returns {string|null} YYYY-MM or null if invalid
   */
  _parseExpiryToStorage(value) {
    if (!value) return null;
    const match = value.match(/^(\d{1,2})\/(\d{4})$/);
    if (match) {
      const month = match[1].padStart(2, '0');
      return `${match[2]}-${month}`;
    }
    // Already in YYYY-MM format
    if (value.match(/^\d{4}-\d{2}$/)) return value;
    return null;
  }

  /**
   * Format a card number with spaces for display in the input.
   * @param {string} number
   * @returns {string}
   */
  _formatCardNumberDisplay(number) {
    if (!number) return '';
    const digits = String(number).replace(/\D/g, '');
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  /**
   * Get bank color from detector service.
   * @param {string} bank
   * @returns {string}
   */
  _getBankColor(bank) {
    if (this.detector) return this.detector.getBankColor(bank || 'Unknown');
    if (typeof detectorService !== 'undefined') return detectorService.getBankColor(bank || 'Unknown');
    return '#64748b';
  }

  /**
   * Get network logo path.
   * @param {string} network
   * @returns {string}
   */
  _getNetworkLogo(network) {
    if (this.detector) return this.detector.getNetworkLogo(network || 'Unknown');
    if (typeof detectorService !== 'undefined') return detectorService.getNetworkLogo(network || 'Unknown');
    return 'assets/icons/placeholder.png';
  }

  /**
   * Get bank logo path.
   * @param {string} bank
   * @returns {string}
   */
  _getBankLogo(bank) {
    if (this.detector) return this.detector.getBankLogo(bank || 'Unknown');
    if (typeof detectorService !== 'undefined') return detectorService.getBankLogo(bank || 'Unknown');
    return 'assets/icons/placeholder.png';
  }

  /**
   * Escape HTML special characters to prevent XSS.
   * Requirement 19.4
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

// ES module export
export { CardFormView };

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardFormView };
}

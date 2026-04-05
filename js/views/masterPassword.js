/**
 * Master Password View
 * Handles first-time setup and login authentication modals
 * Requirements: 15.1, 15.4, 15.5, 15.6, 19.8
 */

const SALT_KEY = 'cm_salt';
const ATTEMPTS_KEY = 'passwordAttempts';
const LOCKOUT_KEY = 'lockoutUntil';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

class MasterPasswordView {
  /**
   * @param {HTMLElement} container - DOM element to render the overlay into
   * @param {EncryptionService} encryptionService
   */
  constructor(container, encryptionService) {
    this.container = container;
    this.encryptionService = encryptionService;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Render the appropriate modal based on whether a master password has been set.
   * Requirement 15.1
   */
  render() {
    const isFirstTime = !localStorage.getItem(SALT_KEY);
    const overlay = document.createElement('div');
    overlay.id = 'master-password-overlay';
    overlay.className = 'mp-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'mp-modal-title');

    overlay.innerHTML = isFirstTime
      ? this._buildSetupHTML()
      : this._buildLoginHTML();

    // Remove any existing overlay first
    const existing = document.getElementById('master-password-overlay');
    if (existing) existing.remove();

    document.body.appendChild(overlay);

    if (isFirstTime) {
      this._attachSetupListeners(overlay);
    } else {
      this._attachLoginListeners(overlay);
    }
  }

  /**
   * Remove the overlay from the DOM (called after successful auth).
   */
  dismiss() {
    const overlay = document.getElementById('master-password-overlay');
    if (overlay) overlay.remove();
  }

  // ---------------------------------------------------------------------------
  // Private: HTML builders
  // ---------------------------------------------------------------------------

  _buildSetupHTML() {
    return `
      <div class="mp-modal" role="document">
        <div class="mp-modal-icon" aria-hidden="true">🔐</div>
        <h1 id="mp-modal-title" class="mp-modal-title">Set Up Master Password</h1>
        <p class="mp-modal-desc">
          Create a master password to encrypt your card data. This password cannot be recovered — keep it safe.
        </p>

        <div class="form-group">
          <label for="mp-password" class="form-label">
            Master Password <span class="required" aria-hidden="true">*</span>
          </label>
          <input
            id="mp-password"
            type="password"
            class="form-input"
            autocomplete="new-password"
            placeholder="Enter a strong password"
            aria-required="true"
            aria-describedby="mp-strength-text"
          />
          <div id="mp-strength-bar-wrap" class="mp-strength-bar-wrap" aria-hidden="true">
            <div id="mp-strength-bar" class="mp-strength-bar"></div>
          </div>
          <span id="mp-strength-text" class="mp-strength-label" aria-live="polite"></span>
        </div>

        <div class="form-group" style="margin-top: var(--spacing-md);">
          <label for="mp-confirm" class="form-label">
            Confirm Password <span class="required" aria-hidden="true">*</span>
          </label>
          <input
            id="mp-confirm"
            type="password"
            class="form-input"
            autocomplete="new-password"
            placeholder="Repeat your password"
            aria-required="true"
          />
        </div>

        <span id="mp-setup-error" class="form-error mp-error" role="alert" style="display:none;"></span>

        <button id="mp-setup-btn" class="btn btn-primary btn-block" type="button" style="margin-top: var(--spacing-lg);">
          Create Password &amp; Continue
        </button>
      </div>
    `;
  }

  _buildLoginHTML() {
    return `
      <div class="mp-modal" role="document">
        <div class="mp-modal-icon" aria-hidden="true">🔒</div>
        <h1 id="mp-modal-title" class="mp-modal-title">Welcome Back</h1>
        <p class="mp-modal-desc">Enter your master password to unlock your cards.</p>

        <div class="form-group">
          <label for="mp-login-password" class="form-label">
            Master Password <span class="required" aria-hidden="true">*</span>
          </label>
          <input
            id="mp-login-password"
            type="password"
            class="form-input"
            autocomplete="current-password"
            placeholder="Enter your master password"
            aria-required="true"
            aria-describedby="mp-login-error mp-lockout-msg"
          />
        </div>

        <span id="mp-login-error" class="form-error mp-error" role="alert" style="display:none;"></span>
        <div id="mp-lockout-msg" class="mp-lockout-msg" role="alert" style="display:none;"></div>

        <button id="mp-login-btn" class="btn btn-primary btn-block" type="button" style="margin-top: var(--spacing-lg);">
          Unlock
        </button>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Private: Setup listeners
  // ---------------------------------------------------------------------------

  _attachSetupListeners(overlay) {
    const passwordInput = overlay.querySelector('#mp-password');
    const confirmInput = overlay.querySelector('#mp-confirm');
    const submitBtn = overlay.querySelector('#mp-setup-btn');
    const errorEl = overlay.querySelector('#mp-setup-error');

    // Live strength indicator
    passwordInput.addEventListener('input', () => {
      this._updateStrengthIndicator(overlay, passwordInput.value);
    });

    // Submit on Enter in confirm field
    confirmInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitBtn.click();
    });

    submitBtn.addEventListener('click', async () => {
      const password = passwordInput.value;
      const confirm = confirmInput.value;

      this._hideError(errorEl);

      if (!password) {
        this._showError(errorEl, 'Please enter a master password.');
        passwordInput.focus();
        return;
      }
      if (password.length < 8) {
        this._showError(errorEl, 'Password must be at least 8 characters.');
        passwordInput.focus();
        return;
      }
      if (password !== confirm) {
        this._showError(errorEl, 'Passwords do not match.');
        confirmInput.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');

      try {
        await this.encryptionService.initializeMasterPassword(password);
        document.dispatchEvent(new CustomEvent('password-set'));
        this.dismiss();
      } catch (err) {
        this._showError(errorEl, err.message || 'Failed to set up password. Please try again.');
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');
      }
    });

    // Auto-focus
    passwordInput.focus();
  }

  // ---------------------------------------------------------------------------
  // Private: Login listeners
  // ---------------------------------------------------------------------------

  _attachLoginListeners(overlay) {
    const passwordInput = overlay.querySelector('#mp-login-password');
    const submitBtn = overlay.querySelector('#mp-login-btn');
    const errorEl = overlay.querySelector('#mp-login-error');
    const lockoutEl = overlay.querySelector('#mp-lockout-msg');

    // Check lockout state on render
    this._checkAndShowLockout(overlay, submitBtn, passwordInput, lockoutEl);

    // Submit on Enter
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitBtn.click();
    });

    submitBtn.addEventListener('click', async () => {
      this._hideError(errorEl);

      // Re-check lockout before attempting
      if (this._isLockedOut()) {
        this._checkAndShowLockout(overlay, submitBtn, passwordInput, lockoutEl);
        return;
      }

      const password = passwordInput.value;
      if (!password) {
        this._showError(errorEl, 'Please enter your master password.');
        passwordInput.focus();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add('is-loading');

      try {
        await this.encryptionService.verifyMasterPassword(password);

        // Reset attempts on success
        sessionStorage.removeItem(ATTEMPTS_KEY);
        sessionStorage.removeItem(LOCKOUT_KEY);

        document.dispatchEvent(new CustomEvent('password-verified'));
        this.dismiss();
      } catch {
        submitBtn.disabled = false;
        submitBtn.classList.remove('is-loading');

        // Increment attempts (Req 19.8)
        const attempts = this._incrementAttempts();
        const remaining = MAX_ATTEMPTS - attempts;

        if (attempts >= MAX_ATTEMPTS) {
          // Trigger lockout
          const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
          sessionStorage.setItem(LOCKOUT_KEY, String(lockoutUntil));
          this._checkAndShowLockout(overlay, submitBtn, passwordInput, lockoutEl);
        } else {
          this._showError(
            errorEl,
            `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
          );
          passwordInput.value = '';
          passwordInput.focus();
        }
      }
    });

    // Auto-focus
    passwordInput.focus();
  }

  // ---------------------------------------------------------------------------
  // Private: Rate limiting helpers (Req 19.8)
  // ---------------------------------------------------------------------------

  _isLockedOut() {
    const lockoutUntil = sessionStorage.getItem(LOCKOUT_KEY);
    if (!lockoutUntil) return false;
    return Date.now() < Number(lockoutUntil);
  }

  _getLockoutRemainingMs() {
    const lockoutUntil = sessionStorage.getItem(LOCKOUT_KEY);
    if (!lockoutUntil) return 0;
    return Math.max(0, Number(lockoutUntil) - Date.now());
  }

  _incrementAttempts() {
    const current = parseInt(sessionStorage.getItem(ATTEMPTS_KEY) || '0', 10);
    const next = current + 1;
    sessionStorage.setItem(ATTEMPTS_KEY, String(next));
    return next;
  }

  _checkAndShowLockout(overlay, submitBtn, passwordInput, lockoutEl) {
    if (!this._isLockedOut()) return;

    const remainingMs = this._getLockoutRemainingMs();
    const remainingMin = Math.ceil(remainingMs / 60000);

    lockoutEl.textContent = `Too many failed attempts. Please wait ${remainingMin} minute${remainingMin === 1 ? '' : 's'} before trying again.`;
    lockoutEl.style.display = 'block';

    submitBtn.disabled = true;
    passwordInput.disabled = true;

    // Auto-refresh countdown every second
    const interval = setInterval(() => {
      if (!this._isLockedOut()) {
        clearInterval(interval);
        lockoutEl.style.display = 'none';
        submitBtn.disabled = false;
        passwordInput.disabled = false;
        passwordInput.focus();
        sessionStorage.removeItem(LOCKOUT_KEY);
        sessionStorage.removeItem(ATTEMPTS_KEY);
      } else {
        const ms = this._getLockoutRemainingMs();
        const min = Math.ceil(ms / 60000);
        lockoutEl.textContent = `Too many failed attempts. Please wait ${min} minute${min === 1 ? '' : 's'} before trying again.`;
      }
    }, 1000);
  }

  // ---------------------------------------------------------------------------
  // Private: Password strength indicator
  // ---------------------------------------------------------------------------

  /**
   * Evaluate password strength and update the indicator.
   * Levels: weak (< 8 chars or only one char type), fair (8+ chars, 2 types), strong (8+ chars, 3+ types)
   */
  _updateStrengthIndicator(overlay, password) {
    const bar = overlay.querySelector('#mp-strength-bar');
    const label = overlay.querySelector('#mp-strength-text');
    if (!bar || !label) return;

    if (!password) {
      bar.style.width = '0%';
      bar.className = 'mp-strength-bar';
      label.textContent = '';
      return;
    }

    const score = this._scorePassword(password);
    const levels = [
      { min: 0, max: 1, label: 'Weak', cls: 'mp-strength-weak', width: '33%' },
      { min: 2, max: 2, label: 'Fair', cls: 'mp-strength-fair', width: '66%' },
      { min: 3, max: 4, label: 'Strong', cls: 'mp-strength-strong', width: '100%' },
    ];

    const level = levels.find(l => score >= l.min && score <= l.max) || levels[0];
    bar.style.width = level.width;
    bar.className = `mp-strength-bar ${level.cls}`;
    label.textContent = level.label;
    label.className = `mp-strength-label mp-strength-label-${level.cls.replace('mp-strength-', '')}`;
  }

  /**
   * Score a password 0-4 based on length and character variety.
   * @param {string} password
   * @returns {number}
   */
  _scorePassword(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    // Clamp to 0-4
    return Math.min(4, score);
  }

  // ---------------------------------------------------------------------------
  // Private: Error helpers
  // ---------------------------------------------------------------------------

  _showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.style.display = 'flex';
  }

  _hideError(el) {
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MasterPasswordView };
}

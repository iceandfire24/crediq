/**
 * About View
 * Application information, version, links, and Getting Started guide
 * Requirements: 14.1, 14.2, 14.3, 14.4, 20.4
 */

const APP_VERSION = '1.0.0';

class AboutView {
  /**
   * @param {HTMLElement} container - DOM element to render into
   */
  constructor(container) {
    this.container = container;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Render the about page.
   * Requirements: 14.1, 14.2, 14.3, 14.4, 20.4
   */
  render() {
    this.container.innerHTML = this._buildPageHTML();
    this._attachEventListeners();
  }

  // ---------------------------------------------------------------------------
  // Private: HTML builders
  // ---------------------------------------------------------------------------

  _buildPageHTML() {
    return `
      <div class="page-container">
        <div class="page-header">
          <h1 class="page-title">About</h1>
        </div>

        ${this._buildAppInfoSection()}
        ${this._buildFeaturesSection()}
        ${this._buildGettingStartedSection()}
        ${this._buildLinksSection()}
      </div>
    `;
  }

  /** Req 14.1, 14.2 — app name and version */
  _buildAppInfoSection() {
    return `
      <section class="section" aria-labelledby="app-info-heading">
        <div style="text-align:center;padding:var(--spacing-lg) 0;">
          <div style="font-size:3rem;margin-bottom:var(--spacing-sm);" aria-hidden="true">💳</div>
          <h2 id="app-info-heading" style="font-size:var(--text-2xl);font-weight:700;
            margin:0 0 var(--spacing-xs);">Card Manager</h2>
          <p id="app-version" style="color:var(--text-secondary);font-size:var(--text-sm);">
            Version ${this._esc(APP_VERSION)}
          </p>
          <p style="color:var(--text-secondary);margin-top:var(--spacing-sm);
            max-width:480px;margin-left:auto;margin-right:auto;">
            An offline-first application for securely managing your credit and debit card
            information — entirely in your browser, with no data ever leaving your device.
          </p>
        </div>
      </section>
    `;
  }

  /** Req 14.1 — feature list */
  _buildFeaturesSection() {
    const features = [
      { icon: '🔒', label: 'Client-side encryption', desc: 'Card numbers and CVVs are encrypted using AES-GCM 256-bit via the Web Crypto API.' },
      { icon: '📴', label: 'Offline-first', desc: 'All data is stored locally in your browser. No internet connection required.' },
      { icon: '🔔', label: 'Payment reminders', desc: 'Get notified before bill due dates based on your statement cycle.' },
      { icon: '📊', label: 'Statistics', desc: 'Track total cards, annual fees, credit limits, and average card age.' },
      { icon: '📅', label: 'Calendar view', desc: 'Visualise statement and due dates across all your cards.' },
      { icon: '📤', label: 'Export & import', desc: 'Back up your data as an encrypted file and restore it on any device.' },
      { icon: '🎨', label: 'Themes & customisation', desc: 'Switch between light and dark themes and customise bank colours.' },
    ];

    const items = features.map(f => `
      <li style="display:flex;gap:var(--spacing-md);align-items:flex-start;
        padding:var(--spacing-sm) 0;border-bottom:1px solid var(--border);">
        <span style="font-size:1.5rem;flex-shrink:0;" aria-hidden="true">${f.icon}</span>
        <div>
          <strong style="display:block;margin-bottom:2px;">${this._esc(f.label)}</strong>
          <span style="color:var(--text-secondary);font-size:var(--text-sm);">${this._esc(f.desc)}</span>
        </div>
      </li>
    `).join('');

    return `
      <section class="section" aria-labelledby="features-heading">
        <h2 id="features-heading" class="section-title">Features</h2>
        <ul style="list-style:none;padding:0;margin:0;" aria-label="Application features">
          ${items}
        </ul>
      </section>
    `;
  }

  /** Req 20.4 — Getting Started guide */
  _buildGettingStartedSection() {
    const steps = [
      { n: 1, title: 'Set a master password', desc: 'On first launch you\'ll be prompted to create a master password. This is used to encrypt your card numbers and CVVs.' },
      { n: 2, title: 'Add your first card', desc: 'Tap the + button in the navigation bar. Fill in the required fields (name, number, CVV, expiry) and save.' },
      { n: 3, title: 'Enable payment reminders', desc: 'When adding or editing a card, toggle "Enable Notifications" and choose how many days before the due date you want to be reminded.' },
      { n: 4, title: 'Back up your data', desc: 'Go to Settings → Export Data and save an encrypted backup file. Store it somewhere safe.' },
      { n: 5, title: 'Explore statistics & calendar', desc: 'Use the Statistics and Calendar views to get an overview of your card portfolio and upcoming payment dates.' },
    ];

    const items = steps.map(s => `
      <li style="display:flex;gap:var(--spacing-md);align-items:flex-start;
        padding:var(--spacing-sm) 0;border-bottom:1px solid var(--border);">
        <span style="flex-shrink:0;width:28px;height:28px;border-radius:50%;
          background:var(--primary);color:#fff;display:flex;align-items:center;
          justify-content:center;font-weight:700;font-size:var(--text-sm);"
          aria-hidden="true">${s.n}</span>
        <div>
          <strong style="display:block;margin-bottom:2px;">${this._esc(s.title)}</strong>
          <span style="color:var(--text-secondary);font-size:var(--text-sm);">${this._esc(s.desc)}</span>
        </div>
      </li>
    `).join('');

    return `
      <section class="section" aria-labelledby="getting-started-heading">
        <h2 id="getting-started-heading" class="section-title">Getting Started</h2>
        <ol style="list-style:none;padding:0;margin:0;" aria-label="Getting started steps">
          ${items}
        </ol>
      </section>
    `;
  }

  /** Req 14.3, 14.4 — bug report and documentation links */
  _buildLinksSection() {
    return `
      <section class="section" aria-labelledby="links-heading">
        <h2 id="links-heading" class="section-title">Links</h2>
        <div style="display:flex;flex-direction:column;gap:var(--spacing-sm);">
          <a id="link-bug-report" href="https://github.com/card-manager/issues/new" target="_blank"
            rel="noopener noreferrer" class="btn btn-secondary"
            style="display:inline-flex;align-items:center;gap:var(--spacing-xs);width:fit-content;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Report a Bug
          </a>
          <a id="link-docs" href="https://github.com/card-manager/wiki" target="_blank"
            rel="noopener noreferrer" class="btn btn-secondary"
            style="display:inline-flex;align-items:center;gap:var(--spacing-xs);width:fit-content;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
            View Documentation
          </a>
          <a id="link-privacy" href="#/about/privacy" class="btn btn-secondary"
            style="display:inline-flex;align-items:center;gap:var(--spacing-xs);width:fit-content;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            Privacy Policy
          </a>
        </div>

        <p style="margin-top:var(--spacing-xl);text-align:center;
          color:var(--text-secondary);font-size:var(--text-sm);">
          Made with ❤️ for learning · MIT License
        </p>
      </section>
    `;
  }

  // ---------------------------------------------------------------------------
  // Private: Event listeners
  // ---------------------------------------------------------------------------

  _attachEventListeners() {
    // Privacy policy link — handled in-app if router is available
    const privacyLink = this.container.querySelector('#link-privacy');
    if (privacyLink && typeof router !== 'undefined') {
      privacyLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Future: router.navigate('/about/privacy');
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Private: Helpers
  // ---------------------------------------------------------------------------

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
  module.exports = { AboutView, APP_VERSION };
}

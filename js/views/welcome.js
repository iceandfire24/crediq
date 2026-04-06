/**
 * Welcome Tutorial View
 * First-run experience with multi-step modal and demo data loading
 * Requirements: 20.1, 20.2, 20.6
 */

const WELCOMED_KEY = 'cardmanager_welcomed';

const DEMO_CARDS = [
  {
    name: 'HDFC Regalia',
    number: '4111111111111111',
    cvv: '123',
    expiry: '2027-12',
    bank: 'HDFC Bank',
    network: 'Visa',
    creditLimit: 500000,
    annualFee: 2500,
    statementDate: 5,
    dueDate: 25,
    notificationsEnabled: true,
    reminderPeriod: 3,
    tags: ['travel', 'rewards'],
    sharedLimitWith: [],
  },
  {
    name: 'ICICI Amazon Pay',
    number: '5500005555555559',
    cvv: '456',
    expiry: '2026-08',
    bank: 'ICICI Bank',
    network: 'Mastercard',
    creditLimit: 200000,
    annualFee: 0,
    statementDate: 15,
    dueDate: 5,
    notificationsEnabled: true,
    reminderPeriod: 7,
    tags: ['shopping', 'cashback'],
    sharedLimitWith: [],
  },
  {
    name: 'Axis Magnus',
    number: '3714496353984312',
    cvv: '7890',
    expiry: '2028-03',
    bank: 'Axis Bank',
    network: 'Amex',
    creditLimit: 1000000,
    annualFee: 12500,
    statementDate: 20,
    dueDate: 10,
    notificationsEnabled: false,
    reminderPeriod: 3,
    tags: ['premium', 'travel'],
    sharedLimitWith: [],
  },
];

const STEPS = [
  {
    icon: '💳',
    title: 'Welcome to Card Manager',
    body: 'Keep all your credit and debit cards organised in one secure, offline-first app. Your data never leaves your device.',
  },
  {
    icon: '➕',
    title: 'Adding Cards',
    body: 'Tap "Add Card" to save a new card. The app auto-detects the network (Visa, Mastercard, Amex…) and your bank as you type the card number.',
  },
  {
    icon: '🔒',
    title: 'Security & Encryption',
    body: 'All sensitive data (card numbers, CVVs) is encrypted with your master password using AES-256-GCM. Only you can decrypt it.',
  },
  {
    icon: '📤',
    title: 'Export & Backup',
    body: 'Use Settings → Export to create an encrypted backup file. Import it on any device to restore your cards. Keep backups safe!',
  },
];

/**
 * Returns true if the user has not yet seen the welcome tutorial.
 * @returns {boolean}
 */
function isFirstRun() {
  try {
    return localStorage.getItem(WELCOMED_KEY) !== '1';
  } catch {
    return false;
  }
}

/**
 * Mark the welcome tutorial as seen.
 */
function markWelcomed() {
  try {
    localStorage.setItem(WELCOMED_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

/**
 * Show the multi-step welcome modal.
 * @param {Object} [cardStore] - Optional CardStore instance for loading demo data
 */
function showWelcome(cardStore) {
  // Remove any existing welcome overlay
  _removeOverlay();

  let currentStep = 0;

  const overlay = document.createElement('div');
  overlay.id = 'welcome-overlay';
  overlay.className = 'welcome-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'welcome-title');

  function render() {
    const step = STEPS[currentStep];
    const isLast = currentStep === STEPS.length - 1;
    const isFirst = currentStep === 0;

    overlay.innerHTML = `
      <div class="welcome-modal">
        <button class="modal-close" id="welcome-close" aria-label="Close welcome tutorial" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <div class="welcome-step" role="region" aria-live="polite">
          <div class="welcome-icon" aria-hidden="true">${step.icon}</div>
          <h2 id="welcome-title" class="welcome-title">${_esc(step.title)}</h2>
          <p class="welcome-body">${_esc(step.body)}</p>
        </div>

        <div class="welcome-dots" aria-label="Step ${currentStep + 1} of ${STEPS.length}">
          ${STEPS.map((_, i) => `<span class="welcome-dot${i === currentStep ? ' welcome-dot-active' : ''}" aria-hidden="true"></span>`).join('')}
        </div>

        <div class="welcome-nav">
          ${!isFirst ? `<button id="welcome-back" class="btn btn-secondary btn-sm" type="button">Back</button>` : '<span></span>'}
          <div style="display:flex;gap:var(--spacing-sm);">
            ${isLast ? `<button id="welcome-demo" class="btn btn-secondary btn-sm" type="button">Try Demo</button>` : ''}
            ${isLast
              ? `<button id="welcome-start" class="btn btn-primary btn-sm" type="button">Get Started</button>`
              : `<button id="welcome-next" class="btn btn-primary btn-sm" type="button">Next</button>`
            }
          </div>
        </div>
      </div>
    `;

    // Attach listeners
    overlay.querySelector('#welcome-close').addEventListener('click', _close);

    const backBtn = overlay.querySelector('#welcome-back');
    if (backBtn) backBtn.addEventListener('click', () => { currentStep--; render(); });

    const nextBtn = overlay.querySelector('#welcome-next');
    if (nextBtn) nextBtn.addEventListener('click', () => { currentStep++; render(); });

    const startBtn = overlay.querySelector('#welcome-start');
    if (startBtn) startBtn.addEventListener('click', _close);

    const demoBtn = overlay.querySelector('#welcome-demo');
    if (demoBtn) demoBtn.addEventListener('click', _loadDemo);
  }

  function _close() {
    markWelcomed();
    _removeOverlay();
  }

  async function _loadDemo() {
    if (cardStore && typeof cardStore.addCard === 'function') {
      for (const card of DEMO_CARDS) {
        try {
          await cardStore.addCard({ ...card });
        } catch {
          // ignore individual card errors
        }
      }
    }
    _close();
    // Dispatch event so the app can refresh the card list
    document.dispatchEvent(new CustomEvent('demo-cards-loaded'));
  }

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) _close();
  });

  // Close on Escape
  const handleKeydown = (e) => {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', handleKeydown);
      _close();
    }
  };
  document.addEventListener('keydown', handleKeydown);

  render();
  document.body.appendChild(overlay);

  // Focus the modal
  const modal = overlay.querySelector('.welcome-modal');
  if (modal) modal.focus();
}

function _removeOverlay() {
  const existing = document.getElementById('welcome-overlay');
  if (existing) existing.remove();
}

function _esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ES module export
export { isFirstRun, markWelcomed, showWelcome, DEMO_CARDS, STEPS };

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { isFirstRun, markWelcomed, showWelcome, DEMO_CARDS, STEPS };
}

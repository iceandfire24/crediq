/**
 * Card Manager Application Entry Point
 * Wires all components together and manages the startup sequence.
 * Requirements: All
 */

import { CONFIG } from './config.js';
import { Router } from './router.js';

// Models (expose on window for legacy window.AppConfig references)
import { AppConfig, DEFAULT_BANK_COLORS } from './models/config.js';

// Services
import { EncryptionService } from './services/encryption.js';
import { CardStore } from './services/cardStore.js';
import { ConfigStore } from './services/configStore.js';
import { ValidatorService } from './services/validator.js';
import { DetectorService, detectorService } from './services/detector.js';
import { StatisticsService } from './services/statistics.js';

// Controllers
import { CardController } from './controllers/cardController.js';
import { SearchController } from './controllers/searchController.js';
import { ReminderController } from './controllers/reminderController.js';

// Views
import { CardListView } from './views/cardList.js';
import { CardFormView } from './views/cardForm.js';
import { CardDetailView } from './views/cardDetail.js';
import { CalendarView } from './views/calendar.js';
import { StatisticsView } from './views/statistics.js';
import { SettingsView } from './views/settings.js';
import { AboutView } from './views/about.js';
import { MasterPasswordView } from './views/masterPassword.js';
import { showWelcome, isFirstRun } from './views/welcome.js';

// Utils
import { checkBrowserCompatibility } from './utils/featureDetect.js';
import { showToast } from './utils/toast.js';
import { handleError } from './utils/errorHandler.js';

// Expose detectorService globally so views can access it via `detectorService`
window.detectorService = detectorService;

// Expose AppConfig and DEFAULT_BANK_COLORS for configStore's window.AppConfig reference
window.AppConfig = AppConfig;
window.DEFAULT_BANK_COLORS = DEFAULT_BANK_COLORS;

class App {
  constructor() {
    this.initialized = false;

    // Services
    this.encryptionService = new EncryptionService();
    this.configStore = new ConfigStore();
    this.cardStore = new CardStore(this.encryptionService);
    this.validator = new ValidatorService();
    this.detector = detectorService;
    this.statisticsService = new StatisticsService(this.cardStore);

    // Wire statistics cache invalidation into cardStore
    this.cardStore.statisticsService = this.statisticsService;

    // Controllers
    this.cardController = new CardController(this.cardStore, this.validator, this.detector);
    this.searchController = new SearchController();
    this.reminderController = new ReminderController(this.cardStore);

    // Router (created after auth)
    this.router = null;

    // Main content container
    this.appContainer = null;
  }

  // ---------------------------------------------------------------------------
  // Startup sequence
  // ---------------------------------------------------------------------------

  async init() {
    if (this.initialized) return;

    // Step 1: Detect required browser features — abort if missing
    if (!checkBrowserCompatibility()) {
      return;
    }

    // Step 2: Load and apply saved theme
    this._applyTheme();

    // Step 3: Load and apply saved date format (stored in configStore; views read it on render)
    this._applyDateFormat();

    // Step 4: Show master password flow (setup or login)
    await this._initMasterPassword();

    // Step 5: Initialize router and register all routes
    this._initRouter();

    // Step 6: Listen for card mutation events to refresh the current view
    this._attachCardEventListeners();

    // Step 7: Set up global error handlers
    this._setupErrorHandlers();

    // Step 8: Show welcome tutorial on first run
    if (isFirstRun()) {
      showWelcome(this.cardStore);
    }

    // Step 9: Start the router — navigates to current hash or default #/cards
    this.router.start();

    this.initialized = true;

    if (CONFIG.DEBUG) {
      console.log(`Card Manager v${CONFIG.VERSION} initialized`);
    }
  }

  // ---------------------------------------------------------------------------
  // Theme & date format
  // ---------------------------------------------------------------------------

  _applyTheme() {
    const theme = this.configStore.getTheme();
    document.documentElement.dataset.theme = theme;
  }

  _applyDateFormat() {
    // Date format is read by views via configStore on each render.
    // Store it on window so legacy inline references can access it if needed.
    window.appDateFormat = this.configStore.getDateFormat();
  }

  // ---------------------------------------------------------------------------
  // Master password flow
  // ---------------------------------------------------------------------------

  async _initMasterPassword() {
    // If already authenticated this session, skip
    const existingKey = await this.encryptionService.getKeyFromSession();
    if (existingKey) return;

    return new Promise((resolve) => {
      const mpView = new MasterPasswordView(document.body, this.encryptionService);
      mpView.render();

      const onAuth = () => {
        document.removeEventListener('password-set', onAuth);
        document.removeEventListener('password-verified', onAuth);
        resolve();
      };

      document.addEventListener('password-set', onAuth, { once: true });
      document.addEventListener('password-verified', onAuth, { once: true });
    });
  }

  // ---------------------------------------------------------------------------
  // Router setup
  // ---------------------------------------------------------------------------

  _initRouter() {
    this.router = new Router();

    // Expose router globally so views can call router.navigate(...)
    window.router = this.router;

    const container = this._getContainer();

    // #/cards — card list (default view)
    this.router.register('/cards', async () => {
      try {
        const cards = await this.cardController.getAllCards();
        const view = new CardListView(container, this.cardController, this.searchController, this.reminderController);
        await view.render(cards);
        this._renderNav('cards');
      } catch (err) {
        handleError(err, 'CardListView');
      }
    });

    // #/add — add card form
    this.router.register('/add', async () => {
      try {
        const view = new CardFormView(container, this.cardController, this.validator, this.detector);
        await view.render(null);
        this._renderNav('add');
      } catch (err) {
        handleError(err, 'CardFormView(add)');
      }
    });

    // #/card/:id — card detail
    this.router.register('/card/:id', async ({ id }) => {
      try {
        const view = new CardDetailView(container, this.cardController, this.encryptionService);
        await view.render(id);
        this._renderNav('cards');
      } catch (err) {
        handleError(err, 'CardDetailView');
      }
    });

    // #/edit/:id — edit card form
    this.router.register('/edit/:id', async ({ id }) => {
      try {
        const card = await this.cardController.getCardById(id);
        const view = new CardFormView(container, this.cardController, this.validator, this.detector);
        await view.render(card);
        this._renderNav('cards');
      } catch (err) {
        handleError(err, 'CardFormView(edit)');
      }
    });

    // #/calendar — calendar view
    this.router.register('/calendar', async () => {
      try {
        const view = new CalendarView(container, this.reminderController);
        await view.render();
        this._renderNav('calendar');
      } catch (err) {
        handleError(err, 'CalendarView');
      }
    });

    // #/stats — statistics view
    this.router.register('/stats', async () => {
      try {
        const view = new StatisticsView(container, this.statisticsService);
        await view.render();
        this._renderNav('stats');
      } catch (err) {
        handleError(err, 'StatisticsView');
      }
    });

    // #/settings — settings view
    this.router.register('/settings', () => {
      try {
        const view = new SettingsView(container, this.configStore, this.encryptionService, this.cardStore);
        view.render();
        this._renderNav('settings');
      } catch (err) {
        handleError(err, 'SettingsView');
      }
    });

    // #/about — about view
    this.router.register('/about', () => {
      try {
        const view = new AboutView(container);
        view.render();
        this._renderNav('about');
      } catch (err) {
        handleError(err, 'AboutView');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Card event listeners (refresh current view on mutations)
  // ---------------------------------------------------------------------------

  _attachCardEventListeners() {
    const refreshCardList = async () => {
      const hash = window.location.hash || '#/cards';
      if (hash === '#/cards' || hash === '#/' || hash === '#') {
        try {
          const container = this._getContainer();
          const cards = await this.cardController.getAllCards();
          const view = new CardListView(container, this.cardController, this.searchController, this.reminderController);
          await view.render(cards);
        } catch (err) {
          handleError(err, 'refreshCardList');
        }
      }
    };

    document.addEventListener('card-added', () => {
      showToast('Card added successfully', 'success');
      this.router.navigate('/cards');
    });

    document.addEventListener('card-updated', () => {
      showToast('Card updated successfully', 'success');
      this.router.navigate('/cards');
    });

    document.addEventListener('card-deleted', () => {
      showToast('Card deleted', 'success');
      this.router.navigate('/cards');
    });

    document.addEventListener('cards-imported', () => {
      this.router.navigate('/cards');
    });

    document.addEventListener('demo-cards-loaded', () => {
      this.router.navigate('/cards');
    });

    // Theme changes: apply immediately
    document.addEventListener('theme-changed', (e) => {
      const theme = e.detail && e.detail.theme;
      if (theme) {
        document.documentElement.dataset.theme = theme;
      }
    });

    // Date format changes: update window reference
    document.addEventListener('date-format-changed', (e) => {
      const format = e.detail && e.detail.format;
      if (format) {
        window.appDateFormat = format;
      }
    });

    // Export prompt: suggest the user export their data
    document.addEventListener('export-prompt', () => {
      showToast('You have 5+ cards — consider exporting a backup in Settings.', 'info', 6000);
    });
  }

  // ---------------------------------------------------------------------------
  // Navigation bar
  // ---------------------------------------------------------------------------

  _renderNav(activeRoute) {
    const nav = document.getElementById('navigation');
    if (!nav) return;

    const links = [
      { route: 'cards',    hash: '#/cards',    label: 'Cards',      icon: this._iconCards() },
      { route: 'add',      hash: '#/add',       label: 'Add',        icon: this._iconAdd() },
      { route: 'calendar', hash: '#/calendar',  label: 'Calendar',   icon: this._iconCalendar() },
      { route: 'stats',    hash: '#/stats',     label: 'Stats',      icon: this._iconStats() },
      { route: 'settings', hash: '#/settings',  label: 'Settings',   icon: this._iconSettings() },
    ];

    nav.innerHTML = `
      <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
        ${links.map(l => `
          <a href="${l.hash}"
            class="nav-item${activeRoute === l.route ? ' nav-item-active' : ''}"
            aria-label="${l.label}"
            aria-current="${activeRoute === l.route ? 'page' : 'false'}">
            ${l.icon}
            <span class="nav-label">${l.label}</span>
          </a>
        `).join('')}
      </nav>
    `;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  _getContainer() {
    if (!this.appContainer) {
      this.appContainer = document.getElementById('main-content');
      if (!this.appContainer) {
        // Fallback: use #app or body
        this.appContainer = document.getElementById('app') || document.body;
      }
    }
    return this.appContainer;
  }

  _setupErrorHandlers() {
    window.addEventListener('error', (event) => {
      if (CONFIG.DEBUG) {
        console.error('Global error:', event.error);
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (CONFIG.DEBUG) {
        console.error('Unhandled promise rejection:', event.reason);
      }
    });

    // Show HTTP security warning if not on HTTPS (Req 19.9)
    const { protocol, hostname } = location;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (protocol !== 'https:' && !isLocalhost) {
      const banner = document.createElement('div');
      banner.id = 'http-security-warning';
      banner.setAttribute('role', 'alert');
      banner.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:9999',
        'background:#b91c1c', 'color:#fff', 'padding:10px 16px',
        'display:flex', 'align-items:center', 'justify-content:space-between',
        'gap:12px', 'font-size:14px', 'line-height:1.4'
      ].join(';');

      const msg = document.createElement('span');
      msg.textContent = '⚠️ Security Warning: This app is running over HTTP. Your data may be at risk. Please use HTTPS.';

      const dismiss = document.createElement('button');
      dismiss.type = 'button';
      dismiss.textContent = '✕';
      dismiss.setAttribute('aria-label', 'Dismiss security warning');
      dismiss.style.cssText = [
        'background:transparent', 'border:1px solid rgba(255,255,255,0.6)',
        'color:#fff', 'cursor:pointer', 'padding:2px 8px',
        'border-radius:4px', 'font-size:14px', 'flex-shrink:0'
      ].join(';');
      dismiss.addEventListener('click', () => banner.remove());

      banner.appendChild(msg);
      banner.appendChild(dismiss);
      document.body.prepend(banner);
    }
  }

  // ---------------------------------------------------------------------------
  // Nav icons (inline SVG)
  // ---------------------------------------------------------------------------

  _iconCards() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>`;
  }

  _iconAdd() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>`;
  }

  _iconCalendar() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`;
  }

  _iconStats() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`;
  }

  _iconSettings() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`;
  }
}

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch((err) => {
    console.error('Fatal: failed to initialize Card Manager', err);
  });
});

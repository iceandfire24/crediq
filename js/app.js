/**
 * Card Manager Application Entry Point
 * Initializes the application and sets up core functionality
 */

import { CONFIG } from './config.js';
import { EncryptionService } from './services/encryption.js';
import { MasterPasswordView } from './views/masterPassword.js';

class App {
  constructor() {
    this.initialized = false;
    this.encryptionService = new EncryptionService();
    this.masterPasswordView = null;
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;

    console.log(`Card Manager v${CONFIG.VERSION} starting...`);

    try {
      // Load saved theme
      this.loadTheme();

      // Show HTTP security warning if not on HTTPS (Req 19.9)
      this.checkHTTPSecurity();

      // Set up global error handlers
      this.setupErrorHandlers();

      // Initialize master password flow (Req 15.1, 15.4, 15.5, 15.6)
      await this.initMasterPassword();

      this.initialized = true;
      console.log('Card Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
    }
  }

  /**
   * Show master password modal and wait for authentication.
   * Requirements: 15.1, 15.4, 15.5, 15.6
   */
  async initMasterPassword() {
    // Check if already authenticated this session
    const key = await this.encryptionService.getKeyFromSession();
    if (key) return; // Already unlocked in this session

    return new Promise((resolve) => {
      this.masterPasswordView = new MasterPasswordView(document.body, this.encryptionService);
      this.masterPasswordView.render();

      // First-time setup complete
      document.addEventListener('password-set', () => {
        console.log('Master password set. App ready.');
        resolve();
      }, { once: true });

      // Returning user authenticated
      document.addEventListener('password-verified', () => {
        console.log('Master password verified. App ready.');
        resolve();
      }, { once: true });
    });
  }

  /**
   * Load and apply saved theme preference
   */
  loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  /**
   * Show a security warning banner if the app is accessed over HTTP.
   * Requirement 19.9
   */
  checkHTTPSecurity() {
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

  /**
   * Set up global error handlers
   */
  setupErrorHandlers() {
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
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});

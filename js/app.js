/**
 * Card Manager Application Entry Point
 * Initializes the application and sets up core functionality
 */

import { CONFIG } from './config.js';

class App {
  constructor() {
    this.initialized = false;
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

      // Initialize router (will be implemented later)
      // this.initRouter();

      // Set up global error handlers
      this.setupErrorHandlers();

      this.initialized = true;
      console.log('Card Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
    }
  }

  /**
   * Load and apply saved theme preference
   */
  loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
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

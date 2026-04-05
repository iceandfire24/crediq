# Implementation Plan: Offline-First Card Manager

## Overview

This implementation plan breaks down the Card Manager application into incremental coding tasks. Each task builds on previous work, starting with foundational setup and progressing through data models, services, UI components, and feature integration. The application uses vanilla JavaScript, HTML5, and CSS3 with no build tools required.

## Tasks

- [x] 1. Project setup and file structure
  - Create the project directory structure (css/, js/, assets/, data/ folders)
  - Create index.html with semantic HTML5 structure and navigation placeholders
  - Create main.css with CSS custom properties for light/dark themes
  - Create app.js as the application entry point
  - Create config.js with environment-specific settings (app version, debug mode, etc.)
  - _Requirements: 5.4, 11.1, 13.1, 13.2_

- [x] 2. Implement data models and core utilities
  - [x] 2.1 Create Card model class (js/models/card.js)
    - Implement Card class with all properties (id, name, number, cvv, expiry, etc.)
    - Add computed properties (maskedNumber, age, isExpired, isExpiringSoon)
    - Add validate() and toJSON() methods
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.5_

  - [x] 2.2 Write property test for Card model
    - **Property 6: Card Storage Round Trip**
    - **Property 12: Card Age Calculation**
    - **Validates: Requirements 1.9, 2.5, 5.1, 5.2, 5.3**

  - [x] 2.3 Create AppConfig model class (js/models/config.js)
    - Implement AppConfig class with theme, dateFormat, and bankColors properties
    - Add toJSON() method
    - _Requirements: 11.1, 12.1_

  - [x] 2.4 Create utility functions file (js/utils.js)
    - Implement UUID generation function
    - Implement date formatting functions for different formats
    - Implement number formatting functions
    - _Requirements: 12.1, 12.2_

- [x] 3. Implement validation service
  - [x] 3.1 Create validator service (js/services/validator.js)
    - Implement luhnCheck() function for card number validation
    - Implement validateCardNumber() function
    - Implement validateCVV() function (3-4 digits)
    - Implement validateExpiryDate() function (future date check)
    - Implement validateIssueDate() function (not future date check)
    - Implement validateRequiredFields() function
    - Implement validateForm() function that combines all validations
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 3.1_

  - [x] 3.2 Write property tests for validator service
    - **Property 1: Required Field Validation**
    - **Property 2: Luhn Algorithm Validation**
    - **Property 3: Future Expiry Date Validation**
    - **Property 4: CVV Format Validation**
    - **Property 5: Past Issue Date Validation**
    - **Property 9: Optional Fields Acceptance**
    - **Property 14: Edit Validation Consistency**
    - **Validates: Requirements 1.1-1.8, 1.12, 3.1**

- [x] 4. Implement encryption service
  - [x] 4.1 Create encryption service (js/services/encryption.js)
    - Implement deriveKey() using Web Crypto API PBKDF2
    - Implement encrypt() using AES-GCM
    - Implement decrypt() using AES-GCM
    - Implement storeKeyInSession() and getKeyFromSession()
    - Implement clearSession() for security
    - Implement initializeMasterPassword() for first-time setup
    - Implement verifyMasterPassword() for subsequent logins
    - Implement encryptExport(data, password) and decryptImport(encryptedData, password)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [x] 4.2 Write property tests for encryption service
    - **Property 21: Encryption Irreversibility Without Key**
    - **Property 24: Incorrect Password Rejection**
    - **Property 43: Encryption Round Trip**
    - **Property 22: Export Package Structure**
    - **Property 23: Export-Import Round Trip**
    - **Validates: Requirements 6.2, 6.3, 6.5, 6.6, 6.7, 15.2, 15.3, 15.6**

- [x] 5. Implement card detection service
  - [x] 5.1 Create detector service (js/services/detector.js)
    - Define NETWORK_PATTERNS object with regex for Visa, Mastercard, Amex, RuPay, Diners, Discover
    - Define BANK_BINS object with BIN ranges for Indian banks
    - Implement detectNetwork() function
    - Implement detectBank() function
    - Implement getNetworkLogo() and getBankLogo() functions
    - Implement getBankColor() function with default colors
    - _Requirements: 1.10, 1.11, 17.1, 17.2, 17.3, 17.4, 17.7, 17.11_

  - [x] 5.2 Write property tests for detector service
    - **Property 7: Network Detection Accuracy**
    - **Property 8: Bank Detection Accuracy**
    - **Property 53: Placeholder Logo Fallback**
    - **Validates: Requirements 1.10, 1.11, 17.11**

- [ ] 6. Implement local storage services
  - [x] 6.1 Create card store service (js/services/cardStore.js)
    - Implement getAllCards(), getCardById(id), addCard(card), updateCard(id, card), deleteCard(id)
    - Implement encryptSensitiveFields(card) and decryptSensitiveFields(card)
    - Implement generateId() using UUID
    - _Requirements: 1.9, 3.3, 3.5, 5.1, 5.2, 5.3, 15.2, 15.3_

  - [x] 6.2 Write property tests for card store service
    - **Property 6: Card Storage Round Trip**
    - **Property 15: Card Update Persistence**
    - **Property 16: Card Deletion Completeness**
    - **Validates: Requirements 1.9, 3.3, 3.5, 5.1, 5.2, 5.3**

  - [x] 6.3 Create config store service (js/services/configStore.js)
    - Implement getConfig(), saveConfig(config)
    - Implement getTheme(), saveTheme(theme), getDateFormat(), saveDateFormat(format)
    - Implement getBankColors(), saveBankColor(bank, color)
    - _Requirements: 11.4, 11.5, 12.3, 12.4, 17.9, 17.10_

  - [x] 6.4 Write property tests for config store service
    - **Property 40: Theme Persistence Round Trip**
    - **Property 42: Date Format Persistence Round Trip**
    - **Property 52: Bank Color Persistence Round Trip**
    - **Validates: Requirements 11.4, 11.5, 12.3, 12.4, 17.10**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement statistics service
  - [x] 8.1 Create statistics service (js/services/statistics.js)
    - Implement calculateOverallStats() for total cards, fees, credit limits
    - Implement calculateNetworkStats() and calculateBankStats()
    - Implement calculateTotalCreditLimit() with shared limit deduplication
    - Implement calculateAverageAge() and findExpiringCards(months)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 16.3, 16.4_

  - [x] 8.2 Write property tests for statistics service
    - **Property 25: Card Count Accuracy**
    - **Property 26: Annual Fee Sum Accuracy**
    - **Property 27: Shared Limit Deduplication**
    - **Property 28: Network Statistics Grouping**
    - **Property 29: Average Age Calculation**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6, 16.3, 16.4**

- [x] 9. Implement reminder and search controllers
  - [x] 9.1 Create reminder controller (js/controllers/reminderController.js)
    - Implement getUpcomingReminders(), calculateNextDueDate(card), shouldShowReminder(card, dueDate)
    - Implement getRemindersForDate(date) and updateStatementCycle(card)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x]* 9.2 Write property tests for reminder controller
    - **Property 30: Next Due Date Calculation**
    - **Property 31: Reminder Filtering by Notification Status**
    - **Property 32: Reminder Filtering by Period**
    - **Property 33: Reminder Sort Order**
    - **Validates: Requirements 8.4, 8.5, 8.6, 8.7, 8.8**

  - [x] 9.3 Create search controller (js/controllers/searchController.js)
    - Implement searchCards(query, cards) filtering by name, bank, or network
    - Implement filterByNetwork(), filterByBank(), filterByTag()
    - Implement sortCards(sortBy, cards) for name, expiry, or age
    - Implement combineFilters() to apply multiple filters simultaneously
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [x]* 9.4 Write property tests for search controller
    - **Property 18: Search Filter Accuracy**
    - **Property 19: Sort Order Correctness**
    - **Property 20: Filter Accuracy**
    - **Property 38: Tag Filter Accuracy**
    - **Validates: Requirements 4.2, 4.3, 4.4, 10.3**

- [ ] 10. Implement card controller
  - [x] 10.1 Create card controller (js/controllers/cardController.js)
    - Implement getAllCards(), getCardById(id)
    - Implement addCard(cardData) with validation and network/bank detection
    - Implement updateCard(id, cardData) with validation
    - Implement deleteCard(id) with confirmation
    - Implement getSharedLimitCards(bankName) for shared limit dropdown
    - Emit custom events for card changes (card-added, card-updated, card-deleted)
    - _Requirements: 1.9, 1.10, 1.11, 3.1, 3.2, 3.3, 3.4, 3.5, 16.1, 16.6_

- [x] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement client-side routing and CSS foundation
  - [x] 12.1 Create router (js/router.js)
    - Implement hash-based routing (#/cards, #/add, #/card/:id, #/calendar, #/stats, #/settings, #/about)
    - Implement route registration, navigation, and parameter extraction
    - Add browser history support
    - _Requirements: 13.1, 13.2_

  - [x] 12.2 Create theme and layout styles (css/themes.css, css/layouts.css)
    - Define CSS custom properties for light and dark themes
    - Implement mobile-first responsive layouts with breakpoints (480px, 768px, 1024px)
    - Implement mobile bottom navigation bar and desktop sidebar navigation
    - Ensure touch-friendly targets (44x44px minimum)
    - _Requirements: 11.1, 11.2, 11.3, 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 12.3 Create component styles (css/components.css)
    - Style buttons (primary, secondary, danger), form inputs and validation states
    - Style card grid items, modals, toast notifications, and loading indicators
    - Style navigation elements with consistent spacing and typography
    - _Requirements: 13.1, 13.2, 13.4_

- [x] 13. Implement card list view
  - [x] 13.1 Create card list view (js/views/cardList.js)
    - Implement render(cards) to display responsive card grid (3 cols desktop, 2 tablet, 1 mobile)
    - Implement renderCard(card) with network logo, masked number, expiry, and bank color theme
    - Integrate search bar with real-time filtering via searchController
    - Add filter dropdowns for network, bank, and tags
    - Add sort dropdown for name, expiry, and age
    - Add click handlers to navigate to card details
    - Display upcoming payment reminders section at top of page
    - _Requirements: 2.1, 4.1, 4.2, 4.3, 4.4, 4.5, 8.5, 8.6, 8.7, 13.1, 13.2, 17.5, 17.8_

  - [x] 13.2 Write property tests for card list view
    - **Property 17: Card List Completeness**
    - **Property 47: Network Logo Display**
    - **Property 49: Logo Position Consistency**
    - **Property 51: Bank Color Consistency**
    - **Validates: Requirements 4.1, 17.1, 17.5, 17.8**

- [x] 14. Implement card form view
  - [x] 14.1 Create card form view (js/views/cardForm.js)
    - Implement render(card) for both add and edit modes
    - Create form with all required fields (name, number, CVV, expiry) and optional fields
    - Add real-time card number input handler with network/bank detection and card preview update
    - Implement inline validation with error messages on blur
    - Add shared limit dropdown filtered by same bank
    - Add tag multi-select with create new tag option
    - Add notification toggle with reminder period dropdown
    - Implement handleSubmit() with full validation; disable save until form is valid
    - _Requirements: 1.1-1.12, 3.1, 3.2, 8.2, 8.3, 10.1, 16.1, 16.6_

  - [x] 14.2 Write property tests for card form view
    - **Property 44: Shared Limit Dropdown Filtering**
    - **Validates: Requirements 16.1, 16.6**

- [x] 15. Implement card details view
  - [x] 15.1 Create card detail view (js/views/cardDetail.js)
    - Implement render(cardId) displaying all card information
    - Display card visual with network and bank logos
    - Implement revealCVV() and revealCardNumber() with auto-hide after 30 seconds
    - Implement copyToClipboard() with visual feedback and 60-second clipboard auto-clear
    - Display card age, tags, shared limit relationships, financial and billing info
    - Add edit and delete action buttons with delete confirmation dialog
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.4, 16.5, 17.2, 17.6, 19.5_

  - [x] 15.2 Write property tests for card detail view
    - **Property 10: Sensitive Data Masking**
    - **Property 11: Clipboard Copy Accuracy**
    - **Property 13: Tag Display Completeness**
    - **Property 46: Shared Limit Display**
    - **Property 48: Bank Logo Display**
    - **Property 50: Dual Logo Display**
    - **Validates: Requirements 2.1, 2.4, 2.6, 16.5, 17.2, 17.6**

- [x] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Implement calendar and statistics views
  - [x] 17.1 Create calendar view (js/views/calendar.js)
    - Implement renderMonth(month, year) to display calendar grid
    - Implement highlightDates() for statement and due dates with color coding by card/network
    - Implement handleDateClick() to show cards for selected date
    - Add month/year navigation controls and event type legend
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 13.1, 13.2_

  - [x] 17.2 Write property tests for calendar view
    - **Property 34: Calendar Date Completeness**
    - **Property 35: Calendar Date Filtering**
    - **Property 36: Event Color Coding**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

  - [x] 17.3 Create statistics view (js/views/statistics.js)
    - Implement render(stats) displaying total cards, annual fees, credit limit, average age
    - Implement renderNetworkBreakdown() and renderBankBreakdown()
    - Display expiring cards section (within 3 months)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 13.1, 13.2_

- [x] 18. Implement settings and about views
  - [x] 18.1 Create settings view (js/views/settings.js)
    - Implement render(config) displaying all settings
    - Add theme toggle (light/dark) with immediate preview and persistence
    - Add date format selector with preview and persistence
    - Add bank color customization with color pickers
    - Add export data button with password prompt
    - Add import data button with file picker, password prompt, and pre-import backup
    - Add change master password functionality
    - Add clear all data button with confirmation
    - Display last export date
    - _Requirements: 6.1, 6.4, 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 17.9, 17.10, 23.2_

  - [x] 18.2 Write property tests for settings view
    - **Property 41: Date Format Application**
    - **Validates: Requirements 12.2**

  - [x] 18.3 Create about view (js/views/about.js)
    - Display application name, version, and feature list
    - Add bug report link, documentation links, and Getting Started guide
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 20.4_

- [x] 19. Implement master password flow and security features
  - [x] 19.1 Create master password UI
    - Create first-time setup modal for master password with strength indicator
    - Create login modal for returning users with password verification
    - Handle incorrect password with error message and rate limiting (max 5 attempts, 5-minute lockout)
    - Clear session on browser close
    - _Requirements: 15.1, 15.4, 15.5, 15.6, 19.8_

  - [x] 19.2 Add security hardening
    - Implement input sanitization for all user inputs before rendering
    - Add CSP meta tag restricting scripts to 'self' only
    - Add security warning banner if accessed over HTTP
    - Use crypto.getRandomValues() for all random number generation
    - Ensure no data is ever sent to external servers
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.6, 19.7, 19.9_

- [ ] 20. Implement tag management and shared limit tracking
  - [ ] 20.1 Add tag functionality across views
    - Implement tag creation in card form with persistence
    - Implement tag filter in card list
    - Display all available tags for selection across the app
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 20.2 Write property tests for tag management
    - **Property 37: Tag Storage Round Trip**
    - **Property 39: Available Tags Completeness**
    - **Validates: Requirements 10.2, 10.4, 10.5**

  - [ ] 20.3 Add shared limit functionality
    - Implement shared limit dropdown population filtered by same bank in card form
    - Store and display shared limit relationships in card details
    - Ensure shared limit deduplication in statistics
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 20.4 Write property tests for shared limit tracking
    - **Property 45: Shared Limit Relationship Persistence**
    - **Validates: Requirements 16.2**

- [ ] 21. Add visual assets and bank colors data
  - [ ] 21.1 Add network and bank logos
    - Add Visa, Mastercard, American Express, RuPay, Diners Club, Discover logos to assets/logos/networks/
    - Add logos for HDFC, ICICI, SBI, Axis, Kotak, HSBC, Citibank, Standard Chartered, Yes Bank, IndusInd to assets/logos/banks/
    - Create placeholder icon for unknown networks/banks
    - Ensure consistent logo sizing (32x32px for list, 48x48px for details)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.11, 17.12_

  - [ ] 21.2 Create bank colors configuration (data/bankColors.json)
    - Define default colors for all supported banks
    - Load default colors on first run; allow user customization in settings
    - _Requirements: 17.7, 17.9, 17.10_

- [ ] 22. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 23. Implement user feedback and error handling
  - [ ] 23.1 Add user feedback mechanisms
    - Create toast notification component for success/error messages
    - Add loading spinners for async operations and skeleton screens for initial load
    - Add progress bar for export/import operations
    - Add confirmation dialogs for destructive actions
    - _Requirements: 3.4, 6.7_

  - [ ] 23.2 Add comprehensive error handling
    - Add try-catch blocks to all async operations with user-friendly error messages
    - Handle storage quota exceeded errors with clear instructions
    - Handle encryption/decryption errors and invalid data errors
    - _Requirements: 6.7, 15.6, 20.3, 20.5, 20.8_

  - [ ] 23.3 Add first-run experience
    - Create welcome tutorial modal on first launch explaining key features
    - Add "Try Demo" button with sample card data
    - Add contextual help tooltips for complex features
    - _Requirements: 20.1, 20.2, 20.6_

- [ ] 24. Implement performance optimizations
  - [ ] 24.1 Optimize rendering and data operations
    - Debounce search input (300ms delay)
    - Batch DOM updates using document fragments to minimize reflows
    - Implement lazy loading for images with loading="lazy"
    - Use Map/Set for O(1) lookups in search and filter operations
    - Cache computed statistics values
    - _Requirements: 21.2, 21.3, 21.4, 21.5, 21.6_

- [ ] 25. Implement data backup and browser compatibility
  - [ ] 25.1 Add backup prompts and enhanced import/export
    - Prompt user to export after adding 5 cards
    - Validate import file structure before applying; create automatic backup before import
    - Display detailed validation errors for invalid imports
    - _Requirements: 23.1, 23.3, 23.4, 23.5, 23.6_

  - [ ] 25.2 Add feature detection and browser compatibility
    - Detect Web Crypto API and localStorage support; display warning if missing
    - Add robots.txt (disallow all for privacy) and favicon/web app manifest
    - Create netlify.toml and vercel.json deployment configurations
    - _Requirements: 18.2, 18.6, 18.7, 22.3, 22.4_

- [ ] 26. Final checkpoint and integration wiring
  - [ ] 26.1 Wire all components together in app.js
    - Initialize router with all routes
    - Initialize master password flow on startup
    - Load and apply saved theme and date format
    - Initialize all controllers and services
    - Render initial view based on current route
    - _Requirements: All requirements_

  - [ ]* 26.2 Write integration tests
    - Test complete add card flow (form → validation → storage → display)
    - Test complete edit and delete card flows
    - Test search, filter, and sort flow
    - Test export/import round-trip flow
    - Test theme switching and persistence flow
    - _Requirements: All requirements_

- [ ] 27. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based or integration tests and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities to ask questions
- Property tests validate universal correctness properties using the fast-check library
- All sensitive data (card numbers, CVVs) is encrypted using Web Crypto API
- The application works completely offline using browser local storage

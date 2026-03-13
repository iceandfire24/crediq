# Implementation Plan: Offline-First Card Manager

## Overview

This implementation plan breaks down the Card Manager application into beginner-friendly, incremental tasks. Each task builds on previous work, starting with foundational setup and progressing through data models, services, UI components, and feature integration. The application uses vanilla JavaScript, HTML5, and CSS3 with no build tools required, making it accessible for beginners while maintaining professional code quality.

## Tasks

- [ ] 1. Project setup and file structure
  - Create the project directory structure (css/, js/, assets/, data/ folders)
  - Create index.html with semantic HTML5 structure and navigation placeholders
  - Create main.css with CSS custom properties for light/dark themes
  - Create app.js as the application entry point
  - Create config.js with environment-specific settings (app version, debug mode, etc.)
  - Create .gitignore file (ignore node_modules, .DS_Store, etc.)
  - _Requirements: 5.4, 11.1, 13.1, 13.2_

- [ ] 2. Implement data models and core utilities
  - [ ] 2.1 Create Card model class (js/models/card.js)
    - Implement Card class with all properties (id, name, number, cvv, expiry, etc.)
    - Add computed properties (maskedNumber, age, isExpired, isExpiringSoon)
    - Add validate() and toJSON() methods
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.5_

  - [ ]* 2.2 Write property test for Card model
    - **Property 6: Card Storage Round Trip**
    - **Property 12: Card Age Calculation**
    - **Validates: Requirements 1.9, 2.5, 5.1, 5.2, 5.3**

  - [ ] 2.3 Create AppConfig model class (js/models/config.js)
    - Implement AppConfig class with theme, dateFormat, and bankColors properties
    - Add toJSON() method
    - _Requirements: 11.1, 12.1_

  - [ ] 2.4 Create utility functions file (js/utils.js)
    - Implement UUID generation function
    - Implement date formatting functions for different formats
    - Implement number formatting functions
    - _Requirements: 12.1, 12.2_

- [ ] 3. Implement validation service
  - [ ] 3.1 Create validator service (js/services/validator.js)
    - Implement luhnCheck() function for card number validation
    - Implement validateCardNumber() function
    - Implement validateCVV() function (3-4 digits)
    - Implement validateExpiryDate() function (future date check)
    - Implement validateIssueDate() function (not future date check)
    - Implement validateRequiredFields() function
    - Implement validateForm() function that combines all validations
    - _Requirements: 1.5, 1.6, 1.7, 1.8, 3.1_

  - [ ]* 3.2 Write property tests for validator service
    - **Property 1: Required Field Validation**
    - **Property 2: Luhn Algorithm Validation**
    - **Property 3: Future Expiry Date Validation**
    - **Property 4: CVV Format Validation**
    - **Property 5: Past Issue Date Validation**
    - **Property 9: Optional Fields Acceptance**
    - **Property 14: Edit Validation Consistency**
    - **Validates: Requirements 1.1-1.8, 1.12, 3.1**

- [ ] 4. Implement encryption service
  - [ ] 4.1 Create encryption service (js/services/encryption.js)
    - Implement deriveKey() using Web Crypto API PBKDF2
    - Implement encrypt() using AES-GCM
    - Implement decrypt() using AES-GCM
    - Implement storeKeyInSession() and getKeyFromSession()
    - Implement clearSession() for security
    - Implement initializeMasterPassword() for first-time setup
    - Implement verifyMasterPassword() for subsequent logins
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

  - [ ]* 4.2 Write property tests for encryption service
    - **Property 21: Encryption Irreversibility Without Key**
    - **Property 24: Incorrect Password Rejection**
    - **Property 43: Encryption Round Trip**
    - **Validates: Requirements 6.2, 6.7, 15.2, 15.3, 15.6**

- [ ] 5. Implement card detection service
  - [ ] 5.1 Create detector service (js/services/detector.js)
    - Define NETWORK_PATTERNS object with regex for Visa, Mastercard, Amex, RuPay, Diners, Discover
    - Define BANK_BINS object with BIN ranges for Indian banks
    - Implement detectNetwork() function
    - Implement detectBank() function
    - Implement getNetworkLogo() function
    - Implement getBankLogo() function
    - Implement getBankColor() function with default colors
    - _Requirements: 1.10, 1.11, 17.1, 17.2, 17.3, 17.4, 17.7, 17.11_

  - [ ]* 5.2 Write property tests for detector service
    - **Property 7: Network Detection Accuracy**
    - **Property 8: Bank Detection Accuracy**
    - **Property 53: Placeholder Logo Fallback**
    - **Validates: Requirements 1.10, 1.11, 17.11**

- [ ] 6. Implement local storage service
  - [ ] 6.1 Create card store service (js/services/cardStore.js)
    - Implement getAllCards() to retrieve all cards from localStorage
    - Implement getCardById(id) to retrieve a specific card
    - Implement addCard(card) to store a new card
    - Implement updateCard(id, card) to update existing card
    - Implement deleteCard(id) to remove a card
    - Implement encryptSensitiveFields(card) to encrypt card number and CVV
    - Implement decryptSensitiveFields(card) to decrypt card number and CVV
    - Implement generateId() using UUID
    - _Requirements: 1.9, 3.3, 3.5, 5.1, 5.2, 5.3, 15.2, 15.3_

  - [ ]* 6.2 Write property tests for card store service
    - **Property 6: Card Storage Round Trip**
    - **Property 15: Card Update Persistence**
    - **Property 16: Card Deletion Completeness**
    - **Validates: Requirements 1.9, 3.3, 3.5, 5.1, 5.2, 5.3**

  - [ ] 6.3 Create config store service (js/services/configStore.js)
    - Implement getConfig() to retrieve app configuration
    - Implement saveConfig(config) to persist configuration
    - Implement getTheme() and saveTheme(theme)
    - Implement getDateFormat() and saveDateFormat(format)
    - Implement getBankColors() and saveBankColor(bank, color)
    - _Requirements: 11.4, 11.5, 12.3, 12.4, 17.9, 17.10_

  - [ ]* 6.4 Write property tests for config store service
    - **Property 40: Theme Persistence Round Trip**
    - **Property 42: Date Format Persistence Round Trip**
    - **Property 52: Bank Color Persistence Round Trip**
    - **Validates: Requirements 11.4, 11.5, 12.3, 12.4, 17.10**

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement statistics service
  - [ ] 8.1 Create statistics service (js/services/statistics.js)
    - Implement calculateOverallStats() for total cards, fees, credit limits
    - Implement calculateNetworkStats() for breakdown by network
    - Implement calculateBankStats() for breakdown by bank
    - Implement calculateTotalCreditLimit() with shared limit deduplication
    - Implement calculateAverageAge() for average card age
    - Implement findExpiringCards() to find cards expiring within N months
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 16.3, 16.4_

  - [ ]* 8.2 Write property tests for statistics service
    - **Property 25: Card Count Accuracy**
    - **Property 26: Annual Fee Sum Accuracy**
    - **Property 27: Shared Limit Deduplication**
    - **Property 28: Network Statistics Grouping**
    - **Property 29: Average Age Calculation**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6, 16.3, 16.4**

- [ ] 9. Implement reminder service
  - [ ] 9.1 Create reminder controller (js/controllers/reminderController.js)
    - Implement getUpcomingReminders() to get cards with upcoming due dates
    - Implement calculateNextDueDate(card) based on statement cycle
    - Implement shouldShowReminder(card, dueDate) based on reminder period
    - Implement getRemindersForDate(date) for calendar integration
    - Implement updateStatementCycle(card) to advance to next cycle
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [ ]* 9.2 Write property tests for reminder controller
    - **Property 30: Next Due Date Calculation**
    - **Property 31: Reminder Filtering by Notification Status**
    - **Property 32: Reminder Filtering by Period**
    - **Property 33: Reminder Sort Order**
    - **Validates: Requirements 8.4, 8.5, 8.6, 8.7, 8.8**

- [ ] 10. Implement search and filter controller
  - [ ] 10.1 Create search controller (js/controllers/searchController.js)
    - Implement searchCards(query, cards) to filter by name, bank, or network
    - Implement filterByNetwork(network, cards)
    - Implement filterByBank(bank, cards)
    - Implement filterByTag(tag, cards)
    - Implement sortCards(sortBy, cards) for name, expiry, or age sorting
    - Implement combineFilters() to apply multiple filters
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [ ]* 10.2 Write property tests for search controller
    - **Property 18: Search Filter Accuracy**
    - **Property 19: Sort Order Correctness**
    - **Property 20: Filter Accuracy**
    - **Property 38: Tag Filter Accuracy**
    - **Validates: Requirements 4.2, 4.3, 4.4, 10.3**

- [ ] 11. Implement export/import functionality
  - [ ] 11.1 Add export/import methods to encryption service
    - Implement encryptExport(data, password) to create encrypted export package
    - Implement decryptImport(encryptedData, password) to decrypt import package
    - Create ExportPackage model with version, exportDate, cards, and config
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 11.2 Write property tests for export/import
    - **Property 22: Export Package Structure**
    - **Property 23: Export-Import Round Trip**
    - **Validates: Requirements 6.3, 6.5, 6.6**

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement card controller
  - [ ] 13.1 Create card controller (js/controllers/cardController.js)
    - Implement getAllCards() to fetch all cards from store
    - Implement getCardById(id) to fetch specific card
    - Implement addCard(cardData) with validation and network/bank detection
    - Implement updateCard(id, cardData) with validation
    - Implement deleteCard(id) with confirmation
    - Implement getSharedLimitCards(bankName) for shared limit dropdown
    - Emit custom events for card changes (card-added, card-updated, card-deleted)
    - _Requirements: 1.9, 1.10, 1.11, 3.1, 3.2, 3.3, 3.4, 3.5, 16.1, 16.6_

- [ ] 14. Implement client-side routing
  - [ ] 14.1 Create router (js/router.js)
    - Implement hash-based routing (#/cards, #/add, #/card/:id, #/calendar, #/stats, #/settings, #/about)
    - Implement route registration and navigation
    - Implement route parameter extraction
    - Add browser history support
    - _Requirements: 13.1, 13.2_

- [ ] 15. Implement card list view
  - [ ] 15.1 Create card list view (js/views/cardList.js)
    - Implement render(cards) to display card grid/list
    - Implement renderCard(card) with network logo, masked number, expiry
    - Apply bank color themes to card backgrounds
    - Add click handlers to navigate to card details
    - Integrate search bar with real-time filtering
    - Add filter dropdowns for network, bank, and tags
    - Add sort dropdown for name, expiry, and age
    - Implement responsive grid (3 columns desktop, 2 tablet, 1 mobile)
    - _Requirements: 2.1, 4.1, 4.2, 4.3, 4.4, 4.5, 13.1, 13.2, 17.5, 17.8_

  - [ ]* 15.2 Write property tests for card list view
    - **Property 17: Card List Completeness**
    - **Property 47: Network Logo Display**
    - **Property 49: Logo Position Consistency**
    - **Property 51: Bank Color Consistency**
    - **Validates: Requirements 4.1, 17.1, 17.5, 17.8**

- [ ] 16. Implement card form view
  - [ ] 16.1 Create card form view (js/views/cardForm.js)
    - Implement render(card) for both add and edit modes
    - Create form with all fields (required and optional)
    - Add real-time card number input handler with network/bank detection
    - Update card preview as user types
    - Implement inline validation with error messages
    - Add shared limit dropdown filtered by bank
    - Add tag multi-select with create new tag option
    - Add notification toggle with reminder period dropdown
    - Implement handleSubmit() with full validation
    - Disable save button until form is valid
    - _Requirements: 1.1-1.12, 3.1, 3.2, 8.2, 8.3, 10.1, 16.1, 16.6_

  - [ ]* 16.2 Write property tests for card form view
    - **Property 44: Shared Limit Dropdown Filtering**
    - **Validates: Requirements 16.1, 16.6**

- [ ] 17. Implement card details view
  - [ ] 17.1 Create card detail view (js/views/cardDetail.js)
    - Implement render(cardId) to display full card information
    - Display card visual with network and bank logos
    - Implement revealCVV() with auto-hide after 30 seconds
    - Implement revealCardNumber() with auto-hide after 30 seconds
    - Implement copyToClipboard() with visual feedback
    - Display card age calculation
    - Display all tags
    - Display shared limit relationships
    - Display financial and billing information
    - Add edit and delete action buttons
    - Implement delete confirmation dialog
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.4, 16.5, 17.2, 17.6_

  - [ ]* 17.2 Write property tests for card detail view
    - **Property 10: Sensitive Data Masking**
    - **Property 11: Clipboard Copy Accuracy**
    - **Property 13: Tag Display Completeness**
    - **Property 46: Shared Limit Display**
    - **Property 48: Bank Logo Display**
    - **Property 50: Dual Logo Display**
    - **Validates: Requirements 2.1, 2.4, 2.6, 16.5, 17.2, 17.6**

- [ ] 18. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Implement calendar view
  - [ ] 19.1 Create calendar view (js/views/calendar.js)
    - Implement renderMonth(month, year) to display calendar grid
    - Implement highlightDates() for statement and due dates
    - Apply color coding by card/network
    - Implement handleDateClick() to show cards for selected date
    - Add month/year navigation controls
    - Display legend for event types
    - Implement responsive layout for mobile
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 13.1, 13.2_

  - [ ]* 19.2 Write property tests for calendar view
    - **Property 34: Calendar Date Completeness**
    - **Property 35: Calendar Date Filtering**
    - **Property 36: Event Color Coding**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [ ] 20. Implement statistics view
  - [ ] 20.1 Create statistics view (js/views/statistics.js)
    - Implement render(stats) to display overall statistics
    - Display total cards, annual fees, credit limit, average age in card layout
    - Implement renderNetworkBreakdown() with card count and limits per network
    - Implement renderBankBreakdown() with card count and limits per bank
    - Display expiring cards section (within 3 months)
    - Implement responsive layout for mobile
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 13.1, 13.2_

- [ ] 21. Implement settings view
  - [ ] 21.1 Create settings view (js/views/settings.js)
    - Implement render(config) to display all settings
    - Add theme toggle (light/dark) with immediate preview
    - Add date format selector with preview
    - Add bank color customization section with color pickers
    - Add export data button with password prompt
    - Add import data button with file picker and password prompt
    - Add change master password functionality
    - Add clear all data button with confirmation
    - Persist all settings changes immediately
    - _Requirements: 6.1, 6.4, 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 17.9, 17.10_

  - [ ]* 21.2 Write property tests for settings view
    - **Property 41: Date Format Application**
    - **Validates: Requirements 12.2**

- [ ] 22. Implement about page
  - [ ] 22.1 Create about view (js/views/about.js)
    - Display application name and version
    - Display feature list
    - Add bug report link
    - Add documentation links
    - Display privacy policy information
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [ ] 23. Implement theme system
  - [ ] 23.1 Create theme styles (css/themes.css)
    - Define CSS custom properties for light theme
    - Define CSS custom properties for dark theme using [data-theme="dark"]
    - Implement theme toggle functionality in JavaScript
    - Apply theme on page load from saved preference
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 24. Implement responsive layouts
  - [ ] 24.1 Create responsive layout styles (css/layouts.css)
    - Define mobile-first base styles (0-479px)
    - Add tablet breakpoint styles (480px-767px)
    - Add desktop breakpoint styles (768px+)
    - Implement mobile navigation (bottom bar)
    - Implement desktop navigation (sidebar)
    - Ensure touch-friendly targets (44x44px minimum)
    - Test all views at different breakpoints
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 25. Implement component styles
  - [ ] 25.1 Create component styles (css/components.css)
    - Style buttons (primary, secondary, danger)
    - Style form inputs and validation states
    - Style cards and card grids
    - Style modals and dialogs
    - Style toast notifications
    - Style loading indicators
    - Style navigation elements
    - Ensure consistent spacing and typography
    - _Requirements: 13.1, 13.2, 13.4_

- [ ] 26. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 27. Implement master password flow
  - [ ] 27.1 Create master password initialization
    - Create first-time setup modal for master password
    - Implement password strength indicator
    - Store derived encryption key in session storage
    - Create login modal for returning users
    - Implement password verification
    - Handle incorrect password with error message
    - Clear session on browser close
    - _Requirements: 15.1, 15.4, 15.5, 15.6_

- [ ] 28. Implement tag management
  - [ ] 28.1 Add tag functionality across views
    - Implement tag creation in card form
    - Implement tag storage and retrieval
    - Implement tag filter in card list
    - Display available tags for selection
    - Ensure tag persistence with cards
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]* 28.2 Write property tests for tag management
    - **Property 37: Tag Storage Round Trip**
    - **Property 39: Available Tags Completeness**
    - **Validates: Requirements 10.2, 10.4, 10.5**

- [ ] 29. Implement shared limit tracking
  - [ ] 29.1 Add shared limit functionality
    - Implement shared limit dropdown population in card form
    - Filter dropdown by same bank only
    - Store shared limit relationships
    - Display shared limit relationships in card details
    - Implement shared limit deduplication in statistics
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6_

  - [ ]* 29.2 Write property tests for shared limit tracking
    - **Property 45: Shared Limit Relationship Persistence**
    - **Validates: Requirements 16.2**

- [ ] 30. Add logos and visual assets
  - [ ] 30.1 Add network and bank logos
    - Add Visa, Mastercard, American Express, RuPay, Diners Club, Discover logos to assets/logos/networks/
    - Add logos for HDFC, ICICI, SBI, Axis, Kotak, HSBC, Citibank, Standard Chartered, Yes Bank, IndusInd to assets/logos/banks/
    - Create placeholder icon for unknown networks/banks
    - Ensure consistent logo sizing (32x32px for list, 48x48px for details)
    - Optimize images for web
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.11, 17.12_

- [ ]* 31. Implement accessibility features
  - [ ]* 31.1 Add accessibility enhancements
    - Add ARIA labels to all interactive elements
    - Ensure keyboard navigation works for all views
    - Add focus indicators to all focusable elements
    - Test color contrast ratios (minimum 4.5:1)
    - Add alt text to all logos and icons
    - Test with screen reader
    - Ensure semantic HTML structure
    - _Requirements: 13.1, 13.2, 13.4_

- [ ] 32. Implement loading states and feedback
  - [ ] 32.1 Add user feedback mechanisms
    - Create toast notification component for success/error messages
    - Add loading spinners for async operations
    - Add skeleton screens for initial load
    - Add progress bar for export/import
    - Add visual feedback for copy operations
    - Add confirmation dialogs for destructive actions
    - Implement form disabled states
    - _Requirements: 3.4, 6.7_

- [ ] 33. Implement error handling
  - [ ] 33.1 Add comprehensive error handling
    - Add try-catch blocks to all async operations
    - Display user-friendly error messages
    - Handle storage quota exceeded errors
    - Handle encryption/decryption errors
    - Handle invalid data errors
    - Log errors to console for debugging
    - Provide recovery options where possible
    - _Requirements: 6.7, 15.6_

- [ ] 34. Add default bank colors data
  - [ ] 34.1 Create bank colors configuration
    - Create data/bankColors.json with default colors for all supported banks
    - Load default colors on first run
    - Allow user customization in settings
    - _Requirements: 17.7, 17.9, 17.10_

- [ ] 35. Implement payment reminder display
  - [ ] 35.1 Add reminder notifications to home page
    - Display upcoming payment reminders on card list page
    - Show only cards with notifications enabled
    - Filter by reminder period (7, 3, 1, or 0 days before)
    - Sort reminders by due date
    - Highlight urgent reminders (due today or overdue)
    - _Requirements: 8.5, 8.6, 8.7_

- [ ] 36. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 37. Integration and final wiring
  - [ ] 37.1 Wire all components together in app.js
    - Initialize router with all routes
    - Set up event listeners for navigation
    - Initialize master password flow
    - Load saved theme and apply
    - Load saved date format and apply
    - Set up global error handlers
    - Initialize all controllers and services
    - Render initial view based on route
    - _Requirements: All requirements_

  - [ ]* 37.2 Write integration tests
    - Test complete add card flow
    - Test complete edit card flow
    - Test complete delete card flow
    - Test search and filter flow
    - Test export/import flow
    - Test theme switching flow
    - Test calendar navigation flow
    - _Requirements: All requirements_

- [ ] 38. Final testing and polish
  - [ ] 38.1 Manual testing checklist
    - Test all CRUD operations
    - Test validation prevents invalid data
    - Test encryption/decryption works correctly
    - Test search and filters work
    - Test statistics calculate correctly
    - Test calendar displays events
    - Test reminders show at correct times
    - Test export/import preserves data
    - Test responsive design on multiple screen sizes
    - Test touch interactions on mobile
    - Test theme switching
    - Test keyboard navigation
    - Test with 100+ cards for performance
    - _Requirements: All requirements_

  - [ ] 38.2 Code cleanup and documentation
    - Add JSDoc comments to all functions
    - Remove console.log statements
    - Format code consistently
    - Add README.md with setup instructions
    - Add inline code comments for complex logic
    - Verify all files follow naming conventions

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and provide opportunities to ask questions
- Property tests validate universal correctness properties using fast-check library
- Unit tests validate specific examples and edge cases
- The implementation uses vanilla JavaScript with no build tools required
- All sensitive data (card numbers, CVVs) is encrypted using Web Crypto API
- The application works completely offline using browser local storage
- The design supports future migration to React while maintaining the same architecture


- [ ] 39. Implement security hardening
  - [ ] 39.1 Add security best practices
    - Remove all console.log statements containing sensitive data
    - Implement input sanitization for all user inputs
    - Add clipboard auto-clear after 60 seconds for sensitive data
    - Implement rate limiting for password attempts (max 5 attempts, 5-minute lockout)
    - Add security warning banner if accessed over HTTP
    - Ensure no data is ever sent to external servers
    - Use crypto.getRandomValues() for all random number generation
    - _Requirements: 19.1, 19.2, 19.4, 19.5, 19.6, 19.7, 19.8, 19.9_

  - [ ] 39.2 Add Content Security Policy
    - Create CSP meta tag or headers to prevent XSS
    - Restrict script sources to 'self' only
    - Disable inline scripts and eval()
    - Test CSP doesn't break functionality
    - _Requirements: 19.3_

  - [ ] 39.3 Create security documentation
    - Create security.txt file with contact information
    - Document security features in README
    - Add responsible disclosure policy
    - _Requirements: 19.10_

- [ ] 40. Implement error handling and user guidance
  - [ ] 40.1 Create welcome tutorial
    - Design first-run tutorial modal
    - Explain key features (encryption, offline-first, export)
    - Add "Don't show again" option
    - Store tutorial completion in localStorage
    - _Requirements: 20.1_

  - [ ] 40.2 Add contextual help
    - Add tooltip component for complex features
    - Add help icons next to advanced fields
    - Create "Getting Started" guide in About page
    - Document keyboard shortcuts
    - _Requirements: 20.2, 20.4, 20.7_

  - [ ] 40.3 Enhance error messages
    - Review all error messages for clarity
    - Provide actionable solutions in error messages
    - Handle storage quota exceeded with clear instructions
    - Add real-time validation feedback
    - _Requirements: 20.3, 20.5, 20.8_

  - [ ]* 40.4 Add demo mode
    - Create sample card data for demo
    - Add "Try Demo" button on first launch
    - Allow users to clear demo data
    - _Requirements: 20.6_

- [ ] 41. Implement performance optimizations
  - [ ] 41.1 Optimize rendering performance
    - Implement virtual scrolling for large card lists (100+ cards)
    - Batch DOM updates to minimize reflows
    - Use document fragments for multiple insertions
    - Debounce search input (300ms delay)
    - _Requirements: 21.2, 21.4, 21.6_

  - [ ] 41.2 Optimize asset loading
    - Implement lazy loading for images
    - Preload critical assets
    - Optimize logo file sizes
    - Add loading="lazy" to img tags
    - _Requirements: 21.3_

  - [ ] 41.3 Optimize data operations
    - Use Map/Set for O(1) lookups where appropriate
    - Implement efficient search algorithms
    - Compress export data using gzip or similar
    - Cache computed values (statistics, filtered lists)
    - _Requirements: 21.5, 21.7_

  - [ ] 41.4 Performance testing
    - Test with 100+ cards
    - Measure initial load time (target: <2 seconds)
    - Profile JavaScript execution
    - Optimize bottlenecks
    - _Requirements: 21.1, 21.2_

- [ ] 42. Implement browser compatibility
  - [ ] 42.1 Add feature detection
    - Detect Web Crypto API support
    - Detect localStorage support
    - Display warning if required features missing
    - Provide graceful degradation where possible
    - _Requirements: 22.3, 22.4_

  - [ ] 42.2 Cross-browser testing
    - Test on Chrome, Firefox, Safari, Edge (latest versions)
    - Test on mobile browsers (iOS Safari, Chrome Mobile)
    - Fix browser-specific issues
    - Document browser requirements in README
    - _Requirements: 22.1, 22.5_

  - [ ]* 42.3 Add polyfills if needed
    - Add polyfills for essential features if targeting older browsers
    - Test polyfills don't break modern browsers
    - _Requirements: 22.6_

- [ ] 43. Implement data backup and recovery
  - [ ] 43.1 Add backup prompts
    - Prompt user to export after adding 5 cards
    - Display last export date in settings
    - Add "Backup Reminder" notification
    - _Requirements: 23.1, 23.2_

  - [ ] 43.2 Enhance import/export
    - Validate import file structure before applying
    - Create automatic backup before import
    - Add "Download as JSON" option for manual backup
    - Display detailed validation errors for invalid imports
    - _Requirements: 23.3, 23.4, 23.5, 23.6_

  - [ ]* 43.3 Add undo functionality
    - Implement undo for bulk operations
    - Store previous state temporarily
    - Add "Undo" button after import/delete all
    - _Requirements: 23.7_

- [ ]* 44. Enhance accessibility
  - [ ]* 44.1 WCAG compliance audit
    - Review all color contrast ratios (minimum 4.5:1)
    - Add ARIA labels to all interactive elements
    - Ensure proper heading hierarchy
    - Add skip navigation links
    - Test with screen reader (NVDA or JAWS)
    - _Requirements: 24.1, 24.2, 24.5, 24.7_

  - [ ]* 44.2 Add high contrast mode
    - Create high contrast theme option
    - Ensure all UI elements visible in high contrast
    - Add toggle in settings
    - _Requirements: 24.3_

  - [ ]* 44.3 Keyboard navigation enhancements
    - Test all features work with keyboard only
    - Add visible focus indicators
    - Document keyboard shortcuts
    - Ensure logical tab order
    - _Requirements: 24.4_

  - [ ]* 44.4 Prepare for internationalization
    - Extract all user-facing strings to constants
    - Structure code to support i18n in future
    - Use semantic HTML for better translation
    - _Requirements: 24.6, 24.8_

- [ ] 45. Prepare for deployment
  - [ ] 45.1 Create deployment configurations
    - Create netlify.toml for Netlify deployment
    - Create vercel.json for Vercel deployment
    - Create .nojekyll for GitHub Pages
    - Add deployment instructions to README
    - _Requirements: 18.2, 18.3_

  - [ ] 45.2 Add PWA support
    - Create manifest.json with app metadata
    - Add favicon (16x16, 32x32, 192x192, 512x512)
    - Add apple-touch-icon for iOS
    - Add theme-color meta tag
    - _Requirements: 18.7_

  - [ ] 45.3 Configure caching and SEO
    - Add cache headers for static assets
    - Create robots.txt (disallow all for privacy)
    - Add meta description and title
    - Ensure HTTPS requirement documented
    - _Requirements: 18.4, 18.5, 18.6_

  - [ ]* 45.4 Add service worker for offline support
    - Create service worker for caching
    - Implement offline fallback
    - Test offline functionality
    - _Requirements: 5.4_

- [ ] 46. Create comprehensive documentation
  - [ ] 46.1 Write README.md
    - Add project description and features
    - Add installation instructions
    - Add deployment instructions
    - Add browser requirements
    - Add security notes
    - Add screenshots
    - Add license information
    - _Requirements: 18.3_

  - [ ] 46.2 Create user documentation
    - Write user guide in About page
    - Document all features
    - Add FAQ section
    - Add troubleshooting guide
    - _Requirements: 20.4_

  - [ ] 46.3 Create developer documentation
    - Document code architecture
    - Add JSDoc comments to all functions
    - Create CONTRIBUTING.md
    - Document testing procedures
    - _Requirements: 38.2_

- [ ] 47. Final security and privacy audit
  - [ ] 47.1 Security checklist
    - Verify no sensitive data in console logs
    - Verify no data sent to external servers
    - Verify encryption key only in session storage
    - Verify clipboard auto-clears
    - Verify CSP is active
    - Verify input sanitization works
    - Verify rate limiting works
    - Test password brute force protection
    - _Requirements: 19.1-19.9_

  - [ ] 47.2 Privacy checklist
    - Verify no analytics or tracking
    - Verify no external resources loaded
    - Verify robots.txt blocks indexing
    - Document privacy features in README
    - _Requirements: 19.2_

- [ ] 48. Final deployment and launch
  - [ ] 48.1 Pre-launch checklist
    - Run all tests and ensure they pass
    - Test on all target browsers
    - Test on mobile devices
    - Verify all features work
    - Check performance metrics
    - Review all documentation
    - _Requirements: All requirements_

  - [ ] 48.2 Deploy to hosting platform
    - Choose hosting platform (GitHub Pages, Netlify, or Vercel)
    - Configure custom domain (optional)
    - Deploy application
    - Verify deployment works correctly
    - Test HTTPS is enforced
    - _Requirements: 18.1, 18.4_

  - [ ] 48.3 Post-launch monitoring
    - Monitor for any issues
    - Gather user feedback
    - Plan future enhancements
    - _Requirements: 14.3_

## Additional Notes for First-Time Developers

### Security Considerations
- **Never commit sensitive data**: Don't include real card numbers in test data or commits
- **HTTPS is essential**: Always use HTTPS in production to protect data in transit
- **Client-side only**: This app never sends data to servers, which is a key security feature
- **Encryption is not optional**: All sensitive data must be encrypted at rest

### Deployment Best Practices
- **Static hosting is sufficient**: No backend server needed, making deployment simple and cheap
- **Test before deploying**: Always test thoroughly in a local environment first
- **Use version control**: Commit code to Git regularly, use branches for features
- **Document everything**: Good documentation helps you and others understand the code

### Performance Tips
- **Start simple, optimize later**: Get features working first, then optimize
- **Test with realistic data**: Use 50-100 cards to test performance
- **Profile before optimizing**: Use browser DevTools to find actual bottlenecks
- **Progressive enhancement**: Start with core features, add enhancements incrementally

### Learning Resources
- **MDN Web Docs**: Best resource for HTML, CSS, JavaScript
- **Web Crypto API**: Learn about browser-based encryption
- **localStorage API**: Understand browser storage limitations
- **Accessibility**: Learn WCAG guidelines for inclusive design

### Common Pitfalls to Avoid
- **Don't use eval()**: Security risk, use safer alternatives
- **Don't trust user input**: Always validate and sanitize
- **Don't block the main thread**: Keep UI responsive with async operations
- **Don't ignore errors**: Handle all error cases gracefully
- **Don't skip testing**: Test early and often to catch issues

### Recommended Development Workflow
1. Set up version control (Git) from day one
2. Work on one task at a time, commit frequently
3. Test each feature before moving to the next
4. Use browser DevTools for debugging
5. Ask for help when stuck (forums, documentation, communities)
6. Take breaks and don't rush
7. Celebrate small wins along the way!

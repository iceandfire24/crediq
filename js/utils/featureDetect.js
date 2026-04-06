/**
 * Browser feature detection utility
 * Requirements: 22.3, 22.4
 *
 * Checks for Web Crypto API and localStorage support.
 * Displays a prominent warning banner if required features are missing.
 */

/**
 * Check whether the browser supports all features required by Card Manager.
 * @returns {boolean} true if all required features are present, false otherwise.
 */
export function checkBrowserCompatibility() {
  const missing = [];

  if (!hasWebCrypto()) {
    missing.push('Web Crypto API (window.crypto.subtle)');
  }

  if (!hasLocalStorage()) {
    missing.push('localStorage');
  }

  if (missing.length > 0) {
    showCompatibilityWarning(missing);
    return false;
  }

  return true;
}

/**
 * Detect Web Crypto API support.
 * @returns {boolean}
 */
export function hasWebCrypto() {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined'
  );
}

/**
 * Detect localStorage support.
 * @returns {boolean}
 */
export function hasLocalStorage() {
  try {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
      return false;
    }
    // Some browsers expose localStorage but throw on access (e.g. private mode in Safari)
    const testKey = '__cm_ls_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Render a prominent, non-dismissible warning banner explaining which
 * features are missing and advising the user to upgrade their browser.
 * @param {string[]} missingFeatures - List of missing feature names.
 */
function showCompatibilityWarning(missingFeatures) {
  // Avoid duplicate banners
  if (document.getElementById('browser-compat-warning')) return;

  const overlay = document.createElement('div');
  overlay.id = 'browser-compat-warning';
  overlay.setAttribute('role', 'alert');
  overlay.setAttribute('aria-live', 'assertive');
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:10000',
    'background:rgba(0,0,0,0.85)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'padding:24px'
  ].join(';');

  const box = document.createElement('div');
  box.style.cssText = [
    'background:#fff', 'color:#111', 'border-radius:12px',
    'padding:32px', 'max-width:480px', 'width:100%',
    'box-shadow:0 8px 32px rgba(0,0,0,0.4)',
    'font-family:system-ui,sans-serif', 'line-height:1.6'
  ].join(';');

  const title = document.createElement('h2');
  title.style.cssText = 'margin:0 0 12px;font-size:1.25rem;color:#b91c1c;';
  title.textContent = '⚠️ Browser Not Supported';

  const intro = document.createElement('p');
  intro.style.cssText = 'margin:0 0 12px;';
  intro.textContent =
    'Card Manager requires features that are not available in your current browser. ' +
    'The application cannot function without them.';

  const featureLabel = document.createElement('p');
  featureLabel.style.cssText = 'margin:0 0 6px;font-weight:600;';
  featureLabel.textContent = 'Missing features:';

  const featureList = document.createElement('ul');
  featureList.style.cssText = 'margin:0 0 16px;padding-left:20px;';
  missingFeatures.forEach((f) => {
    const li = document.createElement('li');
    li.textContent = f;
    featureList.appendChild(li);
  });

  const advice = document.createElement('p');
  advice.style.cssText = 'margin:0;font-size:0.9rem;color:#555;';
  advice.textContent =
    'Please use a modern browser such as Chrome, Firefox, Edge, or Safari (version 15+) ' +
    'and ensure you are accessing the app over HTTPS.';

  box.appendChild(title);
  box.appendChild(intro);
  box.appendChild(featureLabel);
  box.appendChild(featureList);
  box.appendChild(advice);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

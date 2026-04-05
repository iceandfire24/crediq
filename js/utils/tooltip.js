/**
 * Tooltip Utility
 * Accessible hover/focus tooltips for elements with data-tooltip attributes.
 * Requirements: 20.6
 */

const TOOLTIP_ID = 'tooltip-bubble';

let _activeTooltip = null;
let _activeTarget = null;

/**
 * Scan the DOM for elements with data-tooltip and attach hover/focus handlers.
 * @param {HTMLElement} [root=document] - Root element to scan
 */
function initTooltips(root = document) {
  const elements = root.querySelectorAll('[data-tooltip]');
  elements.forEach((el) => {
    // Avoid double-binding
    if (el._tooltipBound) return;
    el._tooltipBound = true;

    el.addEventListener('mouseenter', () => showTooltip(el, el.dataset.tooltip));
    el.addEventListener('mouseleave', hideTooltip);
    el.addEventListener('focus', () => showTooltip(el, el.dataset.tooltip));
    el.addEventListener('blur', hideTooltip);
  });
}

/**
 * Create and position a tooltip near the given element.
 * @param {HTMLElement} element - The anchor element
 * @param {string} text - Tooltip text
 */
function showTooltip(element, text) {
  hideTooltip();

  if (!text) return;

  const tooltipId = TOOLTIP_ID + '-' + Date.now();

  const bubble = document.createElement('div');
  bubble.id = tooltipId;
  bubble.className = 'tooltip-bubble';
  bubble.setAttribute('role', 'tooltip');
  bubble.textContent = text;

  document.body.appendChild(bubble);
  _activeTooltip = bubble;
  _activeTarget = element;

  // Link element to tooltip for accessibility
  element.setAttribute('aria-describedby', tooltipId);

  // Position the tooltip
  _positionTooltip(bubble, element);
}

/**
 * Remove the active tooltip from the DOM.
 */
function hideTooltip() {
  if (_activeTooltip) {
    if (_activeTarget) {
      _activeTarget.removeAttribute('aria-describedby');
      _activeTarget = null;
    }
    _activeTooltip.remove();
    _activeTooltip = null;
  }
}

/**
 * Position the tooltip above the element, falling back to below if needed.
 * @param {HTMLElement} bubble
 * @param {HTMLElement} anchor
 */
function _positionTooltip(bubble, anchor) {
  const anchorRect = anchor.getBoundingClientRect();
  const bubbleRect = bubble.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;

  let top = anchorRect.top + scrollY - bubbleRect.height - 8;
  let left = anchorRect.left + scrollX + anchorRect.width / 2 - bubbleRect.width / 2;

  // Flip below if not enough space above
  if (top < scrollY) {
    top = anchorRect.bottom + scrollY + 8;
    bubble.classList.add('tooltip-below');
  }

  // Clamp horizontally
  const maxLeft = window.innerWidth - bubbleRect.width - 8;
  left = Math.max(8, Math.min(left, maxLeft));

  bubble.style.top = `${top}px`;
  bubble.style.left = `${left}px`;
}

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initTooltips, showTooltip, hideTooltip };
}

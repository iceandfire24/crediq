import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Router } from '../js/router.js';

// ─── Browser API mocks ────────────────────────────────────────────────────────

let currentHash = '';
const eventListeners = {};

const locationMock = {
  get hash() { return currentHash; },
  set hash(val) { currentHash = val.startsWith('#') ? val : `#${val}`; },
};

const windowMock = {
  location: locationMock,
  addEventListener: vi.fn((event, handler) => {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(handler);
  }),
  removeEventListener: vi.fn((event, handler) => {
    if (eventListeners[event]) {
      eventListeners[event] = eventListeners[event].filter(h => h !== handler);
    }
  }),
  dispatchEvent: (event) => {
    const handlers = eventListeners[event.type] || [];
    handlers.forEach(h => h(event));
  },
};

vi.stubGlobal('window', windowMock);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Router', () => {
  let router;

  beforeEach(() => {
    currentHash = '';
    // Clear event listeners
    Object.keys(eventListeners).forEach(k => { eventListeners[k] = []; });
    windowMock.addEventListener.mockClear();
    windowMock.removeEventListener.mockClear();
    router = new Router();
  });

  afterEach(() => {
    router.stop();
  });

  describe('route registration', () => {
    it('registers a route and returns the router for chaining', () => {
      const result = router.register('/cards', () => {});
      expect(result).toBe(router);
    });

    it('registers multiple routes', () => {
      router.register('/cards', () => {});
      router.register('/add', () => {});
      router.register('/settings', () => {});
      expect(router.routes).toHaveLength(3);
    });
  });

  describe('parameter extraction', () => {
    it('extracts :id from /card/:id route', () => {
      let capturedParams = null;
      router.register('/card/:id', (params) => {
        capturedParams = params;
      });

      router._resolve('/card/abc-123');
      expect(capturedParams).toEqual({ id: 'abc-123' });
    });

    it('returns empty params for routes without parameters', () => {
      let capturedParams = null;
      router.register('/cards', (params) => {
        capturedParams = params;
      });

      router._resolve('/cards');
      expect(capturedParams).toEqual({});
    });

    it('extracts multiple parameters', () => {
      let capturedParams = null;
      router.register('/section/:section/item/:id', (params) => {
        capturedParams = params;
      });

      router._resolve('/section/cards/item/42');
      expect(capturedParams).toEqual({ section: 'cards', id: '42' });
    });
  });

  describe('route matching', () => {
    it('matches /cards route', () => {
      const handler = vi.fn();
      router.register('/cards', handler);
      router._resolve('/cards');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('matches /add route', () => {
      const handler = vi.fn();
      router.register('/add', handler);
      router._resolve('/add');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('matches /card/:id route', () => {
      const handler = vi.fn();
      router.register('/card/:id', handler);
      router._resolve('/card/some-id');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('matches /calendar route', () => {
      const handler = vi.fn();
      router.register('/calendar', handler);
      router._resolve('/calendar');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('matches /stats route', () => {
      const handler = vi.fn();
      router.register('/stats', handler);
      router._resolve('/stats');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('matches /settings route', () => {
      const handler = vi.fn();
      router.register('/settings', handler);
      router._resolve('/settings');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('matches /about route', () => {
      const handler = vi.fn();
      router.register('/about', handler);
      router._resolve('/about');
      expect(handler).toHaveBeenCalledOnce();
    });

    it('does not match a different route', () => {
      const handler = vi.fn();
      router.register('/cards', handler);
      router._resolve('/add');
      expect(handler).not.toHaveBeenCalled();
    });

    it('does not partially match routes', () => {
      const handler = vi.fn();
      router.register('/cards', handler);
      router._resolve('/cards/extra');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('sets window.location.hash when navigating', () => {
      router.navigate('/cards');
      expect(window.location.hash).toBe('#/cards');
    });

    it('navigates to /add', () => {
      router.navigate('/add');
      expect(window.location.hash).toBe('#/add');
    });
  });

  describe('currentRoute tracking', () => {
    it('updates currentRoute after resolving', () => {
      router.register('/cards', () => {});
      router._resolve('/cards');
      expect(router.currentRoute).toEqual({ path: '/cards', params: {} });
    });

    it('stores params in currentRoute', () => {
      router.register('/card/:id', () => {});
      router._resolve('/card/xyz');
      expect(router.currentRoute).toEqual({ path: '/card/:id', params: { id: 'xyz' } });
    });
  });

  describe('browser history support (hashchange)', () => {
    it('registers hashchange listener on start()', () => {
      router.start();
      expect(windowMock.addEventListener).toHaveBeenCalledWith('hashchange', expect.any(Function));
    });

    it('removes hashchange listener on stop()', () => {
      router.start();
      router.stop();
      expect(windowMock.removeEventListener).toHaveBeenCalledWith('hashchange', expect.any(Function));
    });

    it('calls handler when hashchange event fires', () => {
      const handler = vi.fn();
      router.register('/cards', handler);
      router.start();

      // Simulate hash change
      currentHash = '#/cards';
      windowMock.dispatchEvent(new Event('hashchange'));

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('default route fallback', () => {
    it('navigates to /cards when no route matches', () => {
      router.register('/cards', () => {});
      router._resolve('/nonexistent');
      expect(window.location.hash).toBe('#/cards');
    });
  });
});

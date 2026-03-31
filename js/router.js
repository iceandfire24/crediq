// Client-side Router
// Hash-based routing for single page application

export class Router {
  constructor() {
    this.routes = [];
    this.currentRoute = null;
    this._onHashChange = this._onHashChange.bind(this);
  }

  /**
   * Register a route with a handler
   * @param {string} path - Route path (e.g. '/cards', '/card/:id')
   * @param {Function} handler - Function called when route matches
   */
  register(path, handler) {
    this.routes.push({ path, handler, pattern: this._pathToRegex(path) });
    return this;
  }

  /**
   * Navigate to a route programmatically
   * @param {string} path - Route path to navigate to
   */
  navigate(path) {
    window.location.hash = path;
  }

  /**
   * Start the router - listen for hash changes and handle current hash
   */
  start() {
    window.addEventListener('hashchange', this._onHashChange);
    this._onHashChange();
  }

  /**
   * Stop the router - remove event listeners
   */
  stop() {
    window.removeEventListener('hashchange', this._onHashChange);
  }

  /**
   * Handle hash change events
   * @private
   */
  _onHashChange() {
    const hash = window.location.hash || '#/cards';
    // Strip leading '#'
    const path = hash.startsWith('#') ? hash.slice(1) : hash;
    this._resolve(path || '/cards');
  }

  /**
   * Resolve a path against registered routes
   * @param {string} path
   * @private
   */
  _resolve(path) {
    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        const params = this._extractParams(route.path, match);
        this.currentRoute = { path: route.path, params };
        route.handler(params);
        return;
      }
    }
    // No route matched - navigate to default
    this.navigate('/cards');
  }

  /**
   * Convert a route path string to a regex
   * e.g. '/card/:id' -> /^\/card\/([^/]+)$/
   * @param {string} path
   * @returns {RegExp}
   * @private
   */
  _pathToRegex(path) {
    const escaped = path.replace(/\//g, '\\/');
    const pattern = escaped.replace(/:([^/]+)/g, '([^\\/]+)');
    return new RegExp(`^${pattern}$`);
  }

  /**
   * Extract named parameters from a matched route
   * @param {string} routePath - The registered route path (e.g. '/card/:id')
   * @param {RegExpMatchArray} match - The regex match result
   * @returns {Object} - Key/value pairs of extracted params
   * @private
   */
  _extractParams(routePath, match) {
    const paramNames = [];
    const paramRegex = /:([^/]+)/g;
    let m;
    while ((m = paramRegex.exec(routePath)) !== null) {
      paramNames.push(m[1]);
    }
    const params = {};
    paramNames.forEach((name, index) => {
      params[name] = match[index + 1];
    });
    return params;
  }
}

// Default export for convenience
export default Router;

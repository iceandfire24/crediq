/**
 * Encryption Service
 * Web Crypto API - AES-GCM 256-bit encryption with PBKDF2 key derivation
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 */

const STORAGE_KEYS = {
  SALT: 'cm_salt',
  VERIFY: 'cm_verify',
  KEY: 'cm_key'
};

const PBKDF2_ITERATIONS = 200000;
const VERIFY_PLAINTEXT = 'card-manager-verify-token';

class EncryptionService {
  /**
   * Derive an AES-GCM CryptoKey from a password and salt using PBKDF2
   * @param {string} password
   * @param {Uint8Array} salt
   * @returns {Promise<CryptoKey>}
   */
  async deriveKey(password, salt) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt plaintext using AES-GCM with a random IV
   * @param {string} plaintext
   * @param {CryptoKey} key
   * @returns {Promise<string>} Base64-encoded IV + ciphertext
   */
  async encrypt(plaintext, key) {
    try {
      const enc = new TextEncoder();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plaintext)
      );
      // Prepend IV to ciphertext
      const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.byteLength);
      return btoa(String.fromCharCode(...combined));
    } catch (err) {
      if (err instanceof DOMException) {
        const e = new Error('Encryption failed. Please check your master password.');
        e.name = 'EncryptionError';
        throw e;
      }
      throw err;
    }
  }

  /**
   * Decrypt AES-GCM ciphertext (with prepended IV)
   * @param {string} ciphertext - Base64-encoded IV + ciphertext
   * @param {CryptoKey} key
   * @returns {Promise<string>} Decrypted plaintext
   */
  async decrypt(ciphertext, key) {
    try {
      const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      return new TextDecoder().decode(decrypted);
    } catch (err) {
      if (err instanceof DOMException) {
        const e = new Error('Decryption failed. The data may be corrupted or the key is incorrect.');
        e.name = 'EncryptionError';
        throw e;
      }
      throw err;
    }
  }

  /**
   * Store a CryptoKey in sessionStorage as JWK
   * @param {CryptoKey} key
   * @returns {Promise<void>}
   */
  async storeKeyInSession(key) {
    const jwk = await crypto.subtle.exportKey('jwk', key);
    sessionStorage.setItem(STORAGE_KEYS.KEY, JSON.stringify(jwk));
  }

  /**
   * Retrieve and re-import the CryptoKey from sessionStorage
   * @returns {Promise<CryptoKey|null>}
   */
  async getKeyFromSession() {
    const raw = sessionStorage.getItem(STORAGE_KEYS.KEY);
    if (!raw) return null;
    const jwk = JSON.parse(raw);
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Remove the encryption key from sessionStorage
   */
  clearSession() {
    sessionStorage.removeItem(STORAGE_KEYS.KEY);
  }

  /**
   * First-time setup: generate salt, derive key, store salt and verification token
   * @param {string} password
   * @returns {Promise<CryptoKey>}
   */
  async initializeMasterPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await this.deriveKey(password, salt);

    // Store salt as base64
    localStorage.setItem(STORAGE_KEYS.SALT, btoa(String.fromCharCode(...salt)));

    // Store encrypted verification token
    const verifyToken = await this.encrypt(VERIFY_PLAINTEXT, key);
    localStorage.setItem(STORAGE_KEYS.VERIFY, verifyToken);

    await this.storeKeyInSession(key);
    return key;
  }

  /**
   * Subsequent logins: retrieve salt, derive key, verify against stored token
   * @param {string} password
   * @returns {Promise<CryptoKey>}
   * @throws {Error} If password is incorrect
   */
  async verifyMasterPassword(password) {
    try {
      const saltB64 = localStorage.getItem(STORAGE_KEYS.SALT);
      if (!saltB64) throw new Error('No master password set');

      const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
      const key = await this.deriveKey(password, salt);

      const verifyToken = localStorage.getItem(STORAGE_KEYS.VERIFY);
      if (!verifyToken) throw new Error('Verification token missing');

      try {
        const decrypted = await this.decrypt(verifyToken, key);
        if (decrypted !== VERIFY_PLAINTEXT) throw new Error('Incorrect password');
      } catch {
        throw new Error('Incorrect password');
      }

      await this.storeKeyInSession(key);
      return key;
    } catch (err) {
      // Re-throw errors that are already descriptive
      if (err.message === 'No master password set' || err.message === 'Verification token missing' ||
          err.message === 'Incorrect password') {
        throw err;
      }
      if (err instanceof DOMException) {
        throw new Error('Incorrect password');
      }
      throw err;
    }
  }

  /**
   * Encrypt a full data object with a user-provided password for export
   * @param {*} data - Any JSON-serializable value
   * @param {string} password
   * @returns {Promise<Object>} JSON-serializable encrypted package
   */
  async encryptExport(data, password) {
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const key = await this.deriveKey(password, salt);
      const plaintext = JSON.stringify(data);
      const ciphertext = await this.encrypt(plaintext, key);
      return {
        version: 1,
        salt: btoa(String.fromCharCode(...salt)),
        data: ciphertext
      };
    } catch (err) {
      if (err instanceof DOMException) {
        const e = new Error('Encryption error. Please check your master password.');
        e.name = 'EncryptionError';
        throw e;
      }
      throw err;
    }
  }

  /**
   * Decrypt an export package using the provided password
   * @param {Object} encryptedData - Package from encryptExport()
   * @param {string} password
   * @returns {Promise<*>} Decrypted and parsed data
   * @throws {Error} If password is incorrect or data is corrupt
   */
  async decryptImport(encryptedData, password) {
    const { salt: saltB64, data: ciphertext } = encryptedData;
    if (!saltB64 || !ciphertext) throw new Error('Invalid export package');

    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const key = await this.deriveKey(password, salt);

    let plaintext;
    try {
      plaintext = await this.decrypt(ciphertext, key);
    } catch {
      throw new Error('Incorrect password or corrupted data');
    }

    try {
      return JSON.parse(plaintext);
    } catch {
      throw new SyntaxError('Invalid data format. The file may be corrupted.');
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EncryptionService };
}

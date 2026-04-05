// @vitest-environment jsdom
/**
 * Unit tests for the centralized error handler utility
 * Requirements: 6.7, 15.6, 20.3, 20.5, 20.8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const { handleError, isQuotaExceededError, isEncryptionError, getErrorMessage } =
  require('../../js/utils/errorHandler.js');

// ─── isQuotaExceededError ─────────────────────────────────────────────────────

describe('isQuotaExceededError', () => {
  it('returns true for an error named QuotaExceededError', () => {
    const err = new Error('quota');
    err.name = 'QuotaExceededError';
    expect(isQuotaExceededError(err)).toBe(true);
  });

  it('returns true for Firefox NS_ERROR_DOM_QUOTA_REACHED', () => {
    const err = new Error('quota');
    err.name = 'NS_ERROR_DOM_QUOTA_REACHED';
    expect(isQuotaExceededError(err)).toBe(true);
  });

  it('returns true for DOMException named QuotaExceededError', () => {
    // DOMException with name 'QuotaExceededError' — code is read-only so we use the name
    const err = new DOMException('quota exceeded', 'QuotaExceededError');
    expect(isQuotaExceededError(err)).toBe(true);
  });

  it('returns true when message contains "quota" (case-insensitive)', () => {
    const err = new Error('Storage Quota exceeded');
    expect(isQuotaExceededError(err)).toBe(true);
  });

  it('returns false for a generic error', () => {
    expect(isQuotaExceededError(new Error('something else'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isQuotaExceededError(null)).toBe(false);
  });
});

// ─── isEncryptionError ────────────────────────────────────────────────────────

describe('isEncryptionError', () => {
  it('returns true for a DOMException (Web Crypto throws these)', () => {
    const err = new DOMException('The operation failed', 'OperationError');
    expect(isEncryptionError(err)).toBe(true);
  });

  it('returns true for an error named EncryptionError', () => {
    const err = new Error('enc failed');
    err.name = 'EncryptionError';
    expect(isEncryptionError(err)).toBe(true);
  });

  it('returns true when message contains "incorrect password"', () => {
    const err = new Error('Incorrect password');
    expect(isEncryptionError(err)).toBe(true);
  });

  it('returns true when message contains "corrupted data"', () => {
    const err = new Error('corrupted data found');
    expect(isEncryptionError(err)).toBe(true);
  });

  it('returns true when message contains "decryption"', () => {
    const err = new Error('Decryption failed');
    expect(isEncryptionError(err)).toBe(true);
  });

  it('returns false for a generic Error', () => {
    expect(isEncryptionError(new Error('network timeout'))).toBe(false);
  });

  it('returns false for null', () => {
    expect(isEncryptionError(null)).toBe(false);
  });
});

// ─── getErrorMessage ──────────────────────────────────────────────────────────

describe('getErrorMessage', () => {
  it('returns storage-full message for QuotaExceededError', () => {
    const err = new Error('quota');
    err.name = 'QuotaExceededError';
    expect(getErrorMessage(err)).toBe(
      'Storage is full. Please export your data and clear some space.'
    );
  });

  it('returns encryption message for DOMException (crypto error)', () => {
    const err = new DOMException('The operation failed', 'OperationError');
    expect(getErrorMessage(err)).toBe(
      'Encryption error. Please check your master password.'
    );
  });

  it('returns invalid data message for SyntaxError', () => {
    const err = new SyntaxError('Unexpected token');
    expect(getErrorMessage(err)).toBe(
      'Invalid data format. The file may be corrupted.'
    );
  });

  it('returns invalid data message for error with name SyntaxError', () => {
    const err = new Error('bad json');
    err.name = 'SyntaxError';
    expect(getErrorMessage(err)).toBe(
      'Invalid data format. The file may be corrupted.'
    );
  });

  it('returns generic message for unknown error with no message', () => {
    const err = new Error();
    expect(getErrorMessage(err)).toBe('Something went wrong. Please try again.');
  });

  it('returns generic message for null', () => {
    expect(getErrorMessage(null)).toBe('Something went wrong. Please try again.');
  });

  it('returns the error message for a plain Error with a message', () => {
    const err = new Error('Custom user-facing message');
    expect(getErrorMessage(err)).toBe('Custom user-facing message');
  });
});

// ─── handleError ─────────────────────────────────────────────────────────────

describe('handleError', () => {
  let toastMock;

  beforeEach(() => {
    toastMock = vi.fn();
  });

  it('calls showToast with type "error"', () => {
    handleError(new Error('oops'), '', toastMock);
    expect(toastMock).toHaveBeenCalledOnce();
    expect(toastMock.mock.calls[0][1]).toBe('error');
  });

  it('calls showToast with the quota-exceeded message for QuotaExceededError', () => {
    const err = new Error('quota');
    err.name = 'QuotaExceededError';
    handleError(err, '', toastMock);
    expect(toastMock).toHaveBeenCalledWith(
      'Storage is full. Please export your data and clear some space.',
      'error'
    );
  });

  it('calls showToast with the encryption message for DOMException', () => {
    const err = new DOMException('op failed', 'OperationError');
    handleError(err, '', toastMock);
    expect(toastMock).toHaveBeenCalledWith(
      'Encryption error. Please check your master password.',
      'error'
    );
  });

  it('calls showToast with the invalid-data message for SyntaxError', () => {
    handleError(new SyntaxError('bad json'), '', toastMock);
    expect(toastMock).toHaveBeenCalledWith(
      'Invalid data format. The file may be corrupted.',
      'error'
    );
  });

  it('calls showToast with the generic message for an unknown error', () => {
    handleError(new Error(), '', toastMock);
    expect(toastMock).toHaveBeenCalledWith(
      'Something went wrong. Please try again.',
      'error'
    );
  });

  it('does not throw when called with null', () => {
    expect(() => handleError(null, '', toastMock)).not.toThrow();
    expect(toastMock).toHaveBeenCalledOnce();
  });
});

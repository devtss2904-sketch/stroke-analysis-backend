/**
 * Normalization utilities for emails and phone numbers
 */

/**
 * Clean and lowercase email address
 * @param {string} email
 * @returns {string|null}
 */
const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  const clean = email.trim().toLowerCase();
  return clean || null;
};

/**
 * Clean and standardize phone number:
 * - Strips whitespace, dashes, parentheses, dots
 * - Converts leading '00' to '+'
 * @param {string} phone
 * @returns {string|null}
 */
const normalizePhone = (phone) => {
  if (!phone) return null;
  let clean = phone.toString().trim();
  // Strip spaces, dashes, parentheses, dots
  clean = clean.replace(/[\s\-\(\)\.]/g, '');
  // Normalize international prefix 00 to +
  if (clean.startsWith('00')) {
    clean = '+' + clean.slice(2);
  }
  return clean || null;
};

/**
 * Extract trailing 10 significant digits of a phone number for fallback lookups
 * @param {string} phone
 * @returns {string|null}
 */
const extractSignificantDigits = (phone) => {
  if (!phone) return null;
  const digits = phone.toString().replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits || null;
};

module.exports = {
  normalizeEmail,
  normalizePhone,
  extractSignificantDigits,
};


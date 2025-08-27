/**
 * Phone normalization utilities for Saudi phone numbers
 * Handles conversion to E.164 format (+966...)
 */

/**
 * Normalizes a Saudi phone number to E.164 format
 * @param raw - Raw phone number string
 * @returns Normalized E.164 phone number or null if invalid
 */
export function normalizeToE164Saudi(raw: string): string | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  // Remove all whitespace, dashes, parentheses, and other non-digit characters except +
  let cleaned = raw.replace(/[\s\-\(\)\.]/g, '');

  // Handle different Saudi phone number formats
  if (cleaned.startsWith('+966')) {
    // Already in E.164 format
    return cleaned.length === 13 ? cleaned : null; // +966XXXXXXXXX (13 chars total)
  }

  if (cleaned.startsWith('966')) {
    // Missing + prefix
    const full = '+' + cleaned;
    return full.length === 13 ? full : null;
  }

  if (cleaned.startsWith('00966')) {
    // International dialing format
    return cleaned.replace('00966', '+966');
  }

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    // Local format: 05XXXXXXXX
    // Saudi mobile numbers start with 05 and are 10 digits total
    if (cleaned[1] === '5') {
      return '+966' + cleaned.substring(1); // Remove leading 0, add +966
    }
  }

  // If we get here, the format is not recognized
  return null;
}

/**
 * Validates if a phone number is a valid Saudi mobile number
 * @param phone - Phone number to validate
 * @returns true if valid Saudi mobile, false otherwise
 */
export function isValidSaudiMobile(phone: string): boolean {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  const normalized = normalizeToE164Saudi(phone);
  if (!normalized) {
    return false;
  }

  // Saudi mobile numbers: +9665XXXXXXXX
  return normalized.startsWith('+9665') && normalized.length === 13;
}

/**
 * Formats a phone number for display (removes +966 prefix for local display)
 * @param phone - E.164 formatted phone number
 * @returns Display-friendly format or original if not Saudi
 */
export function formatPhoneForDisplay(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return phone || '';
  }

  if (phone.startsWith('+966')) {
    return phone.substring(4); // Remove +966 prefix
  }

  return phone;
}

/**
 * Gets WhatsApp link for a phone number
 * @param phone - E.164 formatted phone number
 * @param text - Optional message text
 * @returns WhatsApp link or null if invalid
 */
export function getWhatsAppLink(phone: string, text?: string): string | null {
  if (!phone || typeof phone !== 'string') {
    return null;
  }

  const normalized = normalizeToE164Saudi(phone);
  if (!normalized) {
    return null;
  }

  // WhatsApp expects the number without + prefix
  const whatsappNumber = normalized.substring(1);
  const encodedText = text ? encodeURIComponent(text) : '';

  return `https://wa.me/${whatsappNumber}${encodedText ? `?text=${encodedText}` : ''}`;
}

// Export types for better TypeScript support
export type PhoneNormalizationResult = {
  original: string;
  normalized: string | null;
  isValid: boolean;
  error?: string;
};

/**
 * Normalizes a phone number with detailed result information
 * @param raw - Raw phone number string
 * @returns Detailed normalization result
 */
export function normalizePhoneWithDetails(raw: string): PhoneNormalizationResult {
  const normalized = normalizeToE164Saudi(raw);

  return {
    original: raw,
    normalized,
    isValid: normalized !== null,
    error: normalized === null ? 'Invalid Saudi phone number format' : undefined
  };
}
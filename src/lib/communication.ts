import { getWhatsAppLink, normalizeToE164Saudi } from './phone';

/**
 * Communication helpers for customer interactions
 * Provides utilities to check communication availability and generate links
 */

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone_mobile?: string | null;
  phone_work?: string | null;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  preferred_contact?: string | null;
}

/**
 * Checks if email communication is available for a customer
 * @param customer - Customer object
 * @returns true if email is enabled and email address exists
 */
export function canSendEmail(customer: Customer): boolean {
  return !!(customer.email && customer.email_enabled);
}

/**
 * Checks if WhatsApp communication is available for a customer
 * @param customer - Customer object
 * @returns true if WhatsApp is enabled and mobile phone exists
 */
export function canSendWhatsApp(customer: Customer): boolean {
  return !!(customer.phone_mobile && customer.whatsapp_enabled);
}

/**
 * Generates WhatsApp link for a customer
 * @param customer - Customer object
 * @param text - Optional message text to pre-fill
 * @returns WhatsApp link or null if not available
 */
export function whatsAppLink(customer: Customer, text?: string): string | null {
  if (!canSendWhatsApp(customer)) {
    return null;
  }

  return getWhatsAppLink(customer.phone_mobile!, text);
}

/**
 * Gets the primary contact method for a customer
 * @param customer - Customer object
 * @returns Primary contact method ('email', 'mobile', 'work', 'whatsapp') or null
 */
export function getPrimaryContactMethod(customer: Customer): string | null {
  // If preferred_contact is set, use it
  if (customer.preferred_contact) {
    return customer.preferred_contact;
  }

  // Otherwise, determine based on available and enabled methods
  if (canSendWhatsApp(customer)) {
    return 'whatsapp';
  }

  if (customer.phone_mobile) {
    return 'mobile';
  }

  if (customer.phone_work) {
    return 'work';
  }

  if (canSendEmail(customer)) {
    return 'email';
  }

  return null;
}

/**
 * Gets all available contact methods for a customer
 * @param customer - Customer object
 * @returns Array of available contact methods
 */
export function getAvailableContactMethods(customer: Customer): string[] {
  const methods: string[] = [];

  if (canSendEmail(customer)) {
    methods.push('email');
  }

  if (customer.phone_mobile) {
    methods.push('mobile');
  }

  if (customer.phone_work) {
    methods.push('work');
  }

  if (canSendWhatsApp(customer)) {
    methods.push('whatsapp');
  }

  return methods;
}

/**
 * Generates a contact link based on the preferred method
 * @param customer - Customer object
 * @param text - Optional message text for WhatsApp
 * @returns Contact link or null if no method available
 */
export function getPrimaryContactLink(customer: Customer, text?: string): string | null {
  const method = getPrimaryContactMethod(customer);

  switch (method) {
    case 'email':
      return customer.email ? `mailto:${customer.email}` : null;

    case 'whatsapp':
      return whatsAppLink(customer, text);

    case 'mobile':
      return customer.phone_mobile ? `tel:${customer.phone_mobile}` : null;

    case 'work':
      return customer.phone_work ? `tel:${customer.phone_work}` : null;

    default:
      return null;
  }
}

/**
 * Formats customer display name based on available information
 * @param customer - Customer object
 * @returns Formatted display name
 */
export function getCustomerDisplayName(customer: Customer): string {
  // If company name exists, use it
  if (customer.name && customer.name.trim()) {
    return customer.name.trim();
  }

  // Otherwise, construct from first/last name (though this shouldn't happen with new data)
  // This is for backward compatibility
  return 'Unknown Customer';
}

/**
 * Gets customer contact summary for display
 * @param customer - Customer object
 * @returns Object with contact summary information
 */
export function getCustomerContactSummary(customer: Customer) {
  return {
    displayName: getCustomerDisplayName(customer),
    primaryMethod: getPrimaryContactMethod(customer),
    availableMethods: getAvailableContactMethods(customer),
    canEmail: canSendEmail(customer),
    canWhatsApp: canSendWhatsApp(customer),
    email: customer.email,
    phoneMobile: customer.phone_mobile,
    phoneWork: customer.phone_work
  };
}
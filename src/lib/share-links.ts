// Links that hand a prepared message to the user's own email app or WhatsApp.
// Billio has no outgoing email service yet, so documents are sent from the
// user's own accounts.

/** mailto: link with subject and body. */
export function mailtoUrl(email: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * wa.me link. A complete 8-digit local number gets the default country code
 * (226 = Burkina Faso); longer numbers are taken to include their country code.
 * Anything shorter isn't a usable number, so WhatsApp opens its contact picker.
 */
export function whatsappUrl(phone: string | undefined, text: string, defaultCountryCode = '226'): string {
  let digits = (phone ?? '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.length === 8) digits = defaultCountryCode + digits;
  const base = digits.length > 8 ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
}

/** Placeholder values stored as "—" by the client forms count as missing. */
export function contactValue(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t && t !== '—' ? t : undefined;
}

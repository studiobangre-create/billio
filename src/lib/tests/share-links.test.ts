import { describe, it, expect } from 'vitest';
import { mailtoUrl, whatsappUrl, contactValue } from '@/lib/share-links';

describe('mailtoUrl', () => {
  it('encodes subject and body', () => {
    expect(mailtoUrl(' a@b.bf ', 'Facture #INV-0001', 'Bonjour,\nMerci & à bientôt'))
      .toBe('mailto:a%40b.bf?subject=Facture%20%23INV-0001&body=Bonjour%2C%0AMerci%20%26%20%C3%A0%20bient%C3%B4t');
  });
});

describe('whatsappUrl', () => {
  it('adds the default country code to local numbers', () => {
    expect(whatsappUrl('70 12 34 56', 'Hi')).toBe('https://wa.me/22670123456?text=Hi');
  });

  it('keeps international numbers', () => {
    expect(whatsappUrl('+223 66 77 88 99', 'Hi')).toBe('https://wa.me/22366778899?text=Hi');
    expect(whatsappUrl('00225 07 00 00 00 00', 'Hi')).toBe('https://wa.me/2250700000000?text=Hi');
  });

  it('opens the contact picker without a usable number', () => {
    expect(whatsappUrl('—', 'Hi')).toBe('https://wa.me/?text=Hi');
    expect(whatsappUrl(undefined, 'a b')).toBe('https://wa.me/?text=a%20b');
    // An incomplete local number must not become a link to someone else's number
    expect(whatsappUrl('70 12 345', 'Hi')).toBe('https://wa.me/?text=Hi');
  });
});

describe('contactValue', () => {
  it('treats empty and placeholder values as missing', () => {
    expect(contactValue('—')).toBeUndefined();
    expect(contactValue('  ')).toBeUndefined();
    expect(contactValue(undefined)).toBeUndefined();
    expect(contactValue(' x@y.bf ')).toBe('x@y.bf');
  });
});

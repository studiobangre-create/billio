import { describe, it, expect } from 'vitest';
import { chargesVat, documentHasVat, splitTtc, vatOn } from '@/lib/vat';

describe('vat', () => {
  it('only RNI organisations charge VAT', () => {
    expect(chargesVat('RNI')).toBe(true);
    expect(chargesVat('RSI')).toBe(false);
    expect(chargesVat(undefined)).toBe(false);
  });

  it('computes VAT on a pre-tax amount', () => {
    expect(vatOn(100_000, true)).toBe(18_000);
    expect(vatOn(100_000, false)).toBe(0);
  });

  it('splits a VAT-inclusive amount so the parts add back up', () => {
    expect(splitTtc(118_000, true)).toEqual({ ht: 100_000, tva: 18_000 });
    const { ht, tva } = splitTtc(99_999, true);
    expect(ht + tva).toBe(99_999);
    expect(splitTtc(50_000, false)).toEqual({ ht: 50_000, tva: 0 });
  });
});

describe('documentHasVat', () => {
  it('reads VAT from the stored total, not the current regime', () => {
    expect(documentHasVat(118_000, 100_000, false)).toBe(true);
    expect(documentHasVat(100_000, 100_000, true)).toBe(false);
  });
  it('falls back when the total says nothing', () => {
    expect(documentHasVat(0, 0, true)).toBe(true);
    expect(documentHasVat(0, 0, false)).toBe(false);
  });
});

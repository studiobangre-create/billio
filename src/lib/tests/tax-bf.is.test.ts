import { describe, it, expect } from 'vitest';
import { calculateIS } from '@/lib/tax-bf';

describe('calculateIS — rate', () => {
  it('is 27.5% of taxable profit rounded to nearest 1 000 F', () => {
    expect(calculateIS({ taxableProfit: 10_000_000, regime: 'RNI', isAdherentCGA: false }))
      .toBe(2_750_000);
  });

  it('returns computed IS (not minimum) when IS > minimum', () => {
    const is = calculateIS({
      taxableProfit:    100_000_000,
      regime:           'RNI',
      isAdherentCGA:    false,
      annualTurnoverHT: 200_000_000,
      taxYear:          2025,
    });
    expect(is).toBe(Math.round(Math.floor(100_000_000 / 1_000) * 1_000 * 0.275));
  });
});

describe('calculateIS — minimum forfaitaire (fixed floor)', () => {
  it('minimum applies when profit is negative (not first year)', () => {
    const is = calculateIS({ taxableProfit: -500_000, regime: 'RNI', isAdherentCGA: false, annualTurnoverHT: 60_000_000 });
    expect(is).toBeGreaterThan(0);
  });

  it('first-year businesses skip the minimum forfaitaire entirely', () => {
    expect(calculateIS({ taxableProfit: 0, regime: 'RNI', isAdherentCGA: false, isFirstYear: true })).toBe(0);
  });

  it('RSI fixed floor is 300 000', () => {
    expect(calculateIS({ taxableProfit: 0, regime: 'RSI', isAdherentCGA: false, annualTurnoverHT: 0, taxYear: 2025 }))
      .toBe(300_000);
  });

  it('RNI fixed floor is 1 000 000', () => {
    expect(calculateIS({ taxableProfit: 0, regime: 'RNI', isAdherentCGA: false, annualTurnoverHT: 0, taxYear: 2025 }))
      .toBe(1_000_000);
  });

  it('CGA adherent gets 50% reduction on the fixed minimum', () => {
    const nonCga = calculateIS({ taxableProfit: 0, regime: 'RNI', isAdherentCGA: false, annualTurnoverHT: 0 });
    const cga    = calculateIS({ taxableProfit: 0, regime: 'RNI', isAdherentCGA: true,  annualTurnoverHT: 0 });
    expect(cga).toBe(nonCga / 2);
  });
});

describe('calculateIS — CA-based minimum forfaitaire (Art.89)', () => {
  it('uses 0.5% × CA when it exceeds the RNI fixed floor', () => {
    // 0.5% × 300M = 1 500 000 > 1 000 000 fixed
    expect(calculateIS({ taxableProfit: 0, regime: 'RNI', isAdherentCGA: false, annualTurnoverHT: 300_000_000, taxYear: 2025 }))
      .toBe(1_500_000);
  });

  it('rounds CA down to nearest 100 000 before multiplying', () => {
    // 299 999 999 → 299 900 000 → 0.5% = 1 499 500
    expect(calculateIS({ taxableProfit: 0, regime: 'RNI', isAdherentCGA: false, annualTurnoverHT: 299_999_999, taxYear: 2025 }))
      .toBe(1_499_500);
  });

  it('CGA adherent halves the CA-based minimum', () => {
    const full = calculateIS({ taxableProfit: 0, regime: 'RNI', isAdherentCGA: false, annualTurnoverHT: 300_000_000 });
    const cga  = calculateIS({ taxableProfit: 0, regime: 'RNI', isAdherentCGA: true,  annualTurnoverHT: 300_000_000 });
    expect(cga).toBe(full / 2);
  });

  it('computed IS beats the CA minimum when profit is high enough', () => {
    // 27.5% × 10M = 2 750 000 > 0.5% × 300M = 1 500 000
    expect(calculateIS({ taxableProfit: 10_000_000, regime: 'RNI', isAdherentCGA: false, annualTurnoverHT: 300_000_000, taxYear: 2025 }))
      .toBe(2_750_000);
  });
});

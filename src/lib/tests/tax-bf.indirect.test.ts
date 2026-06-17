import { describe, it, expect } from 'vitest';
import {
  calculateTPA,
  calculateServiceWithholding,
  calculateSoutienPatriotique,
  calculateTVA,
  calculateTVANet,
  SERVICE_WITHHOLDING_THRESHOLD,
} from '../tax-bf';

// ─── TPA ──────────────────────────────────────────────────────────────────────

describe('calculateTPA', () => {
  it('is 3% of gross payroll', () => {
    expect(calculateTPA(1_000_000)).toBe(30_000);
  });

  it('applies 20% CGA abatement on the base before the 3% rate', () => {
    expect(calculateTPA(1_000_000, true)).toBe(24_000);
  });
});

// ─── Service withholding ──────────────────────────────────────────────────────

describe('calculateServiceWithholding', () => {
  it('returns null below the 50 000 threshold', () => {
    expect(calculateServiceWithholding(SERVICE_WITHHOLDING_THRESHOLD - 1, 'resident-with-ifu')).toBeNull();
  });

  it('applies withholding at exactly the 50 000 threshold', () => {
    expect(calculateServiceWithholding(SERVICE_WITHHOLDING_THRESHOLD, 'resident-with-ifu'))
      .toBe(Math.round(SERVICE_WITHHOLDING_THRESHOLD * 0.05));
  });

  it('applies 5% for resident with IFU', () => {
    expect(calculateServiceWithholding(100_000, 'resident-with-ifu')).toBe(5_000);
  });

  it('applies 25% for resident without IFU', () => {
    expect(calculateServiceWithholding(100_000, 'resident-without-ifu')).toBe(25_000);
  });

  it('applies 1% for construction (BTP)', () => {
    expect(calculateServiceWithholding(1_000_000, 'construction')).toBe(10_000);
  });

  it('applies 20% for non-resident', () => {
    expect(calculateServiceWithholding(100_000, 'non-resident')).toBe(20_000);
  });
});

// ─── Soutien Patriotique ──────────────────────────────────────────────────────

describe('calculateSoutienPatriotique', () => {
  it('is 1% of net salary', () => {
    expect(calculateSoutienPatriotique(200_000)).toBe(2_000);
  });
});

// ─── TVA ──────────────────────────────────────────────────────────────────────

describe('calculateTVA', () => {
  it('applies 18% standard rate', () => {
    expect(calculateTVA(100_000)).toBe(18_000);
  });

  it('applies 10% reduced rate for hotels/restaurants', () => {
    expect(calculateTVA(100_000, true)).toBe(10_000);
  });

  it('floors to nearest franc (no rounding up)', () => {
    // 18% × 55 555 = 9 999.9 → floor = 9 999
    expect(calculateTVA(55_555)).toBe(9_999);
  });
});

describe('calculateTVANet', () => {
  it('is collected TVA minus deductible TVA', () => {
    // 18% × 200 000 = 36 000; 18% × 50 000 = 9 000 → net = 27 000
    expect(calculateTVANet(200_000, 50_000)).toBe(27_000);
  });

  it('can be negative (TVA credit position)', () => {
    expect(calculateTVANet(50_000, 200_000)).toBeLessThan(0);
  });
});

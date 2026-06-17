import { describe, it, expect } from 'vitest';
import { yearFractionFromStart, effectiveThreshold, isFirstFiscalYear } from '../tax-bf';

describe('yearFractionFromStart', () => {
  it('returns 1 when the business started before the tax year', () => {
    expect(yearFractionFromStart('2022-06-15', 2025)).toBe(1);
  });

  it('returns a fraction between 0 and 1 for a mid-year start', () => {
    const f = yearFractionFromStart('2025-07-01', 2025);
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThan(1);
  });

  it('is approximately 0.5 for a July 2 start', () => {
    expect(yearFractionFromStart('2025-07-02', 2025)).toBeCloseTo(0.5, 1);
  });
});

describe('effectiveThreshold', () => {
  it('returns the base unchanged when creationDate is absent', () => {
    expect(effectiveThreshold(50_000_000, undefined, 2025)).toBe(50_000_000);
  });

  it('returns a prorated (lower) value for a mid-year creation', () => {
    const t = effectiveThreshold(50_000_000, '2025-07-02', 2025);
    expect(t).toBeLessThan(50_000_000);
    expect(t).toBeGreaterThan(0);
  });
});

describe('isFirstFiscalYear', () => {
  it('returns true when creation year matches the tax year', () => {
    expect(isFirstFiscalYear('2025-03-01', 2025)).toBe(true);
  });

  it('returns false when creation year differs from the tax year', () => {
    expect(isFirstFiscalYear('2022-03-01', 2025)).toBe(false);
  });

  it('returns false when creationDate is undefined', () => {
    expect(isFirstFiscalYear(undefined, 2025)).toBe(false);
  });
});

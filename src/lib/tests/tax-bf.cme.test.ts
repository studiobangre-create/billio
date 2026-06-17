import { describe, it, expect } from 'vitest';
import { calculateCME } from '../tax-bf';

describe('calculateCME — eligibility', () => {
  it('returns null for CA ≥ 15 000 000', () => {
    expect(calculateCME({ annualCA: 15_000_000, taxpayerType: 'individual', zone: 'A', isAmbulant: false }))
      .toBeNull();
  });
});

describe('calculateCME — ambulant tariffs', () => {
  it('motorTwoThreeWheel → 12 000', () => {
    expect(calculateCME({ annualCA: 2_000_000, taxpayerType: 'individual', zone: 'A', isAmbulant: true, transportMode: 'motorTwoThreeWheel' }))
      .toBe(12_000);
  });

  it('foot → 4 000', () => {
    expect(calculateCME({ annualCA: 500_000, taxpayerType: 'individual', zone: 'D', isAmbulant: true, transportMode: 'foot' }))
      .toBe(4_000);
  });

  it("defaults to 'other' (6 000) when transportMode is omitted", () => {
    expect(calculateCME({ annualCA: 2_000_000, taxpayerType: 'individual', zone: 'A', isAmbulant: true }))
      .toBe(6_000);
  });
});

describe('calculateCME — zone/class tariff lookup', () => {
  it('zone A, class 8 (CA ≤ 1 500 000) → 10 000', () => {
    expect(calculateCME({ annualCA: 1_000_000, taxpayerType: 'individual', zone: 'A', isAmbulant: false }))
      .toBe(10_000);
  });

  it('zone B, class 4 (7M < CA ≤ 9M) → 60 000', () => {
    expect(calculateCME({ annualCA: 8_000_000, taxpayerType: 'individual', zone: 'B', isAmbulant: false }))
      .toBe(60_000);
  });

  it('zone B, class 5 (5M < CA ≤ 7M) → 42 000', () => {
    expect(calculateCME({ annualCA: 6_000_000, taxpayerType: 'individual', zone: 'B', isAmbulant: false }))
      .toBe(42_000);
  });

  it('zone D, class 1 (13M < CA < 15M) → 80 000', () => {
    expect(calculateCME({ annualCA: 14_000_000, taxpayerType: 'entity', zone: 'D', isAmbulant: false }))
      .toBe(80_000);
  });
});

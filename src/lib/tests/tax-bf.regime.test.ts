import { describe, it, expect } from 'vitest';
import { determineRegime, isRegimeCaducite } from '../tax-bf';

const BASE = {
  legalForm: 'individual' as const,
  isElevage: false,
  isRND: false,
  isProfessionLiberale: false,
};

describe('determineRegime', () => {
  it('RND overrides all other criteria', () => {
    const r = determineRegime({ ...BASE, isRND: true, annualTurnoverHT: 100_000_000 });
    expect(r.regime).toBe('RND');
    expect(r.canInvoiceTVA).toBe(false);
  });

  it('CSE for livestock/fishing/aquaculture sellers', () => {
    const r = determineRegime({ ...BASE, isElevage: true, annualTurnoverHT: 80_000_000 });
    expect(r.regime).toBe('CSE');
  });

  it('RNI when CA ≥ 50M — canInvoiceTVA true, yearsToDowngrade 3', () => {
    const r = determineRegime({ ...BASE, annualTurnoverHT: 50_000_000 });
    expect(r.regime).toBe('RNI');
    expect(r.canInvoiceTVA).toBe(true);
    expect(r.yearsToDowngrade).toBe(3);
  });

  it('RSI when 15M ≤ CA < 50M', () => {
    const r = determineRegime({ ...BASE, annualTurnoverHT: 20_000_000 });
    expect(r.regime).toBe('RSI');
    expect(r.canInvoiceTVA).toBe(false);
  });

  it('CME-forfait for individual CA < 5M', () => {
    expect(determineRegime({ ...BASE, annualTurnoverHT: 3_000_000 }).regime).toBe('CME-forfait');
  });

  it('CME-declaratif for individual 5M ≤ CA < 15M', () => {
    expect(determineRegime({ ...BASE, annualTurnoverHT: 10_000_000 }).regime).toBe('CME-declaratif');
  });

  it('professions libérales below 15M stay in RSI (excluded from CME)', () => {
    expect(determineRegime({ ...BASE, isProfessionLiberale: true, annualTurnoverHT: 5_000_000 }).regime).toBe('RSI');
  });

  it('entity below 15M goes to CME-declaratif (not CME-forfait)', () => {
    expect(determineRegime({ ...BASE, legalForm: 'entity', annualTurnoverHT: 3_000_000 }).regime).toBe('CME-declaratif');
  });

  it('prorates RNI threshold for mid-year creation — 30M exceeds ~50% of 50M', () => {
    const r = determineRegime({ ...BASE, annualTurnoverHT: 30_000_000, creationDate: '2025-07-02', taxYear: 2025 });
    expect(r.regime).toBe('RNI');
  });
});

describe('isRegimeCaducite', () => {
  it('CME-forfait breaches at 5M', () => {
    expect(isRegimeCaducite('CME-forfait', 5_000_000)).toBe(true);
    expect(isRegimeCaducite('CME-forfait', 4_999_999)).toBe(false);
  });

  it('CME-declaratif breaches at 15M', () => {
    expect(isRegimeCaducite('CME-declaratif', 15_000_000)).toBe(true);
    expect(isRegimeCaducite('CME-declaratif', 14_999_999)).toBe(false);
  });

  it('RSI breaches at 50M', () => {
    expect(isRegimeCaducite('RSI', 50_000_000)).toBe(true);
    expect(isRegimeCaducite('RSI', 49_999_999)).toBe(false);
  });

  it('RNI never triggers caducité', () => {
    expect(isRegimeCaducite('RNI', 999_000_000)).toBe(false);
  });

  it('RND never triggers caducité', () => {
    expect(isRegimeCaducite('RND', 999_000_000)).toBe(false);
  });

  it('CSE never triggers caducité', () => {
    expect(isRegimeCaducite('CSE', 999_000_000)).toBe(false);
  });
});

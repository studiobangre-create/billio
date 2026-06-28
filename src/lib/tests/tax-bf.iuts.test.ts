import { describe, it, expect } from 'vitest';
import { calculateIUTS } from '@/lib/tax-bf';

const BASE_INPUT = {
  monthlySalaireBase:  150_000,
  indemnitesLogement:   30_000,
  indemniteFonction:    10_000,
  indemniteTransport:   15_000,
  autresIndemnites:          0,
  avantagesNature:           0,
  pensionContribution:  12_000,
  isHighAbattement:    false,
  dependents:              0,
};

function pureSalary(base: number) {
  return calculateIUTS({
    monthlySalaireBase:  base,
    indemnitesLogement:  0,
    indemniteFonction:   0,
    indemniteTransport:  0,
    autresIndemnites:    0,
    avantagesNature:     0,
    pensionContribution: 0,
    isHighAbattement:    false,
    dependents:          0,
  });
}

// ─── Core computation ─────────────────────────────────────────────────────────

describe('calculateIUTS — core', () => {
  it('computes grossSalary as sum of all components', () => {
    expect(calculateIUTS(BASE_INPUT).grossSalary).toBe(205_000);
  });

  it('caps logement exemption at 20% of (gross − pension) and 75 000 max', () => {
    // 20% × (205 000 − 12 000) = 38 600; actual logement = 30 000 → min = 30 000
    expect(calculateIUTS(BASE_INPUT).exemptLogement).toBe(30_000);
  });

  it('caps transport exemption at 5% of (gross − pension) and 30 000 max', () => {
    // 5% × 193 000 = 9 650 < actual 15 000 → cap = 9 650
    expect(calculateIUTS(BASE_INPUT).exemptTransport).toBe(9_650);
  });

  it('applies 25% abattement for non-high-abattement category', () => {
    expect(calculateIUTS(BASE_INPUT).abattement).toBe(Math.round(0.25 * BASE_INPUT.monthlySalaireBase));
  });

  it('applies 20% abattement for high-abattement category (P/A/B grade)', () => {
    expect(calculateIUTS({ ...BASE_INPUT, isHighAbattement: true }).abattement)
      .toBe(Math.round(0.20 * BASE_INPUT.monthlySalaireBase));
  });

  it('netTax is 0 when netTaxable falls in the 0% bracket (≤ 30 000)', () => {
    const r = calculateIUTS({
      monthlySalaireBase:  30_000,
      indemnitesLogement:       0,
      indemniteFonction:        0,
      indemniteTransport:       0,
      autresIndemnites:         0,
      avantagesNature:          0,
      pensionContribution:      0,
      isHighAbattement:     false,
      dependents:               0,
    });
    expect(r.netTax).toBe(0);
  });

  it('applies family charge reduction for 2 dependents (10%)', () => {
    const r2 = calculateIUTS({ ...BASE_INPUT, dependents: 2 });
    const r0 = calculateIUTS({ ...BASE_INPUT, dependents: 0 });
    expect(r2.netTax).toBe(Math.round(r0.grossTax * 0.90));
  });

  it('clamps dependents reduction at 4 (14%)', () => {
    const r4 = calculateIUTS({ ...BASE_INPUT, dependents: 4 });
    const r9 = calculateIUTS({ ...BASE_INPUT, dependents: 9 });
    expect(r4.netTax).toBe(r9.netTax);
  });

  it('netTaxable is never negative', () => {
    const r = calculateIUTS({
      monthlySalaireBase:  50_000,
      indemnitesLogement:       0,
      indemniteFonction:        0,
      indemniteTransport:       0,
      autresIndemnites:         0,
      avantagesNature:          0,
      pensionContribution:  50_000,
      isHighAbattement:     false,
      dependents:               0,
    });
    expect(r.netTaxable).toBeGreaterThanOrEqual(0);
  });
});

// ─── Progressive bracket boundaries ──────────────────────────────────────────
// pureSalary() sets all allowances and pension to 0, so
// netTaxable = monthlySalaireBase × 0.75 — making bracket math exact.

describe('calculateIUTS — bracket boundaries', () => {
  // netTaxable = 30 000 — top of the 0% band
  it('netTaxable 30 000 → grossTax 0 (0% band ceiling)', () => {
    expect(pureSalary(40_000).grossTax).toBe(0);
  });

  // netTaxable = 37 500 — inside the 12.1% band
  // (37 500 − 30 000) × 0.121 = 907.5 → round = 908
  it('netTaxable 37 500 → grossTax 908 (12.1% band)', () => {
    expect(pureSalary(50_000).grossTax).toBe(908);
  });

  // netTaxable = 60 000 — inside the 13.9% band
  // 20 000×0.121 + 10 000×0.139 = 2 420 + 1 390 = 3 810
  it('netTaxable 60 000 → grossTax 3 810 (13.9% band)', () => {
    expect(pureSalary(80_000).grossTax).toBe(3_810);
  });

  // netTaxable = 90 000 — inside the 15.7% band
  // 2 420 + 4 170 + 10 000×0.157 = 8 160
  it('netTaxable 90 000 → grossTax 8 160 (15.7% band)', () => {
    expect(pureSalary(120_000).grossTax).toBe(8_160);
  });

  // netTaxable = 120 000 — top of the 15.7% band
  // 2 420 + 4 170 + 40 000×0.157 = 12 870
  it('netTaxable 120 000 → grossTax 12 870 (15.7% band ceiling)', () => {
    expect(pureSalary(160_000).grossTax).toBe(12_870);
  });

  // netTaxable = 150 000 — inside the 18.4% band
  // 12 870 + 30 000×0.184 = 18 390
  it('netTaxable 150 000 → grossTax 18 390 (18.4% band)', () => {
    expect(pureSalary(200_000).grossTax).toBe(18_390);
  });

  // netTaxable = 187 500 — inside the 21.7% band
  // 12 870 + 50 000×0.184 + 17 500×0.217 = 25 867.5 → round = 25 868
  it('netTaxable 187 500 → grossTax 25 868 (21.7% band)', () => {
    expect(pureSalary(250_000).grossTax).toBe(25_868);
  });

  // netTaxable = 300 000 — inside the 25% top band
  // 12 870 + 50 000×0.184 + 80 000×0.217 + 50 000×0.25 = 51 930
  it('netTaxable 300 000 → grossTax 51 930 (25% top band)', () => {
    expect(pureSalary(400_000).grossTax).toBe(51_930);
  });
});

// ─── indemniteFonction exemption cap ─────────────────────────────────────────

describe('calculateIUTS — indemniteFonction cap', () => {
  it('caps at 5% of (gross − pension) when indemnité exceeds that', () => {
    const r = calculateIUTS({
      monthlySalaireBase:  500_000,
      indemnitesLogement:       0,
      indemniteFonction:  100_000, // 5% × 600 000 = 30 000 < 100 000 → cap wins
      indemniteTransport:       0,
      autresIndemnites:         0,
      avantagesNature:          0,
      pensionContribution:      0,
      isHighAbattement:     false,
      dependents:               0,
    });
    expect(r.exemptFonction).toBe(30_000);
  });

  it('caps at 50 000 absolute maximum', () => {
    const r = calculateIUTS({
      monthlySalaireBase: 2_000_000,
      indemnitesLogement:         0,
      indemniteFonction:  200_000, // 5% × 2.2M = 110 000 → 50 000 ceiling wins
      indemniteTransport:         0,
      autresIndemnites:           0,
      avantagesNature:            0,
      pensionContribution:        0,
      isHighAbattement:       false,
      dependents:                 0,
    });
    expect(r.exemptFonction).toBe(50_000);
  });
});

import { describe, it, expect } from 'vitest';
import { calculatePatente } from '../tax-bf';

describe('calculatePatente — table A', () => {
  it('turnover 20M → droit fixe 60 000', () => {
    expect(calculatePatente({ priorYearTurnoverHT: 20_000_000, table: 'A', valeurLocative: 0 }).droitFixe)
      .toBe(60_000);
  });

  it('droit proportionnel is max(8% × valeurLocative, droitFixe / 5)', () => {
    const r = calculatePatente({ priorYearTurnoverHT: 20_000_000, table: 'A', valeurLocative: 100_000 });
    // 8% × 100 000 = 8 000; 60 000 / 5 = 12 000 → max = 12 000
    expect(r.droitProportionnel).toBe(12_000);
  });

  it('total = droitFixe + droitProportionnel', () => {
    const r = calculatePatente({ priorYearTurnoverHT: 20_000_000, table: 'A', valeurLocative: 500_000 });
    expect(r.total).toBe(r.droitFixe + r.droitProportionnel);
  });

  it('turnover > 200M adds +100 000 per additional 100M slice', () => {
    // 350M → 400 000 base + ceil((350M − 200M) / 100M) × 100 000 = 400 000 + 200 000 = 600 000
    expect(calculatePatente({ priorYearTurnoverHT: 350_000_000, table: 'A', valeurLocative: 0 }).droitFixe)
      .toBe(600_000);
  });
});

describe('calculatePatente — table B (professions libérales)', () => {
  it('turnover 5M → droit fixe 50 000', () => {
    expect(calculatePatente({ priorYearTurnoverHT: 5_000_000, table: 'B', valeurLocative: 0 }).droitFixe)
      .toBe(50_000);
  });

  it('turnover 10M → droit fixe 100 000', () => {
    expect(calculatePatente({ priorYearTurnoverHT: 10_000_000, table: 'B', valeurLocative: 2_000_000 }).droitFixe)
      .toBe(100_000);
  });

  it('turnover 60M (> 50M) → 400 000 + 1 slice × 50 000 = 450 000', () => {
    expect(calculatePatente({ priorYearTurnoverHT: 60_000_000, table: 'B', valeurLocative: 0 }).droitFixe)
      .toBe(450_000);
  });

  it('turnover 70M → 400 000 + 2 slices × 50 000 = 500 000', () => {
    expect(calculatePatente({ priorYearTurnoverHT: 70_000_000, table: 'B', valeurLocative: 0 }).droitFixe)
      .toBe(500_000);
  });
});

describe('calculatePatente — table C (wholesale/gas/recharge)', () => {
  it('turnover 10M → droit fixe 10 000', () => {
    expect(calculatePatente({ priorYearTurnoverHT: 10_000_000, table: 'C', valeurLocative: 0 }).droitFixe)
      .toBe(10_000);
  });

  it('turnover 50M → droit fixe 70 000', () => {
    expect(calculatePatente({ priorYearTurnoverHT: 50_000_000, table: 'C', valeurLocative: 0 }).droitFixe)
      .toBe(70_000);
  });

  it('turnover > 300M adds +50 000 per additional 100M slice', () => {
    // 400M → 220 000 + ceil((400M − 300M) / 100M) × 50 000 = 220 000 + 50 000 = 270 000
    expect(calculatePatente({ priorYearTurnoverHT: 400_000_000, table: 'C', valeurLocative: 0 }).droitFixe)
      .toBe(270_000);
  });
});

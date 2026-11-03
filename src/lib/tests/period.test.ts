import { describe, it, expect } from 'vitest';
import { currentMonth, exerciseYear, monthEndLabel, monthLabel } from '@/lib/period';

describe('period', () => {
  const nov = new Date(2026, 10, 3);
  it('derives the exercise and month from the date', () => {
    expect(exerciseYear(nov)).toBe(2026);
    expect(currentMonth(nov)).toBe(11);
    expect(monthLabel(nov)).toBe('Novembre 2026');
  });
  it('gives the last day of the month', () => {
    expect(monthEndLabel(nov)).toBe('30 novembre');
    expect(monthEndLabel(new Date(2028, 1, 10))).toBe('29 février');
  });
});

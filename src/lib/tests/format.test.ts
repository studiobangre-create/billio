import { describe, it, expect } from 'vitest';
import { fmtCompact, fmtDate } from '@/data';

const today = new Date('2026-11-02T12:00:00');

describe('fmtDate', () => {
  it('omits the year for dates in the current year', () => {
    expect(fmtDate('2026-06-01', today)).toBe('1 juin');
  });
  it('shows the year for other years', () => {
    expect(fmtDate('2025-06-01', today)).toBe('1 juin 2025');
  });
  it('returns the input when it is not a date', () => {
    expect(fmtDate('—', today)).toBe('—');
  });
});

describe('fmtCompact', () => {
  it('uses a French decimal comma for millions', () => {
    expect(fmtCompact(1_300_000)).toBe('1,3 M');
    expect(fmtCompact(2_000_000)).toBe('2 M');
  });
  it('groups thousands below a million', () => {
    expect(fmtCompact(150000)).toMatch(/^150\s000$/);
  });
});

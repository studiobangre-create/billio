// The current accounting period, from today's date. OHADA exercises follow
// the calendar year, so the exercise is the current year.

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function exerciseYear(now: Date = new Date()): number {
  return now.getFullYear();
}

/** 1-12 */
export function currentMonth(now: Date = new Date()): number {
  return now.getMonth() + 1;
}

/** "Novembre 2026" */
export function monthLabel(now: Date = new Date()): string {
  return cap(now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
}

/** "30 novembre" — last day of the current month */
export function monthEndLabel(now: Date = new Date()): string {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

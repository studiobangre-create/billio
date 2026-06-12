import type { Journal } from '../../lib/accounting-data';

export default function JournalBadge({ journal }: { journal: Journal }) {
  return (
    <span className="jchip" style={{ background: journal.color }}>
      {journal.code}
    </span>
  );
}

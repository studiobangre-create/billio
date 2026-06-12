const STATUS_MAP: Record<string, string> = {
  posted:     'acc-pill-posted',
  draft:      'acc-pill-draft',
  balanced:   'acc-pill-balanced',
  unbalanced: 'acc-pill-unbalanced',
  open:       'acc-pill-open',
  overdue:    'acc-pill-overdue',
  paid:       'acc-pill-paid',
  closed:     'acc-pill-closed',
};

const STATUS_LABEL: Record<string, string> = {
  posted:     'Comptabilisé',
  draft:      'Brouillon',
  balanced:   'Équilibré',
  unbalanced: 'Déséquilibré',
  open:       'En cours',
  overdue:    'En retard',
  paid:       'Payé',
  closed:     'Clôturé',
};

export default function StatusPill({ status }: { status: string }) {
  return (
    <span className={`acc-pill ${STATUS_MAP[status] ?? 'acc-pill-draft'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

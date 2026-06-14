type P = { primary?: boolean };

function IlluInvoice({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#185FA5';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#D4E8F8';
  const a = primary ? 'rgba(255,255,255,0.30)' : '#A8CBE6';
  const badge = primary ? 'rgba(255,255,255,0.22)' : '#185FA5';
  const badgeBorder = primary ? 'rgba(255,255,255,0.45)' : 'none';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <rect x="9" y="3" width="24" height="31" rx="3" fill={f} stroke={s} strokeWidth="1.5"/>
      <path d="M25 3 v8 h8" fill={a} stroke={s} strokeWidth="1.2" strokeLinejoin="round"/>
      <line x1="14" y1="17" x2="25" y2="17" stroke={s} strokeWidth="1.4" strokeLinecap="round" opacity="0.8"/>
      <line x1="14" y1="22" x2="23" y2="22" stroke={s} strokeWidth="1.4" strokeLinecap="round" opacity="0.8"/>
      <line x1="14" y1="27" x2="27" y2="27" stroke={s} strokeWidth="1.4" strokeLinecap="round" opacity="0.8"/>
      <circle cx="40" cy="34" r="8" fill={badge} stroke={badgeBorder} strokeWidth="1"/>
      <line x1="40" y1="30" x2="40" y2="38" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <line x1="36" y1="34" x2="44" y2="34" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IlluUserPlus({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#0B6B53';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#B5E8D4';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="13" r="9" fill={f} stroke={s} strokeWidth="1.5"/>
      <path d="M6 40 Q6 27 22 27 Q38 27 38 40" fill={f} stroke={s} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="44" y1="12" x2="44" y2="26" stroke={s} strokeWidth="2.2" strokeLinecap="round"/>
      <line x1="37" y1="19" x2="51" y2="19" stroke={s} strokeWidth="2.2" strokeLinecap="round"/>
    </svg>
  );
}

function IlluChartBar({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#5B45C7';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#CCC4EF';
  const a = primary ? 'rgba(255,255,255,0.55)' : '#9B8BE0';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <rect x="6" y="26" width="10" height="12" rx="2" fill={f} stroke={s} strokeWidth="1.5"/>
      <rect x="20" y="17" width="10" height="21" rx="2" fill={f} stroke={s} strokeWidth="1.5"/>
      <rect x="34" y="8" width="10" height="30" rx="2" fill={f} stroke={s} strokeWidth="1.5"/>
      <polyline points="11,22 25,13 39,5 50,2" stroke={a} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <circle cx="50" cy="2" r="3" fill={a}/>
      <line x1="4" y1="39" x2="52" y2="39" stroke={s} strokeWidth="1" opacity="0.25"/>
    </svg>
  );
}

function IlluCreditCard({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#3B6D11';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#C5E4A0';
  const a = primary ? 'rgba(255,255,255,0.30)' : '#A0CE78';
  const badge = primary ? 'rgba(255,255,255,0.22)' : '#3B6D11';
  const badgeBorder = primary ? 'rgba(255,255,255,0.45)' : 'none';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <rect x="4" y="8" width="40" height="24" rx="4" fill={f} stroke={s} strokeWidth="1.5"/>
      <rect x="4" y="14" width="40" height="7" fill={a} opacity="0.55"/>
      <rect x="9" y="22" width="9" height="6" rx="1.5" fill={s} opacity="0.5"/>
      <line x1="23" y1="27" x2="38" y2="27" stroke={s} strokeWidth="1.3" strokeLinecap="round" opacity="0.45"/>
      <circle cx="44" cy="35" r="7" fill={badge} stroke={badgeBorder} strokeWidth="1"/>
      <polyline points="40.5,35 43,37.5 47.5,31.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IlluNotebook({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#185FA5';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#D4E8F8';
  const a = primary ? 'rgba(255,255,255,0.30)' : '#A8CBE6';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="23" height="33" rx="3" fill={f} stroke={s} strokeWidth="1.5"/>
      <rect x="28" y="5" width="23" height="33" rx="3" fill={f} stroke={s} strokeWidth="1.5"/>
      <line x1="28" y1="5" x2="28" y2="38" stroke={s} strokeWidth="1.5" opacity="0.35"/>
      <line x1="10" y1="14" x2="23" y2="14" stroke={s} strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
      <line x1="10" y1="19" x2="23" y2="19" stroke={s} strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
      <line x1="10" y1="24" x2="20" y2="24" stroke={s} strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
      <line x1="33" y1="14" x2="46" y2="14" stroke={s} strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
      <line x1="33" y1="19" x2="44" y2="19" stroke={s} strokeWidth="1.3" strokeLinecap="round" opacity="0.7"/>
      <path d="M41 24 L47 18 L50 21 L44 27 L39 28 Z" fill={a} stroke={s} strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

function IlluBook({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#0B6B53';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#B5E8D4';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <rect x="19" y="3" width="18" height="11" rx="2.5" fill={f} stroke={s} strokeWidth="1.5"/>
      <line x1="28" y1="14" x2="28" y2="20" stroke={s} strokeWidth="1.3" opacity="0.55"/>
      <line x1="10" y1="20" x2="46" y2="20" stroke={s} strokeWidth="1.3" opacity="0.55"/>
      <line x1="10" y1="20" x2="10" y2="26" stroke={s} strokeWidth="1.3" opacity="0.55"/>
      <line x1="28" y1="20" x2="28" y2="26" stroke={s} strokeWidth="1.3" opacity="0.55"/>
      <line x1="46" y1="20" x2="46" y2="26" stroke={s} strokeWidth="1.3" opacity="0.55"/>
      <rect x="2" y="26" width="16" height="10" rx="2" fill={f} stroke={s} strokeWidth="1.4"/>
      <rect x="20" y="26" width="16" height="10" rx="2" fill={f} stroke={s} strokeWidth="1.4"/>
      <rect x="38" y="26" width="16" height="10" rx="2" fill={f} stroke={s} strokeWidth="1.4"/>
    </svg>
  );
}

function IlluBuildingBank({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#B26A09';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#F5D9AA';
  const a = primary ? 'rgba(255,255,255,0.30)' : '#E8B860';
  const badge = primary ? 'rgba(255,255,255,0.22)' : '#B26A09';
  const badgeBorder = primary ? 'rgba(255,255,255,0.45)' : 'none';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <path d="M6 17 L28 4 L50 17" fill={f} stroke={s} strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="8" y="17" width="40" height="20" fill={f} stroke={s} strokeWidth="1.5"/>
      <rect x="13" y="19" width="5" height="16" rx="1.5" fill={a} opacity="0.7"/>
      <rect x="25.5" y="19" width="5" height="16" rx="1.5" fill={a} opacity="0.7"/>
      <rect x="38" y="19" width="5" height="16" rx="1.5" fill={a} opacity="0.7"/>
      <rect x="6" y="37" width="44" height="4" rx="1" fill={f} stroke={s} strokeWidth="1.5"/>
      <circle cx="44" cy="9" r="8" fill={badge} stroke={badgeBorder} strokeWidth="1"/>
      <circle cx="41" cy="6.5" r="1.5" fill="white"/>
      <circle cx="47" cy="11.5" r="1.5" fill="white"/>
      <line x1="41.5" y1="12" x2="46.5" y2="6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IlluScales({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#5B45C7';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#CCC4EF';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <line x1="28" y1="6" x2="28" y2="40" stroke={s} strokeWidth="2" strokeLinecap="round" opacity="0.65"/>
      <line x1="6" y1="13" x2="50" y2="13" stroke={s} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="28" cy="13" r="3.5" fill={f} stroke={s} strokeWidth="1.5"/>
      <line x1="9" y1="13" x2="7" y2="26" stroke={s} strokeWidth="1.2" opacity="0.6"/>
      <line x1="9" y1="13" x2="17" y2="26" stroke={s} strokeWidth="1.2" opacity="0.6"/>
      <path d="M4 27 Q12 31 20 27" fill={f} stroke={s} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="47" y1="13" x2="39" y2="26" stroke={s} strokeWidth="1.2" opacity="0.6"/>
      <line x1="47" y1="13" x2="49" y2="26" stroke={s} strokeWidth="1.2" opacity="0.6"/>
      <path d="M36 27 Q44 31 52 27" fill={f} stroke={s} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="21" y1="40" x2="35" y2="40" stroke={s} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IlluFileText({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#B26A09';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#F5D9AA';
  const a = primary ? 'rgba(255,255,255,0.30)' : '#E8B860';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <rect x="7" y="3" width="28" height="36" rx="3" fill={f} stroke={s} strokeWidth="1.5"/>
      <path d="M27 3 v9 h8" fill={a} opacity="0.6" stroke={s} strokeWidth="1.2" strokeLinejoin="round"/>
      <line x1="13" y1="18" x2="27" y2="18" stroke={s} strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/>
      <line x1="13" y1="23" x2="25" y2="23" stroke={s} strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/>
      <line x1="13" y1="28" x2="23" y2="28" stroke={s} strokeWidth="1.4" strokeLinecap="round" opacity="0.7"/>
      <path d="M36 15 L45 6 L50 11 L41 20 Z" fill={f} stroke={s} strokeWidth="1.4" strokeLinejoin="round"/>
      <circle cx="44" cy="8" r="2" fill={s} opacity="0.8"/>
    </svg>
  );
}

function IlluUsers({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#0B6B53';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#B5E8D4';
  const fa = primary ? 'rgba(255,255,255,0.08)' : '#DBF1EA';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <circle cx="34" cy="13" r="8" fill={fa} stroke={s} strokeWidth="1.3" opacity="0.65"/>
      <path d="M18 42 Q18 30 34 30 Q50 30 50 42" fill={fa} stroke={s} strokeWidth="1.3" strokeLinecap="round" opacity="0.65"/>
      <circle cx="22" cy="14" r="9" fill={f} stroke={s} strokeWidth="1.5"/>
      <path d="M4 44 Q4 30 22 30 Q40 30 40 44" fill={f} stroke={s} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IlluBell({ primary }: P) {
  const s = primary ? 'rgba(255,255,255,0.92)' : '#5B45C7';
  const f = primary ? 'rgba(255,255,255,0.15)' : '#CCC4EF';
  const a = primary ? 'rgba(255,255,255,0.40)' : '#9B8BE0';
  const dot = primary ? 'rgba(255,255,255,0.85)' : '#E24B4A';
  const dotInner = primary ? '#185FA5' : 'white';
  return (
    <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true">
      <path d="M9 14 Q12 6 20 3" stroke={a} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M47 14 Q44 6 36 3" stroke={a} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="28" cy="6" r="2.5" fill={f} stroke={s} strokeWidth="1.4"/>
      <path d="M16 32 Q14 18 28 13 Q42 18 40 32 Z" fill={f} stroke={s} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M12 32 Q28 37 44 32" stroke={s} strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <circle cx="28" cy="37" r="3" fill={f} stroke={s} strokeWidth="1.4"/>
      <circle cx="41" cy="12" r="6" fill={dot}/>
      <line x1="41" y1="9.5" x2="41" y2="13" stroke={dotInner} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="41" cy="14.5" r="0.9" fill={dotInner}/>
    </svg>
  );
}

const ILLU_MAP: Record<string, React.FC<{ primary?: boolean }>> = {
  'file-plus':      IlluInvoice,
  'user-plus':      IlluUserPlus,
  'chart-bar':      IlluChartBar,
  'credit-card':    IlluCreditCard,
  'notebook':       IlluNotebook,
  'book':           IlluBook,
  'building-bank':  IlluBuildingBank,
  'book-2':         IlluScales,
  'file-text':      IlluFileText,
  'users':          IlluUsers,
  'bell':           IlluBell,
};

export function QAIllustration({ icon, primary }: { icon: string; primary?: boolean }) {
  const Comp = ILLU_MAP[icon];
  return Comp ? <Comp primary={primary} /> : null;
}

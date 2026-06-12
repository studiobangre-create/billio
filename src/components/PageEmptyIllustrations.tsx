/** Custom SVG illustrations for main app page empty states. */

/** Two person silhouettes — Clients table */
export function ClientsEmptyIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      {/* back person (smaller, offset) */}
      <circle cx="62" cy="28" r="11" fill="#E0E7FF" stroke="#818CF8" strokeWidth="1.5"/>
      <path d="M41 66 C41 54 83 54 83 66" fill="#E0E7FF" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round"/>
      {/* front person */}
      <circle cx="36" cy="32" r="14" fill="white" stroke="#6366F1" strokeWidth="1.5"/>
      <path d="M8 76 C8 60 64 60 64 76" fill="white" stroke="#6366F1" strokeWidth="1.5" strokeLinecap="round"/>
      {/* plus badge */}
      <circle cx="72" cy="70" r="12" fill="white" stroke="#6366F1" strokeWidth="1.5"/>
      <line x1="72" y1="64" x2="72" y2="76" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
      <line x1="66" y1="70" x2="78" y2="70" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

/** Invoice document with send arrow — Invoices table */
export function InvoicesEmptyIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      {/* shadow doc */}
      <path d="M20 16 L68 16 L68 82 L20 82 Z" rx="3" fill="#EEF2FF" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="4 3"/>
      {/* main doc */}
      <path d="M14 10 L58 10 L68 20 L68 82 L14 82 Z" fill="white" stroke="#6366F1" strokeWidth="1.5"/>
      {/* folded corner */}
      <path d="M58 10 L58 20 L68 20" fill="#E0E7FF" stroke="#6366F1" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* header stripe */}
      <rect x="14" y="10" width="44" height="14" rx="0" fill="#EEF2FF"/>
      {/* invoice # */}
      <rect x="20" y="14" width="20" height="4" rx="1" fill="#C7D2FE"/>
      {/* client row */}
      <rect x="20" y="32" width="30" height="3.5" rx="1" fill="#E0E7FF"/>
      <rect x="20" y="38" width="22" height="3" rx="1" fill="#EEF2FF"/>
      {/* line items — dashed */}
      <line x1="20" y1="50" x2="60" y2="50" stroke="#C7D2FE" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/>
      <line x1="20" y1="57" x2="60" y2="57" stroke="#C7D2FE" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/>
      <line x1="20" y1="64" x2="48" y2="64" stroke="#C7D2FE" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/>
      {/* total box */}
      <rect x="40" y="70" width="22" height="7" rx="2" fill="#EEF2FF" stroke="#818CF8" strokeWidth="1"/>
      {/* send arrow badge */}
      <circle cx="74" cy="24" r="12" fill="#6366F1"/>
      <path d="M69 24 L79 24 M75 20 L79 24 L75 28" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/** Open wallet with coins — Payments table */
export function PaymentsEmptyIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      {/* wallet body */}
      <rect x="8" y="28" width="72" height="50" rx="6" fill="#ECFDF5" stroke="#34D399" strokeWidth="1.5"/>
      {/* wallet flap */}
      <path d="M8 28 C8 22 14 18 20 18 L76 18 C82 18 88 22 88 28" fill="#D1FAE5" stroke="#34D399" strokeWidth="1.5"/>
      {/* card pocket */}
      <rect x="54" y="40" width="22" height="26" rx="4" fill="white" stroke="#6EE7B7" strokeWidth="1.5"/>
      <line x1="54" y1="50" x2="76" y2="50" stroke="#A7F3D0" strokeWidth="1.5"/>
      <rect x="58" y="55" width="8" height="3" rx="1" fill="#A7F3D0"/>
      {/* coin 1 */}
      <circle cx="28" cy="54" r="12" fill="white" stroke="#10B981" strokeWidth="1.5"/>
      <circle cx="28" cy="54" r="7" fill="#D1FAE5" stroke="#34D399" strokeWidth="1"/>
      <text x="25" y="58" fontSize="9" fontWeight="800" fill="#10B981" fontFamily="system-ui, sans-serif">F</text>
      {/* coin 2 (stacked behind) */}
      <circle cx="34" cy="62" r="9" fill="#ECFDF5" stroke="#34D399" strokeWidth="1.5"/>
      {/* dashed empty hint */}
      <line x1="16" y1="72" x2="44" y2="72" stroke="#A7F3D0" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/>
    </svg>
  );
}

/** Open cardboard box, empty inside — Products table */
export function ProductsEmptyIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      {/* box body */}
      <path d="M14 42 L14 82 L82 82 L82 42 Z" fill="#FEF3C7" stroke="#F59E0B" strokeWidth="1.5"/>
      {/* box left flap (open) */}
      <path d="M14 42 L14 24 L48 32 L48 42" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* box right flap (open) */}
      <path d="M82 42 L82 24 L48 32 L48 42" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* box front crease */}
      <line x1="48" y1="42" x2="48" y2="82" stroke="#F59E0B" strokeWidth="1" strokeDasharray="4 3"/>
      {/* tape strip on left flap */}
      <rect x="36" y="26" width="6" height="14" rx="1" transform="rotate(-8 36 26)" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1" opacity="0.8"/>
      {/* empty interior hint */}
      <ellipse cx="48" cy="62" rx="18" ry="8" fill="#FDE68A" opacity="0.4"/>
      {/* question mark - nothing inside */}
      <path d="M44 55 C44 51.5 46 50 48 50 C50 50 52 51.5 52 53.5 C52 55.5 50 56 48 57.5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="48" cy="61" r="1.5" fill="#F59E0B"/>
    </svg>
  );
}

/** Estimate document with clock seal — Quotes table */
export function QuotesEmptyIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      {/* document */}
      <path d="M16 8 L62 8 L74 20 L74 88 L16 88 Z" fill="white" stroke="#64748B" strokeWidth="1.5"/>
      {/* folded corner */}
      <path d="M62 8 L62 20 L74 20" fill="#E2E8F0" stroke="#64748B" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* header */}
      <rect x="16" y="8" width="46" height="14" rx="0" fill="#F8FAFC"/>
      <rect x="22" y="13" width="24" height="4" rx="1" fill="#CBD5E1"/>
      {/* content lines */}
      <line x1="22" y1="32" x2="66" y2="32" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="22" y1="39" x2="58" y2="39" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round"/>
      {/* table rows — dashed */}
      <line x1="22" y1="52" x2="66" y2="52" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/>
      <line x1="22" y1="60" x2="66" y2="60" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/>
      <line x1="22" y1="68" x2="66" y2="68" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 3" strokeLinecap="round"/>
      {/* total area */}
      <rect x="44" y="76" width="24" height="7" rx="2" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1"/>
      {/* clock seal badge */}
      <circle cx="72" cy="30" r="16" fill="white" stroke="#64748B" strokeWidth="1.5"/>
      <circle cx="72" cy="30" r="12" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1"/>
      <line x1="72" y1="24" x2="72" y2="30" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="72" y1="30" x2="77" y2="33" stroke="#64748B" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="72" cy="30" r="1.5" fill="#64748B"/>
    </svg>
  );
}

/** Vertical timeline with empty dots — Recent activity panel */
export function ActivityEmptyIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      {/* timeline spine */}
      <line x1="32" y1="14" x2="32" y2="82" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round"/>
      {/* row 1 */}
      <circle cx="32" cy="24" r="6" fill="white" stroke="#94A3B8" strokeWidth="1.5"/>
      <rect x="46" y="21" width="32" height="4" rx="2" fill="#E2E8F0"/>
      <rect x="46" y="27" width="22" height="3" rx="1.5" fill="#F1F5F9"/>
      {/* row 2 */}
      <circle cx="32" cy="46" r="6" fill="white" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 2"/>
      <rect x="46" y="43" width="26" height="4" rx="2" fill="#F1F5F9"/>
      <rect x="46" y="49" width="18" height="3" rx="1.5" fill="#F8FAFC"/>
      {/* row 3 */}
      <circle cx="32" cy="68" r="6" fill="white" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 2"/>
      <rect x="46" y="65" width="30" height="4" rx="2" fill="#F1F5F9"/>
      <rect x="46" y="71" width="14" height="3" rx="1.5" fill="#F8FAFC"/>
      {/* pulse ring on top dot */}
      <circle cx="32" cy="24" r="10" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.35" strokeDasharray="3 3"/>
    </svg>
  );
}

/** Bar chart columns with trophy — Top clients panel */
export function TopClientsEmptyIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      {/* baseline */}
      <line x1="10" y1="78" x2="86" y2="78" stroke="#E2E8F0" strokeWidth="1.5" strokeLinecap="round"/>
      {/* bar 1 — tallest, dashed */}
      <rect x="16" y="38" width="18" height="40" rx="3" fill="#EEF2FF" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* bar 2 — medium */}
      <rect x="40" y="52" width="18" height="26" rx="3" fill="#EEF2FF" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* bar 3 — short */}
      <rect x="64" y="62" width="18" height="16" rx="3" fill="#EEF2FF" stroke="#818CF8" strokeWidth="1.5" strokeDasharray="4 3"/>
      {/* avatar circles (no faces — empty) */}
      <circle cx="25" cy="30" r="8" fill="white" stroke="#C7D2FE" strokeWidth="1.5" strokeDasharray="3 2"/>
      <circle cx="49" cy="44" r="8" fill="white" stroke="#C7D2FE" strokeWidth="1.5" strokeDasharray="3 2"/>
      <circle cx="73" cy="54" r="8" fill="white" stroke="#C7D2FE" strokeWidth="1.5" strokeDasharray="3 2"/>
      {/* person icon inside first circle */}
      <circle cx="25" cy="28" r="2.5" stroke="#818CF8" strokeWidth="1"/>
      <path d="M19 36 C19 32 31 32 31 36" stroke="#818CF8" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

/** Layout grid with sparkles — Templates */
export function TemplatesEmptyIllustration({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
      {/* page frame */}
      <rect x="10" y="8" width="60" height="78" rx="4" fill="white" stroke="#A78BFA" strokeWidth="1.5"/>
      {/* header block */}
      <rect x="10" y="8" width="60" height="18" rx="4" fill="#EDE9FE" stroke="#A78BFA" strokeWidth="1.5"/>
      <rect x="18" y="13" width="28" height="4" rx="1" fill="#C4B5FD"/>
      <rect x="18" y="19" width="16" height="3" rx="1" fill="#DDD6FE"/>
      {/* two-column layout */}
      <rect x="16" y="34" width="24" height="20" rx="2" fill="#F5F3FF" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="3 2"/>
      <rect x="46" y="34" width="18" height="20" rx="2" fill="#F5F3FF" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="3 2"/>
      {/* full-width row */}
      <rect x="16" y="60" width="48" height="8" rx="2" fill="#F5F3FF" stroke="#DDD6FE" strokeWidth="1" strokeDasharray="3 2"/>
      {/* bottom row */}
      <rect x="16" y="74" width="20" height="6" rx="2" fill="#EDE9FE" stroke="#A78BFA" strokeWidth="1"/>
      {/* sparkle big */}
      <path d="M78 18 L80 26 L88 28 L80 30 L78 38 L76 30 L68 28 L76 26 Z" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="1.5" strokeLinejoin="round"/>
      {/* sparkle small */}
      <path d="M82 52 L83 56 L87 57 L83 58 L82 62 L81 58 L77 57 L81 56 Z" fill="#F5F3FF" stroke="#A78BFA" strokeWidth="1" strokeLinejoin="round"/>
    </svg>
  );
}

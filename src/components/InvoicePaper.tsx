import { fmt } from '@/data';
import { getFiscalIdLabel } from '@/lib/ohada';

export type PaperLayout   = 'classic' | 'band' | 'minimal' | 'sidebar' | 'receipt';
export type PaperDensity  = 'compact' | 'cozy' | 'spacious';
export type TableStyle    = 'plain' | 'tinted' | 'band-h';
export type TotalStyle    = 'plain' | 'filled' | 'ruled';

export interface PaperConfig {
  layout:        PaperLayout;
  color:         string;
  fontFamily:    string;
  density:       PaperDensity;
  tableStyle:    TableStyle;
  totalStyle:    TotalStyle;
  showQty:       boolean;
  showTax:       boolean;
  showDiscount:  boolean;
  showSignature: boolean;
  showPayment:   boolean;
  footer:        string;
}

export interface BizInfo {
  name:            string;
  address:         string;
  city:            string;
  country:         string;
  email:           string;
  phone:           string;
  ifu:             string;
  rccm:            string;
  taxRegime?:      string;
  divisionFiscale?: string;
}

// ---------------------------------------------------------------------------
// Mock fallback data (used when no biz prop supplied)
// ---------------------------------------------------------------------------
const MOCK_BIZ: BizInfo = {
  name:            'Studio Wend SARL',
  address:         'Av. Kwame Nkrumah · Ouagadougou, BF',
  city:            'Ouagadougou',
  country:         'Burkina Faso',
  email:           'contact@studiowend.bf',
  phone:           '+226 70 12 34 56',
  ifu:             '00012345 B',
  rccm:            'BF-OUA-2021-B-1234',
  taxRegime:       'RNI',
  divisionFiscale: 'Ouagadougou I',
};

const CLI   = { name: 'TechKonsult', city: 'Ouagadougou, Burkina Faso', ifu: '00067890 C', rccm: 'BF-OUA-2020-B-5678', taxRegime: 'RSI', fiscalDivision: 'DCI Ouaga III' };
const INV   = { id: 'INV-0041', issued: '7 juin 2026', due: '21 juin 2026', subject: 'Refonte web — phase 2' };
const LINES = [
  { desc: 'UI/UX design — phase 2', note: 'Wireframes, hi-fi screens', qty: 1, price: 300_000 },
  { desc: 'Développement front-end', note: 'Build responsive, composants', qty: 8, price: 35_000 },
  { desc: 'AQ & livraison', note: 'Tests, déploiement', qty: 1, price: 80_000 },
];
const SUB   = LINES.reduce((s, l) => s + l.qty * l.price, 0);
const TAX   = Math.round(SUB * 0.18);
const TOTAL = SUB + TAX;

function bizInitials(name: string) {
  const words = name.trim().split(/\s+/);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '??';
}

function BizMeta({ biz }: { biz: BizInfo }) {
  const addr = [biz.address, biz.city, biz.country].filter(Boolean).join(', ');
  const contact = [biz.email, biz.phone].filter(Boolean).join(' · ');
  const fiscalLabel = getFiscalIdLabel(biz.country);
  const compliance = [biz.ifu && `${fiscalLabel} ${biz.ifu}`, biz.rccm && `RCCM ${biz.rccm}`].filter(Boolean).join(' · ');
  const fiscal = [biz.taxRegime && `${biz.taxRegime}`, biz.divisionFiscale && `${biz.divisionFiscale}`].filter(Boolean).join(' · ');
  return (
    <>
      {addr && <>{addr}<br /></>}
      {contact && <>{contact}<br /></>}
      {compliance && <><span className="tp-compliance-ids-inline">{compliance}</span><br /></>}
      {fiscal && <span className="tp-compliance-ids-inline">{fiscal}</span>}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-sections
// ---------------------------------------------------------------------------
function Parties() {
  return (
    <div className="tp-parties">
      <div>
        <div className="tp-block-label">Facturé à</div>
        <div className="tp-client-name">{CLI.name}</div>
        <div className="tp-client-meta">{CLI.city}</div>
        {(CLI.ifu || CLI.rccm || CLI.taxRegime || CLI.fiscalDivision) && (
          <div className="tp-compliance-ids">
            {CLI.ifu            && <span>IFU {CLI.ifu}</span>}
            {CLI.rccm           && <span>RCCM {CLI.rccm}</span>}
            {CLI.taxRegime      && <span>{CLI.taxRegime}</span>}
            {CLI.fiscalDivision && <span>{CLI.fiscalDivision}</span>}
          </div>
        )}
      </div>
      <div>
        <div className="tp-block-label">Détails</div>
        <div className="tp-meta-grid">
          <div className="k">Émis le</div><div className="v">{INV.issued}</div>
          <div className="k">Échéance</div><div className="v due">{INV.due}</div>
          <div className="k">Objet</div><div className="v">{INV.subject}</div>
        </div>
      </div>
    </div>
  );
}

function InvoiceTable({ cfg }: { cfg: PaperConfig }) {
  return (
    <table className={`tp-table ${cfg.tableStyle}`}>
      <thead>
        <tr>
          <th>Description</th>
          {cfg.showQty && <th className="r">Qté</th>}
          <th className="r">Prix unitaire</th>
          <th className="r">Montant</th>
        </tr>
      </thead>
      <tbody>
        {LINES.map((l, i) => (
          <tr key={i}>
            <td>
              <div className="tp-li-desc">{l.desc}</div>
              <div className="tp-li-note">{l.note}</div>
            </td>
            {cfg.showQty && <td className="r">{l.qty}</td>}
            <td className="r">{fmt(l.price)}</td>
            <td className="r tp-li-amt">{fmt(l.qty * l.price)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Totals({ cfg }: { cfg: PaperConfig }) {
  return (
    <div className="tp-totals">
      <div className="tp-tot-inner">
        <div className="tp-tot-row"><span>Sous-total</span><span>{fmt(SUB)} F CFA</span></div>
        {cfg.showTax && <div className="tp-tot-row"><span>TVA (18 %)</span><span>{fmt(TAX)} F CFA</span></div>}
        {cfg.showDiscount && <div className="tp-tot-row"><span>Remise</span><span>0 F CFA</span></div>}
        <div className={`tp-tot-grand ${cfg.totalStyle}`}>
          <span>Total dû</span><span>{fmt(TOTAL)} F CFA</span>
        </div>
      </div>
    </div>
  );
}

function PayNotes({ cfg }: { cfg: PaperConfig }) {
  if (!cfg.showPayment) return null;
  return (
    <div className="tp-pay-row">
      <div>
        <div className="tp-block-label">Modes de paiement</div>
        <div className="tp-pm-list">
          <div className="tp-pm">Mobile Money — MTN / Orange</div>
          <div className="tp-pm">Wave · billio.app/pay</div>
        </div>
      </div>
      <div>
        <div className="tp-block-label">Notes</div>
        <div className="tp-notes">Merci pour votre confiance. Paiement sous 14 jours.</div>
      </div>
    </div>
  );
}

function Signature({ cfg }: { cfg: PaperConfig }) {
  if (!cfg.showSignature) return null;
  return (
    <div className="tp-sign">
      <div className="tp-sign-line" />
      <div className="tp-sign-label">Signature autorisée</div>
    </div>
  );
}

function Footer({ cfg, biz }: { cfg: PaperConfig; biz: BizInfo }) {
  return (
    <div className="tp-foot">{cfg.footer || `${biz.name || MOCK_BIZ.name} · Facture générée via Billio`}</div>
  );
}

// ---------------------------------------------------------------------------
// Layout-specific bodies
// ---------------------------------------------------------------------------
function ClassicBody({ cfg, biz }: { cfg: PaperConfig; biz: BizInfo }) {
  return (
    <>
      <div className="tp-top">
        <div className="tp-biz">
          <div className="tp-logo">{bizInitials(biz.name || MOCK_BIZ.name)}</div>
          <div>
            <div className="tp-biz-name">{biz.name || MOCK_BIZ.name}</div>
            <div className="tp-biz-meta"><BizMeta biz={biz.name ? biz : MOCK_BIZ} /></div>
          </div>
        </div>
        <div className="tp-doc">
          <div className="tp-doc-title">Facture</div>
          <div className="tp-doc-num">#{INV.id}</div>
          <div className="tp-status">En attente</div>
        </div>
      </div>
      <div className="tp-strip">
        <span>Émis le: {INV.issued}</span>
        <span>Échéance: {INV.due}</span>
        <span>Net 14 jours</span>
      </div>
      <Parties />
      <InvoiceTable cfg={cfg} />
      <Totals cfg={cfg} />
      <PayNotes cfg={cfg} />
      <Signature cfg={cfg} />
      <Footer cfg={cfg} biz={biz} />
    </>
  );
}

function BandBody({ cfg, biz }: { cfg: PaperConfig; biz: BizInfo }) {
  const resolved = biz.name ? biz : MOCK_BIZ;
  const addr = [resolved.address, resolved.city].filter(Boolean).join(', ');
  const bandFiscalLabel = getFiscalIdLabel(resolved.country);
  const compliance = [
    resolved.ifu && `${bandFiscalLabel} ${resolved.ifu}`,
    resolved.rccm && `RCCM ${resolved.rccm}`,
    resolved.taxRegime && `${resolved.taxRegime}`,
    resolved.divisionFiscale && `${resolved.divisionFiscale}`,
  ].filter(Boolean).join(' · ');
  return (
    <>
      <div className="tp-band">
        <div className="tp-band-left">
          <div className="tp-band-logo">{bizInitials(resolved.name)}</div>
          <div>
            <div className="tp-band-name">{resolved.name}</div>
            <div className="tp-band-tag">
              {addr}{compliance && ` · ${compliance}`}
            </div>
          </div>
        </div>
        <div className="tp-band-right">
          <div className="tp-band-title">Facture</div>
          <div className="tp-band-num">#{INV.id}</div>
        </div>
      </div>
      <div className="tp-band-body">
        <Parties />
        <InvoiceTable cfg={cfg} />
        <Totals cfg={cfg} />
        <PayNotes cfg={cfg} />
        <Signature cfg={cfg} />
        <Footer cfg={cfg} biz={biz} />
      </div>
    </>
  );
}

function MinimalBody({ cfg, biz }: { cfg: PaperConfig; biz: BizInfo }) {
  const resolved = biz.name ? biz : MOCK_BIZ;
  return (
    <>
      <div className="tp-min-top">
        <div className="tp-doc-title tp-min">FACTURE</div>
        <div className="tp-min-num">#{INV.id}</div>
      </div>
      <div className="tp-min-rule" />
      <div className="tp-min-head">
        <div>
          <div className="tp-block-label">{resolved.name}</div>
          <div className="tp-client-meta"><BizMeta biz={resolved} /></div>
          <div className="tp-min-terms">Net 14 jours</div>
        </div>
        <div>
          <div className="tp-block-label">Facturé à</div>
          <div className="tp-client-name">{CLI.name}</div>
          <div className="tp-client-meta">{CLI.city}</div>
          <div className="tp-meta-grid" style={{ marginTop: 10 }}>
            <div className="k">Émis le</div><div className="v">{INV.issued}</div>
            <div className="k">Échéance</div><div className="v due">{INV.due}</div>
          </div>
        </div>
      </div>
      <InvoiceTable cfg={cfg} />
      <Totals cfg={cfg} />
      <PayNotes cfg={cfg} />
      <Signature cfg={cfg} />
      <Footer cfg={cfg} biz={biz} />
    </>
  );
}

function SidebarBody({ cfg, biz }: { cfg: PaperConfig; biz: BizInfo }) {
  const resolved = biz.name ? biz : MOCK_BIZ;
  return (
    <div className="tp-side-wrap">
      <div className="tp-aside">
        <div className="tp-aside-logo">{bizInitials(resolved.name)}</div>
        <div className="tp-aside-name">{resolved.name}</div>
        <div className="tp-aside-meta"><BizMeta biz={resolved} /></div>
        <div className="tp-aside-sep" />
        <div className="tp-aside-label">Total dû</div>
        <div className="tp-aside-total">{fmt(TOTAL)}<span>F CFA</span></div>
        <div className="tp-aside-due">Éch. {INV.due}</div>
        <div className="tp-aside-sep" />
        <div className="tp-aside-label">Paiement</div>
        <div className="tp-aside-pm">Mobile Money</div>
        <div className="tp-aside-pm">Wave · billio.app/pay</div>
      </div>
      <div className="tp-side-main">
        <div className="tp-side-head">
          <div>
            <div className="tp-doc-title" style={{ fontSize: 22 }}>Facture</div>
            <div className="tp-doc-num">#{INV.id}</div>
          </div>
          <div className="tp-status">En attente</div>
        </div>
        <div className="tp-side-bill">
          <div className="tp-block-label">Facturé à</div>
          <div className="tp-client-name">{CLI.name}</div>
          <div className="tp-client-meta">{CLI.city}</div>
        </div>
        <InvoiceTable cfg={cfg} />
        <Totals cfg={cfg} />
        <Signature cfg={cfg} />
        <Footer cfg={cfg} biz={biz} />
      </div>
    </div>
  );
}

function ReceiptBody({ cfg, biz }: { cfg: PaperConfig; biz: BizInfo }) {
  const resolved = biz.name ? biz : MOCK_BIZ;
  const addr = [resolved.address, resolved.city].filter(Boolean).join(', ');
  const rcptFiscalLabel = getFiscalIdLabel(resolved.country);
  const compliance = [
    resolved.ifu && `${rcptFiscalLabel} ${resolved.ifu}`,
    resolved.rccm && `RCCM ${resolved.rccm}`,
    resolved.taxRegime && `${resolved.taxRegime}`,
    resolved.divisionFiscale && `${resolved.divisionFiscale}`,
  ].filter(Boolean).join(' · ');
  return (
    <div className="tp-rcpt">
      <div className="tp-rcpt-head">
        <div className="tp-rcpt-logo">{bizInitials(resolved.name)}</div>
        <div className="tp-rcpt-name">{resolved.name}</div>
        <div className="tp-rcpt-meta">
          {addr}
          {compliance && <><br /><span className="tp-compliance-ids-inline">{compliance}</span></>}
        </div>
      </div>
      <div className="tp-rcpt-divider" />
      <div className="tp-rcpt-row">
        <span className="tp-rcpt-doc">Facture #{INV.id}</span>
        <span>{INV.issued}</span>
      </div>
      <div className="tp-rcpt-row">
        <span>Client</span><span>{CLI.name}</span>
      </div>
      <div className="tp-rcpt-divider dashed" />
      {LINES.map((l, i) => (
        <div key={i} className="tp-rcpt-item">
          <div className="tp-rcpt-item-name">{l.desc}</div>
          <div className="tp-rcpt-item-amt">{fmt(l.qty * l.price)} F CFA</div>
          <div className="tp-rcpt-item-sub">{l.note} {cfg.showQty ? `(×${l.qty})` : ''}</div>
        </div>
      ))}
      <div className="tp-rcpt-divider" />
      {cfg.showTax && (
        <div className="tp-rcpt-row">
          <span>TVA (18 %)</span><span>{fmt(TAX)} F CFA</span>
        </div>
      )}
      <div className="tp-rcpt-total">
        <span>Total dû</span><span>{fmt(TOTAL)} F CFA</span>
      </div>
      <div className="tp-rcpt-divider dashed" />
      <div className="tp-rcpt-pay">Mobile Money · Wave · Virement bancaire</div>
      <div className="tp-rcpt-foot">{cfg.footer || `${resolved.name} · via Billio`}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export default function InvoicePaper({ config, biz }: { config: PaperConfig; biz?: BizInfo }) {
  const resolved = biz ?? MOCK_BIZ;
  const paperStyle: React.CSSProperties = {
    '--acc': config.color,
    fontFamily: config.fontFamily,
  } as React.CSSProperties;

  return (
    <div
      className="tp-paper"
      data-layout={config.layout}
      data-density={config.density}
      style={paperStyle}
    >
      {config.layout === 'classic'  && <ClassicBody  cfg={config} biz={resolved} />}
      {config.layout === 'band'     && <BandBody     cfg={config} biz={resolved} />}
      {config.layout === 'minimal'  && <MinimalBody  cfg={config} biz={resolved} />}
      {config.layout === 'sidebar'  && <SidebarBody  cfg={config} biz={resolved} />}
      {config.layout === 'receipt'  && <ReceiptBody  cfg={config} biz={resolved} />}
    </div>
  );
}

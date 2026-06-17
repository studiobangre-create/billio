import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { calculateServiceWithholding } from '../lib/tax-bf';
import type { Invoice, LineItem, ServiceWithholdingScenario } from '../lib/schemas';
import type { BizInfo } from './InvoicePaper';

// toLocaleString is unreliable in the react-pdf renderer environment
const pdfFmt = (n: number): string =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const pdfFmtDate = (iso: string): string => {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

type ClientInfo = {
  name: string;
  city: string;
  contact?: string;
  email?: string;
  phone?: string;
  ifu?: string;
  rccm?: string;
  taxRegime?: string;
  fiscalDivision?: string;
  withholdingScenario?: string;
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  bizName: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  bizMeta: {
    fontSize: 8,
    color: '#555',
    lineHeight: 1.5,
  },
  docTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
  },
  docNum: {
    fontSize: 11,
    textAlign: 'right',
    color: '#444',
    marginTop: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
  },
  parties: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  partiesLeft: {
    flex: 1,
    paddingRight: 16,
  },
  partiesRight: {
    width: 220,
  },
  blockLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#888',
    letterSpacing: 0.5,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  smallText: {
    fontSize: 8,
    color: '#666',
    lineHeight: 1.4,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  metaKey: {
    fontSize: 8,
    color: '#888',
    width: 72,
  },
  metaVal: {
    fontSize: 8,
    color: '#1a1a1a',
    width: 140,
  },
  tableHead: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  thDesc: {
    flex: 1,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#555',
  },
  thRight: {
    width: 64,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#555',
    textAlign: 'right',
  },
  tdDesc: {
    flex: 1,
    fontSize: 8.5,
  },
  tdRight: {
    width: 64,
    fontSize: 8.5,
    textAlign: 'right',
    color: '#333',
  },
  totals: {
    alignItems: 'flex-end',
    marginTop: 4,
    marginBottom: 20,
  },
  totInner: {
    width: 210,
  },
  totRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  totLabel: {
    fontSize: 8.5,
    color: '#666',
  },
  totVal: {
    fontSize: 8.5,
    color: '#1a1a1a',
  },
  grandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  grandLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
  },
  grandVal: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
  },
  paySection: {
    flexDirection: 'row',
    gap: 16,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    marginBottom: 16,
  },
  payCol: {
    flex: 1,
  },
  payMethod: {
    fontSize: 8,
    color: '#444',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 8,
    color: '#666',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 7,
    color: '#aaa',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
  },
});

interface Props {
  invoice: Invoice;
  lines: LineItem[];
  client: ClientInfo;
  biz: BizInfo;
  accentColor?: string;
  title?: string;
  clientLabel?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
}

export function InvoicePDFDocument({ invoice, lines, client, biz, accentColor = '#185FA5', title = 'Facture', clientLabel = 'Facturé à', paymentTerms = 'Net 14 jours', deliveryTerms = 'À convenir' }: Props) {
  const subtotal      = lines.reduce((sum, li) => sum + li.qty * li.price, 0);
  const discountPct   = invoice.discountPct ?? 0;
  const discountAmt   = Math.round(subtotal * (discountPct / 100));
  const discountedSub = subtotal - discountAmt;
  const tax           = Math.round(discountedSub * 0.18);
  const total         = discountedSub + tax;
  const isPaid = invoice.status === 'paid';

  const svcWithholding = client.withholdingScenario
    ? calculateServiceWithholding(discountedSub, client.withholdingScenario as ServiceWithholdingScenario)
    : null;
  const RATE_LABEL: Record<string, string> = {
    'resident-with-ifu':    '5 %',
    'resident-without-ifu': '25 %',
    'construction':         '1 %',
    'non-resident':         '20 %',
  };
  const netAPayer = svcWithholding !== null ? total - svcWithholding : null;

  const bizAddr = [biz.address, biz.city, biz.country].filter(Boolean).join(', ');
  const bizContact = [biz.email, biz.phone].filter(Boolean).join(' · ');
  const bizCompliance = [
    biz.ifu && `IFU ${biz.ifu}`,
    biz.rccm && `RCCM ${biz.rccm}`,
    biz.taxRegime,
    biz.divisionFiscale,
  ].filter(Boolean).join(' · ');

  const clientCompliance = [
    client.ifu && `IFU ${client.ifu}`,
    client.rccm && `RCCM ${client.rccm}`,
    client.taxRegime,
    client.fiscalDivision,
  ].filter(Boolean).join(' · ');

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={[s.bizName, { color: accentColor }]}>{biz.name || 'Mon entreprise'}</Text>
            {bizAddr       && <Text style={s.bizMeta}>{bizAddr}</Text>}
            {bizContact    && <Text style={s.bizMeta}>{bizContact}</Text>}
            {bizCompliance && <Text style={s.bizMeta}>{bizCompliance}</Text>}
          </View>
          <View>
            <Text style={[s.docTitle, { color: accentColor }]}>{title}</Text>
            <Text style={s.docNum}>#{invoice.id}</Text>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Parties ── */}
        <View style={s.parties}>
          <View style={s.partiesLeft}>
            <Text style={s.blockLabel}>{clientLabel}</Text>
            <Text style={s.clientName}>{client.name}</Text>
            <Text style={s.smallText}>{client.city}</Text>
            {client.contact ? <Text style={[s.smallText, { marginTop: 2 }]}>Contact : {client.contact}</Text> : null}
            {client.phone   ? <Text style={s.smallText}>Tél : {client.phone}</Text> : null}
            {client.email   ? <Text style={s.smallText}>Email : {client.email}</Text> : null}
            {clientCompliance ? <Text style={[s.smallText, { marginTop: 2 }]}>{clientCompliance}</Text> : null}
          </View>
          <View style={s.partiesRight}>
            <Text style={s.blockLabel}>Détails</Text>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Émis le</Text>
              <Text style={s.metaVal}>{pdfFmtDate(invoice.issued)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Échéance</Text>
              <Text style={s.metaVal}>{pdfFmtDate(invoice.due)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Paiement</Text>
              <Text style={s.metaVal}>{paymentTerms}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaKey}>Livraison</Text>
              <Text style={s.metaVal}>{deliveryTerms}</Text>
            </View>
            {invoice.subject ? (
              <View style={s.metaRow}>
                <Text style={s.metaKey}>Référence</Text>
                <Text style={s.metaVal}>{invoice.subject}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Line items table ── */}
        <View>
          <View style={[s.tableHead, { backgroundColor: `${accentColor}1A` }]}>
            <Text style={s.thDesc}>Description</Text>
            <Text style={s.thRight}>Qté</Text>
            <Text style={s.thRight}>P.U.</Text>
            <Text style={s.thRight}>Montant</Text>
          </View>
          {lines.length === 0 ? (
            <View style={s.tableRow}>
              <Text style={[s.tdDesc, { color: '#aaa' }]}>Aucune ligne</Text>
            </View>
          ) : lines.map(li => (
            <View key={li.id} style={s.tableRow}>
              <Text style={s.tdDesc}>{li.desc}</Text>
              <Text style={s.tdRight}>{li.qty}</Text>
              <Text style={s.tdRight}>{pdfFmt(li.price)}</Text>
              <Text style={s.tdRight}>{pdfFmt(li.qty * li.price)}</Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={s.totals}>
          <View style={s.totInner}>
            <View style={s.totRow}>
              <Text style={s.totLabel}>Sous-total</Text>
              <Text style={s.totVal}>{pdfFmt(subtotal)} F CFA</Text>
            </View>
            {discountPct > 0 && (
              <View style={s.totRow}>
                <Text style={s.totLabel}>Remise ({discountPct}%)</Text>
                <Text style={[s.totVal, { color: '#888' }]}>{'-'}{pdfFmt(discountAmt)} F CFA</Text>
              </View>
            )}
            <View style={s.totRow}>
              <Text style={s.totLabel}>TVA (18 %)</Text>
              <Text style={s.totVal}>{pdfFmt(tax)} F CFA</Text>
            </View>
            {svcWithholding !== null && !isPaid && (
              <View style={s.totRow}>
                <Text style={s.totLabel}>
                  {'Retenue à la source ('}{RATE_LABEL[client.withholdingScenario!]}{') — Art.207/212'}
                </Text>
                <Text style={[s.totVal, { color: '#B26A09' }]}>{'−'}{pdfFmt(svcWithholding)} F CFA</Text>
              </View>
            )}
            {isPaid ? (
              <View style={s.totRow}>
                <Text style={s.totLabel}>Montant payé</Text>
                <Text style={[s.totVal, { color: '#1A7A47' }]}>{'−'}{pdfFmt(total)} F CFA</Text>
              </View>
            ) : null}
            <View style={[s.grandRow, { backgroundColor: accentColor }]}>
              <Text style={s.grandLabel}>{netAPayer !== null && !isPaid ? 'Net à payer' : 'Total dû'}</Text>
              <Text style={s.grandVal}>
                {isPaid ? '0' : pdfFmt(netAPayer ?? total)} F CFA
              </Text>
            </View>
          </View>
        </View>

        {/* ── Payment methods ── */}
        <View style={s.paySection}>
          <View style={s.payCol}>
            <Text style={s.blockLabel}>Modes de paiement</Text>
            <Text style={s.payMethod}>Mobile Money {'—'} MTN 70 12 34 56 {'·'} Orange 76 98 76 54</Text>
            <Text style={s.payMethod}>Wave {'—'} billio.app/pay/{invoice.id.toLowerCase()}</Text>
            <Text style={s.payMethod}>Ecobank {'—'} BF76 0001 2345 6789</Text>
          </View>
          <View style={s.payCol}>
            <Text style={s.blockLabel}>Notes</Text>
            <Text style={s.notesText}>
              Merci pour votre confiance. Paiement {'à'} r{'é'}gler sous 14 jours.
              Tout retard entra{'î'}ne une p{'é'}nalit{'é'} de 2 % par mois.
            </Text>
          </View>
        </View>

        {/* ── Footer ── */}
        <Text style={s.footer}>
          {biz.name || 'Mon entreprise'} {'·'} Facture g{'é'}n{'é'}r{'é'}e via Billio {'·'} TVA applicable au taux en vigueur
        </Text>
      </Page>
    </Document>
  );
}

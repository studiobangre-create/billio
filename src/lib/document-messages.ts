// Ready-to-send messages for invoices, reminders and quotes (French), used by
// SendDocumentDialog.

import { fmt, fmtDateLong } from '@/data';
import type { PaymentMethodLine } from '@/lib/payment-methods';

interface DocMessage { subject: string; message: string }

function paymentBlock(methods: PaymentMethodLine[]): string {
  if (methods.length === 0) return '';
  return '\n\nModes de paiement :\n' + methods.map(m => `• ${m.label} : ${m.value}`).join('\n');
}

function signature(orgName: string): string {
  return `\n\nCordialement,\n${orgName || 'Notre équipe'}`;
}

export function invoiceMessage(
  kind: 'send' | 'reminder',
  opts: { invoiceId: string; clientName: string; orgName: string; amountDue: number; due: string; methods: PaymentMethodLine[]; overdueDays?: number },
): DocMessage {
  const amount = `${fmt(opts.amountDue)} F CFA`;
  if (kind === 'send') {
    return {
      subject: `Facture ${opts.invoiceId} — ${opts.orgName || 'Facture'}`,
      message:
        `Bonjour ${opts.clientName},\n\n` +
        `Votre facture ${opts.invoiceId} d'un montant de ${amount} est à régler avant le ${fmtDateLong(opts.due)}.` +
        paymentBlock(opts.methods) +
        signature(opts.orgName),
    };
  }
  const late = opts.overdueDays && opts.overdueDays > 0
    ? `est échue depuis ${opts.overdueDays} jour${opts.overdueDays > 1 ? 's' : ''} (échéance le ${fmtDateLong(opts.due)})`
    : `arrive à échéance le ${fmtDateLong(opts.due)}`;
  return {
    subject: `Rappel — facture ${opts.invoiceId}`,
    message:
      `Bonjour ${opts.clientName},\n\n` +
      `Sauf erreur de notre part, la facture ${opts.invoiceId} (reste à payer : ${amount}) ${late}.\n` +
      `Merci de procéder au règlement ou de nous indiquer la date prévue de paiement.` +
      paymentBlock(opts.methods) +
      signature(opts.orgName),
  };
}

export function quoteMessage(
  kind: 'send' | 'reminder',
  opts: { quoteId: string; clientName: string; orgName: string; amount: number; validUntil: string },
): DocMessage {
  const amount = `${fmt(opts.amount)} F CFA`;
  const body = kind === 'send'
    ? `Notre devis ${opts.quoteId} s'élève à ${amount} et reste valable jusqu'au ${fmtDateLong(opts.validUntil)}. Nous pouvons vous transmettre le document détaillé sur simple demande.`
    : `Nous revenons vers vous au sujet du devis ${opts.quoteId} (${amount}), valable jusqu'au ${fmtDateLong(opts.validUntil)}. N'hésitez pas à nous faire part de vos questions.`;
  return {
    subject: kind === 'send' ? `Devis ${opts.quoteId} — ${opts.orgName || 'Devis'}` : `Suivi du devis ${opts.quoteId}`,
    message: `Bonjour ${opts.clientName},\n\n${body}` + signature(opts.orgName),
  };
}

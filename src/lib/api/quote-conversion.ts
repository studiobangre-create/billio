import { createInvoice, nextInvoiceId, removeInvoice } from '@/lib/api/invoices';
import { fetchLineItems, saveLineItems, deleteLineItems } from '@/lib/api/line-items';
import { updateQuote } from '@/lib/api/quotes';
import { recordInvoiceIssuanceEntry } from '@/lib/api/accounting';
import type { Invoice, Quote } from '@/lib/schemas';

/**
 * Turns a quote into a pending invoice with the same lines, then marks the
 * quote invoiced. If any step after the invoice insert fails, the invoice and
 * its lines are removed again so a retry doesn't leave a duplicate behind.
 *
 * The invoice keeps the quote's stored amount, so a later change of tax
 * regime doesn't change what the client was quoted.
 */
export async function convertQuoteToInvoice(
  orgId: string,
  quote: Quote,
  opts: { canInvoiceTVA: boolean; clientName: string },
): Promise<{ invoice: Invoice; accountingOk: boolean }> {
  const today   = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  const quoteLines = await fetchLineItems(orgId, { quoteId: quote.id });
  const invId      = await nextInvoiceId(orgId);
  const invoice: Invoice = {
    id: invId, subject: quote.subject, client: quote.client, issued: today, due: dueDate,
    amount: quote.amount, status: 'pending', discountPct: 0,
  };

  await createInvoice(orgId, invoice);
  try {
    await saveLineItems(orgId, quoteLines, { invoiceId: invId });
    await updateQuote(orgId, quote.id, { status: 'invoiced' });
  } catch (err) {
    await deleteLineItems(orgId, { invoiceId: invId }).catch(() => {});
    await removeInvoice(orgId, invId).catch(e => console.error('[rollback] removeInvoice failed:', e));
    throw err;
  }

  const htAmount  = opts.canInvoiceTVA ? Math.round(quote.amount / 1.18) : quote.amount;
  const tvaAmount = opts.canInvoiceTVA ? quote.amount - htAmount : 0;
  let accountingOk = true;
  try {
    await recordInvoiceIssuanceEntry(orgId, { invoiceId: invId, htAmount, tvaAmount, date: today, clientName: opts.clientName });
  } catch (err) {
    console.error('[recordInvoiceIssuanceEntry] failed:', err);
    accountingOk = false;
  }

  return { invoice, accountingOk };
}

import type { InvoicePDFProps } from '@/components/InvoicePDF';

/**
 * Renders an invoice/quote PDF. The PDF engine (@react-pdf, ~1.5 MB) is
 * imported here on demand, so pages only download it when a PDF is generated.
 */
export async function renderInvoicePdf(props: InvoicePDFProps): Promise<Blob> {
  const [{ pdf }, { InvoicePDFDocument }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('@/components/InvoicePDF'),
  ]);
  return pdf(<InvoicePDFDocument {...props} />).toBlob();
}

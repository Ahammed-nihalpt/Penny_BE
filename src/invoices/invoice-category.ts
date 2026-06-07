export const INVOICE_CATEGORIES = [
  'Utilities',
  'Rent',
  'Supplies',
  'Services',
  'Software',
  'Travel',
  'Taxes',
  'Other',
] as const;

export type InvoiceCategory = (typeof INVOICE_CATEGORIES)[number];

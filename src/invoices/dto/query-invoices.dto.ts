import { IsIn, IsOptional, IsString } from 'class-validator';

export const INVOICE_FILTERS = ['all', 'overdue', 'due', 'paid'] as const;
export type InvoiceFilter = (typeof INVOICE_FILTERS)[number];

export class QueryInvoicesDto {
  @IsOptional()
  @IsIn(INVOICE_FILTERS)
  filter?: InvoiceFilter;

  @IsOptional()
  @IsString()
  search?: string;
}

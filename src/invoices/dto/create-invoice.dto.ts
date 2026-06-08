import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { INVOICE_CATEGORIES } from '@app/invoices/invoice-category';
import type { InvoiceCategory } from '@app/invoices/invoice-category';

export class CreateInvoiceDto {
  @IsString()
  @MinLength(1)
  vendor!: string;

  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsEnum(INVOICE_CATEGORIES)
  category!: InvoiceCategory;

  @IsISO8601()
  dueDate!: string;

  @IsOptional()
  @IsISO8601()
  issuedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

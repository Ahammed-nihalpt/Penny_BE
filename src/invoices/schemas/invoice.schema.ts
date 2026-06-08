import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { INVOICE_CATEGORIES } from '@app/invoices/invoice-category';
import type { InvoiceCategory } from '@app/invoices/invoice-category';

export type InvoiceDocument = HydratedDocument<Invoice>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Invoice {
  @Prop({ required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  vendor!: string;

  @Prop({ trim: true })
  invoiceNumber?: string;

  @Prop({ trim: true })
  email?: string;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ type: String, required: true, enum: INVOICE_CATEGORIES, default: 'Other' })
  category!: InvoiceCategory;

  @Prop({ required: true })
  dueDate!: Date;

  @Prop()
  issuedDate?: Date;

  @Prop({ type: String, required: true, enum: ['open', 'paid'], default: 'open', index: true })
  status!: 'open' | 'paid';

  @Prop()
  paidAt?: Date;

  @Prop({ trim: true })
  notes?: string;

  @Prop()
  sourceFile?: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from '@app/invoices/schemas/invoice.schema';
import { InvoicesService } from '@app/invoices/invoices.service';
import { InvoicesController } from '@app/invoices/invoices.controller';
import { GeminiModule } from '@app/gemini/gemini.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Invoice.name, schema: InvoiceSchema }]),
    GeminiModule,
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}

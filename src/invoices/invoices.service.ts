import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import { Invoice, InvoiceDocument } from '@app/invoices/schemas/invoice.schema';
import { CreateInvoiceDto } from '@app/invoices/dto/create-invoice.dto';
import { UpdateInvoiceDto } from '@app/invoices/dto/update-invoice.dto';
import { QueryInvoicesDto } from '@app/invoices/dto/query-invoices.dto';
import { computeSummary, InvoiceSummary } from '@app/invoices/invoice-summary';

@Injectable()
export class InvoicesService {
  constructor(@InjectModel(Invoice.name) private readonly model: Model<InvoiceDocument>) {}

  buildFilter(userId: string, query: QueryInvoicesDto): QueryFilter<InvoiceDocument> {
    const filter: Record<string, unknown> = { userId };
    const now = new Date();
    if (query.filter === 'overdue') {
      filter.status = 'open';
      filter.dueDate = { $lt: now };
    } else if (query.filter === 'due') {
      filter.status = 'open';
      filter.dueDate = { $gte: now };
    } else if (query.filter === 'paid') {
      filter.status = 'paid';
    }
    if (query.search) {
      filter.vendor = { $regex: query.search, $options: 'i' };
    }
    return filter;
  }

  create(userId: string, dto: CreateInvoiceDto): Promise<InvoiceDocument> {
    return this.model.create({
      ...dto,
      userId,
      dueDate: new Date(dto.dueDate),
      issuedDate: dto.issuedDate ? new Date(dto.issuedDate) : undefined,
    });
  }

  findAll(userId: string, query: QueryInvoicesDto): Promise<InvoiceDocument[]> {
    return this.model.find(this.buildFilter(userId, query)).sort({ dueDate: 1 }).exec();
  }

  async findOne(userId: string, id: string): Promise<InvoiceDocument> {
    const invoice = await this.model.findOne({ _id: id, userId }).exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(userId: string, id: string, dto: UpdateInvoiceDto): Promise<InvoiceDocument> {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.dueDate) patch.dueDate = new Date(dto.dueDate);
    if (dto.issuedDate) patch.issuedDate = new Date(dto.issuedDate);
    if (dto.status === 'paid') patch.paidAt = new Date();
    const invoice = await this.model
      .findOneAndUpdate({ _id: id, userId }, patch, { returnDocument: 'after' })
      .exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async markPaid(userId: string, id: string): Promise<InvoiceDocument> {
    const invoice = await this.model
      .findOneAndUpdate(
        { _id: id, userId },
        { status: 'paid', paidAt: new Date() },
        { returnDocument: 'after' },
      )
      .exec();
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  // Bulk: mark every OPEN invoice matching the filter as paid. Returns the
  // invoices that were changed (pre-update snapshot, for names + ids).
  async markManyPaid(userId: string, query: QueryInvoicesDto): Promise<InvoiceDocument[]> {
    const filter: Record<string, unknown> = { ...this.buildFilter(userId, query), status: 'open' };
    const list = await this.model.find(filter as QueryFilter<InvoiceDocument>).exec();
    if (list.length) {
      const ids = list.map((i) => i._id);
      await this.model
        .updateMany({ _id: { $in: ids } }, { status: 'paid', paidAt: new Date() })
        .exec();
    }
    return list;
  }

  // Bulk: delete every invoice matching the filter. Returns what was deleted.
  async removeMany(userId: string, query: QueryInvoicesDto): Promise<InvoiceDocument[]> {
    const list = await this.model.find(this.buildFilter(userId, query)).exec();
    if (list.length) {
      const ids = list.map((i) => i._id);
      await this.model.deleteMany({ _id: { $in: ids } }).exec();
    }
    return list;
  }

  async getSummary(userId: string): Promise<InvoiceSummary> {
    const invoices = await this.model.find({ userId }).exec();
    return computeSummary(invoices, new Date());
  }

  async remove(userId: string, id: string): Promise<void> {
    const res = await this.model.deleteOne({ _id: id, userId }).exec();
    if (res.deletedCount === 0) throw new NotFoundException('Invoice not found');
  }

  toCsv(invoices: Invoice[]): string {
    const header = ['vendor', 'amount', 'category', 'status', 'dueDate'];
    const escape = (s: string): string => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const rows = invoices.map((i) => {
      const due =
        i.dueDate instanceof Date ? i.dueDate.toISOString().slice(0, 10) : String(i.dueDate);
      return [
        escape(i.vendor),
        escape(String(i.amount)),
        escape(i.category),
        escape(i.status),
        escape(due),
      ].join(',');
    });
    return [header.join(','), ...rows].join('\n');
  }
}

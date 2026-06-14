import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { InvoicesService } from '@app/invoices/invoices.service';
import { UsersService } from '@app/users/users.service';
import { ComposioService } from '@app/composio/composio.service';
import { INVOICE_CATEGORIES } from '@app/invoices/invoice-category';
import type { UpdateInvoiceDto } from '@app/invoices/dto/update-invoice.dto';
import type { AgentAction } from '@app/chat/agent/agent.types';

export function buildTools(
  userId: string,
  invoices: InvoicesService,
  users: UsersService,
  composio: ComposioService,
  actions: AgentAction[],
) {
  const queryInvoices = tool(
    async ({ filter, search }) => {
      const list = await invoices.findAll(userId, { filter, search });
      actions.push({ tool: 'query_invoices', invoiceIds: list.map((i) => i.id) });
      return JSON.stringify(
        list.map((i) => ({
          id: i.id,
          vendor: i.vendor,
          amount: i.amount,
          category: i.category,
          status: i.status,
          dueDate: i.dueDate,
        })),
      );
    },
    {
      name: 'query_invoices',
      description:
        "Get the user's invoices. filter: all|overdue|due|paid. search: vendor substring. Call this to find an invoice's id before marking it paid.",
      schema: z.object({
        filter: z.enum(['all', 'overdue', 'due', 'paid']).optional(),
        search: z.string().optional(),
      }),
    },
  );

  const getSummary = tool(
    async () => {
      const summary = await invoices.getSummary(userId);
      actions.push({ tool: 'get_summary', invoiceIds: [] });
      return JSON.stringify(summary);
    },
    {
      name: 'get_summary',
      description:
        'Get dashboard totals: outstanding, overdue (total+count), due this week, paid this month, by-category, top vendors.',
      schema: z.object({}),
    },
  );

  const markPaid = tool(
    async ({ invoiceId }) => {
      const updated = await invoices.markPaid(userId, invoiceId);
      actions.push({ tool: 'mark_paid', invoiceIds: [invoiceId] });
      return `Marked the invoice from ${updated.vendor} as paid.`;
    },
    {
      name: 'mark_paid',
      description: 'Mark an invoice as paid by its id (get the id from query_invoices first).',
      schema: z.object({ invoiceId: z.string() }),
    },
  );

  const createInvoice = tool(
    async ({ vendor, amount, category, dueDate, invoiceNumber, notes }) => {
      const created = await invoices.create(userId, {
        vendor,
        amount,
        category,
        dueDate,
        invoiceNumber,
        notes,
      });
      actions.push({ tool: 'create_invoice', invoiceIds: [created.id] });
      return `Created an invoice from ${vendor} for ${amount}, due ${dueDate}.`;
    },
    {
      name: 'create_invoice',
      description:
        'Create a new invoice. dueDate must be an ISO date (YYYY-MM-DD). invoiceNumber and notes are optional.',
      schema: z.object({
        vendor: z.string(),
        amount: z.number(),
        category: z.enum(INVOICE_CATEGORIES),
        dueDate: z.string(),
        invoiceNumber: z.string().optional(),
        notes: z.string().optional(),
      }),
    },
  );

  const updateInvoice = tool(
    async ({ invoiceId, vendor, amount, category, dueDate, invoiceNumber, notes }) => {
      const patch: UpdateInvoiceDto = {};
      if (vendor !== undefined) patch.vendor = vendor;
      if (amount !== undefined) patch.amount = amount;
      if (category !== undefined) patch.category = category;
      if (dueDate !== undefined) patch.dueDate = dueDate;
      if (invoiceNumber !== undefined) patch.invoiceNumber = invoiceNumber;
      if (notes !== undefined) patch.notes = notes;
      if (Object.keys(patch).length === 0) {
        return 'Tell me what to change: vendor, amount, category, due date, invoice number, or notes.';
      }
      const updated = await invoices.update(userId, invoiceId, patch);
      actions.push({ tool: 'update_invoice', invoiceIds: [invoiceId] });
      return `Updated the invoice from ${updated.vendor}.`;
    },
    {
      name: 'update_invoice',
      description:
        'Edit an existing invoice by its id (get the id from query_invoices first). Pass only the fields to change: vendor, amount, category, dueDate (ISO YYYY-MM-DD), invoiceNumber, or notes. To mark it paid, use mark_paid instead.',
      schema: z.object({
        invoiceId: z.string(),
        vendor: z.string().optional(),
        amount: z.number().optional(),
        category: z.enum(INVOICE_CATEGORIES).optional(),
        dueDate: z.string().optional(),
        invoiceNumber: z.string().optional(),
        notes: z.string().optional(),
      }),
    },
  );

  const deleteInvoice = tool(
    async ({ invoiceId }) => {
      const invoice = await invoices.findOne(userId, invoiceId);
      await invoices.remove(userId, invoiceId);
      actions.push({ tool: 'delete_invoice', invoiceIds: [invoiceId] });
      return `Deleted the invoice from ${invoice.vendor}.`;
    },
    {
      name: 'delete_invoice',
      description:
        'Permanently delete an invoice by its id (get the id from query_invoices first). This cannot be undone, so only delete when the user clearly asks to delete a specific invoice.',
      schema: z.object({ invoiceId: z.string() }),
    },
  );

  const markPaidBulk = tool(
    async ({ filter, search }) => {
      const changed = await invoices.markManyPaid(userId, { filter, search });
      actions.push({ tool: 'mark_paid_bulk', invoiceIds: changed.map((i) => i.id) });
      if (changed.length === 0) return 'There were no matching open invoices to mark paid.';
      const names = changed
        .slice(0, 5)
        .map((i) => i.vendor)
        .join(', ');
      const extra = changed.length > 5 ? `, +${changed.length - 5} more` : '';
      return `Marked ${changed.length} invoice${changed.length === 1 ? '' : 's'} as paid: ${names}${extra}.`;
    },
    {
      name: 'mark_paid_bulk',
      description:
        'Mark MANY invoices paid at once, by condition. filter: all|overdue|due|paid (only open ones are changed). search: vendor substring. Use for requests like "mark all overdue invoices paid". For a single invoice use mark_paid.',
      schema: z.object({
        filter: z.enum(['all', 'overdue', 'due', 'paid']).optional(),
        search: z.string().optional(),
      }),
    },
  );

  const deleteBulk = tool(
    async ({ filter, search }) => {
      const removed = await invoices.removeMany(userId, { filter, search });
      actions.push({ tool: 'delete_invoices_bulk', invoiceIds: removed.map((i) => i.id) });
      if (removed.length === 0) return 'There were no matching invoices to delete.';
      return `Permanently deleted ${removed.length} invoice${removed.length === 1 ? '' : 's'}.`;
    },
    {
      name: 'delete_invoices_bulk',
      description:
        'Delete MANY invoices at once by condition — USE THIS whenever the user asks to delete a group/category/all matching a filter (e.g. "delete all paid invoices", "delete everything from Acme", "delete my overdue invoices"). filter: all|overdue|due|paid. search: vendor substring. Do not ask for an invoice id. (For exactly one invoice, use delete_invoice instead.)',
      schema: z.object({
        filter: z.enum(['all', 'overdue', 'due', 'paid']).optional(),
        search: z.string().optional(),
      }),
    },
  );

  const emailSummary = tool(
    async ({ filter }) => {
      if (!composio.enabled) {
        return 'Emailing isn’t set up yet. Ask the owner to add a Composio API key and connect a Gmail account.';
      }
      const user = await users.findById(userId);
      const to = user?.email;
      if (!to) return "I don't have an email address on file to send to.";
      const greeting = `Hi ${user?.preferredName ?? user?.name ?? 'there'},\n\n`;
      const money = (n: number): string => n.toFixed(2);
      const date = (d: Date | string): string => new Date(d).toISOString().slice(0, 10);

      let subject: string;
      let body: string;
      let what: string;
      let ids: string[] = [];

      if (!filter || filter === 'all') {
        // No filter → the totals recap.
        const s = await invoices.getSummary(userId);
        what = 'summary';
        subject = `Your invoice summary — ${money(s.outstanding)} outstanding`;
        body =
          greeting +
          `Here's where your invoices stand right now:\n` +
          `- Outstanding: ${money(s.outstanding)}\n` +
          `- Overdue: ${money(s.overdue.total)} across ${s.overdue.count} invoice(s)\n` +
          `- Due this week: ${money(s.dueThisWeek)}\n` +
          `- Paid this month: ${money(s.paidThisMonth)}\n\n` +
          `— Penny, your invoice copilot`;
      } else {
        // Specific filter → an itemized list of those invoices.
        const list = await invoices.findAll(userId, { filter });
        ids = list.map((i) => i.id);
        const total = list.reduce((sum, i) => sum + i.amount, 0);
        const label = {
          overdue: 'overdue invoices',
          due: 'invoices due soon',
          paid: 'paid invoices',
        }[filter];
        what = label;
        subject = `Your ${label} — ${money(total)} (${list.length})`;
        const lines = list.length
          ? list
              .map(
                (i) => `- ${i.vendor}: ${money(i.amount)} — due ${date(i.dueDate)} (${i.status})`,
              )
              .join('\n')
          : `You have no ${label} right now. 🎉`;
        body =
          greeting +
          `Here ${list.length === 1 ? 'is' : 'are'} your ${label} (${list.length}, totaling ${money(total)}):\n\n` +
          `${lines}\n\n— Penny, your invoice copilot`;
      }

      await composio.sendEmail(to, subject, body);
      actions.push({ tool: 'email_summary', invoiceIds: ids });
      return `Emailed your ${what} to ${to}.`;
    },
    {
      name: 'email_summary',
      description:
        'Email the owner their invoices. Optional filter: "all" (default — sends the totals summary), "overdue", "due" (due soon), or "paid" (sends an itemized list of those). Use the filter the user asks for, e.g. "email my overdue invoices" → filter "overdue".',
      schema: z.object({
        filter: z.enum(['all', 'overdue', 'due', 'paid']).optional(),
      }),
    },
  );

  const setPreferredName = tool(
    async ({ name }) => {
      await users.setPreferredName(userId, name);
      actions.push({ tool: 'set_preferred_name', invoiceIds: [] });
      return `Got it — I'll call you ${name} from now on.`;
    },
    {
      name: 'set_preferred_name',
      description:
        'Save what the user wants to be called when they ask you to call them by a name (e.g. "call me Nihal"). This persists across conversations.',
      schema: z.object({ name: z.string() }),
    },
  );

  return [
    queryInvoices,
    getSummary,
    markPaid,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    markPaidBulk,
    deleteBulk,
    emailSummary,
    setPreferredName,
  ];
}

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { InvoicesService } from '@app/invoices/invoices.service';
import { UsersService } from '@app/users/users.service';
import { INVOICE_CATEGORIES } from '@app/invoices/invoice-category';
import type { AgentAction } from '@app/chat/agent/agent.types';

export function buildTools(
  userId: string,
  invoices: InvoicesService,
  users: UsersService,
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

  const getSummary = tool(async () => JSON.stringify(await invoices.getSummary(userId)), {
    name: 'get_summary',
    description:
      'Get dashboard totals: outstanding, overdue (total+count), due this week, paid this month, by-category, top vendors.',
    schema: z.object({}),
  });

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
    async ({ vendor, amount, category, dueDate }) => {
      const created = await invoices.create(userId, { vendor, amount, category, dueDate });
      actions.push({ tool: 'create_invoice', invoiceIds: [created.id] });
      return `Created an invoice from ${vendor} for ${amount}, due ${dueDate}.`;
    },
    {
      name: 'create_invoice',
      description: 'Create a new invoice. dueDate must be an ISO date (YYYY-MM-DD).',
      schema: z.object({
        vendor: z.string(),
        amount: z.number(),
        category: z.enum(INVOICE_CATEGORIES),
        dueDate: z.string(),
      }),
    },
  );

  const setPreferredName = tool(
    async ({ name }) => {
      await users.setPreferredName(userId, name);
      return `Got it — I'll call you ${name} from now on.`;
    },
    {
      name: 'set_preferred_name',
      description:
        'Save what the user wants to be called when they ask you to call them by a name (e.g. "call me Nihal"). This persists across conversations.',
      schema: z.object({ name: z.string() }),
    },
  );

  return [queryInvoices, getSummary, markPaid, createInvoice, setPreferredName];
}

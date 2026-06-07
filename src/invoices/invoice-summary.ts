export interface InvoiceLike {
  vendor: string;
  amount: number;
  category: string;
  status: 'open' | 'paid';
  dueDate: Date;
  paidAt?: Date;
}

export interface InvoiceSummary {
  outstanding: number;
  overdue: { total: number; count: number };
  dueThisWeek: number;
  paidThisMonth: number;
  byCategory: { category: string; total: number }[];
  overTime: { month: string; open: number; paid: number }[];
  topVendors: { vendor: string; total: number }[];
}

const monthKey = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export function computeSummary(invoices: InvoiceLike[], now: Date): InvoiceSummary {
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const thisMonth = monthKey(now);

  let outstanding = 0;
  let overdueTotal = 0;
  let overdueCount = 0;
  let dueThisWeek = 0;
  let paidThisMonth = 0;
  const byCat = new Map<string, number>();
  const byVendor = new Map<string, number>();
  const byMonth = new Map<string, { open: number; paid: number }>();

  for (const i of invoices) {
    byCat.set(i.category, (byCat.get(i.category) ?? 0) + i.amount);
    byVendor.set(i.vendor, (byVendor.get(i.vendor) ?? 0) + i.amount);

    const mk = monthKey(i.dueDate);
    const bucket = byMonth.get(mk) ?? { open: 0, paid: 0 };
    if (i.status === 'paid') bucket.paid += i.amount;
    else bucket.open += i.amount;
    byMonth.set(mk, bucket);

    if (i.status === 'open') {
      outstanding += i.amount;
      if (i.dueDate < now) {
        overdueTotal += i.amount;
        overdueCount += 1;
      } else if (i.dueDate <= weekAhead) {
        dueThisWeek += i.amount;
      }
    } else if (i.paidAt && monthKey(i.paidAt) === thisMonth) {
      paidThisMonth += i.amount;
    }
  }

  const byCategory = [...byCat.entries()].map(([category, total]) => ({ category, total }));
  const topVendors = [...byVendor.entries()]
    .map(([vendor, total]) => ({ vendor, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const overTime: { month: string; open: number; paid: number }[] = [];
  for (let n = 5; n >= 0; n--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - n, 1));
    const b = byMonth.get(monthKey(d)) ?? { open: 0, paid: 0 };
    overTime.push({ month: monthKey(d), open: b.open, paid: b.paid });
  }

  return {
    outstanding,
    overdue: { total: overdueTotal, count: overdueCount },
    dueThisWeek,
    paidThisMonth,
    byCategory,
    overTime,
    topVendors,
  };
}

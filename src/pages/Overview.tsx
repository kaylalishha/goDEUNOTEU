import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { formatIDR } from '../lib/format'
import {
  emptyPaymentCounts,
  isTaxOverdue,
  paymentCountsByBatch,
  taxAmountDue,
  taxDaysOverdue,
} from '../lib/billing'
import { StatusBadge } from '../components/StatusBadge'
import {
  ORDER_STATUS_OPTIONS,
  TIPE_BARANG_OPTIONS,
  type BatchBillStatus,
} from '../types'

// "Perlu Perhatian" rules — change here.
// Batch bills have no deadline field, so they're due this many days after
// being issued; any unpaid bill past that is flagged.
const BATCH_DUE_DAYS = 1
// Tax bills have a real deadline; flag them once unpaid for more than this
// many days past it.
const TAX_GRACE_DAYS = 3
const DAY_MS = 24 * 60 * 60 * 1000

// Whole days since `dueMs`, or null if it isn't past due yet.
function daysPast(dueMs: number, nowMs: number): number | null {
  return nowMs > dueMs ? Math.floor((nowMs - dueMs) / DAY_MS) : null
}

interface AttentionRow {
  key: string
  title: string
  subtitle: string
  amount: number
  status: string
  daysLate: number
  to: string
}

function AttentionCard({
  title,
  rule,
  rows,
  empty,
}: {
  title: string
  rule: string
  rows: AttentionRow[]
  empty: string
}) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
          <p className="mt-0.5 text-xs text-slate-500">{rule}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
            rows.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">✓ {empty}</p>
      ) : (
        <ul className="-mx-2 flex max-h-96 flex-col overflow-y-auto">
          {rows.map((r) => (
            <li key={r.key}>
              <Link
                to={r.to}
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-rose-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{r.title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                    {r.subtitle} · {formatIDR(r.amount)}
                    <StatusBadge status={r.status} />
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="whitespace-nowrap rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white">
                    {r.daysLate === 0 ? 'Lewat deadline' : `+${r.daysLate} hari`}
                  </span>
                  <span className="text-slate-300" aria-hidden="true">
                    ›
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface BatchChip {
  batchId: string
  batchNumber: string
  paid: number
  total: number
  unpaidNames: string[]
}

function CountBadge({ n }: { n: number }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
        n > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
      }`}
    >
      {n}
    </span>
  )
}

// One chip per batch: "Batch 300  2/3" = 2 of 3 customers paid. Clicking
// opens that batch's record dialog in Order Recap.
function BatchAttentionCard({ chips }: { chips: BatchChip[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Batch</h4>
          <p className="mt-0.5 text-xs text-slate-500">
            Ada tagihan belum lunas lebih dari {BATCH_DUE_DAYS} hari sejak terbit · angka = sudah bayar / total
            customer
          </p>
        </div>
        <CountBadge n={chips.length} />
      </div>
      {chips.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">✓ Semua tagihan batch aman.</p>
      ) : (
        <ul className="flex max-h-96 flex-wrap content-start gap-2 overflow-y-auto">
          {chips.map((c) => (
            <li key={c.batchId}>
              <Link
                to={`/orders?batch=${encodeURIComponent(c.batchId)}`}
                title={`Belum bayar: ${c.unpaidNames.join(', ')}`}
                className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white py-1 pl-3 pr-1 text-sm transition hover:border-rose-400 hover:bg-rose-50"
              >
                <span className="font-semibold text-slate-800">{c.batchNumber}</span>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-rose-700">
                  {c.paid}/{c.total}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// Whole-number percent; 0 when there's nothing to divide.
const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0)

function Card({
  title,
  subtitle,
  to,
  linkLabel,
  children,
}: {
  title: string
  subtitle: string
  to: string
  linkLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <Link to={to} className="whitespace-nowrap text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline">
          {linkLabel} →
        </Link>
      </div>
      {children}
    </section>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">{children}</p>
}

// One labelled horizontal bar per row: label · bar · % (count). A single
// series, so one hue and no legend; the numbers sit beside every bar.
function BarRow({
  label,
  sublabel,
  value,
  max,
  valueText,
  title,
}: {
  label: string
  sublabel?: string
  value: number
  max: number
  valueText: React.ReactNode
  title: string
}) {
  const width = max > 0 ? (value / max) * 100 : 0
  return (
    <li className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm" title={title}>
      <span className="truncate text-slate-700">
        {label}
        {sublabel && <span className="block truncate text-xs text-slate-400">{sublabel}</span>}
      </span>
      <span className="h-2.5 rounded-full bg-slate-100">
        <span
          className="block h-full rounded-full bg-rose-500 transition-[width]"
          style={{ width: value > 0 ? `max(${width}%, 4px)` : 0 }}
        />
      </span>
      <span className="text-right tabular-nums text-slate-900">{valueText}</span>
    </li>
  )
}

const BILL_STATUS_STYLE: Record<BatchBillStatus, { bar: string; dot: string }> = {
  Lunas: { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  'Menunggu Konfirmasi': { bar: 'bg-amber-400', dot: 'bg-amber-400' },
  'Belum Bayar': { bar: 'bg-rose-500', dot: 'bg-rose-500' },
}
// Paid first, so the bar reads left-to-right from "done" to "to chase".
const BILL_STATUS_ORDER: BatchBillStatus[] = ['Lunas', 'Menunggu Konfirmasi', 'Belum Bayar']

// Headline "% lunas" + one segmented bar + a legend that carries the
// labels, counts and percentages (so status is never shown by color alone).
function PaymentBreakdown({
  statuses,
  noun,
  extra,
}: {
  statuses: BatchBillStatus[]
  noun: string
  extra?: React.ReactNode
}) {
  const total = statuses.length
  if (total === 0) return <EmptyNote>Belum ada {noun}.</EmptyNote>
  const counts = BILL_STATUS_ORDER.map((s) => [s, statuses.filter((x) => x === s).length] as const)
  const paid = counts[0][1]
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-slate-900">{pct(paid, total)}%</span>
        <span className="text-sm text-slate-500">
          lunas · {paid} dari {total} {noun}
        </span>
      </div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full bg-slate-100">
        {counts
          .filter(([, n]) => n > 0)
          .map(([s, n]) => (
            <div
              key={s}
              className={`${BILL_STATUS_STYLE[s].bar} h-full`}
              style={{ width: `${(n / total) * 100}%` }}
              title={`${s}: ${n} (${pct(n, total)}%)`}
            />
          ))}
      </div>
      <ul className="flex flex-col gap-1.5 text-sm">
        {counts.map(([s, n]) => (
          <li key={s} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span className={`h-2.5 w-2.5 rounded-full ${BILL_STATUS_STYLE[s].dot}`} aria-hidden="true" />
              {s === 'Lunas' ? 'Lunas' : s === 'Belum Bayar' ? 'Belum bayar' : 'Menunggu konfirmasi'}
            </span>
            <span className="tabular-nums text-slate-900">
              {pct(n, total)}% <span className="text-slate-400">({n})</span>
            </span>
          </li>
        ))}
      </ul>
      {extra}
    </div>
  )
}

export default function Overview() {
  const batches = useStore((s) => s.batches)
  const items = useStore((s) => s.items)
  const batchBills = useStore((s) => s.batchBills)
  const taxBills = useStore((s) => s.taxBills)
  const getCustomerName = useStore((s) => s.getCustomerName)
  const getBoxNumber = useStore((s) => s.getBoxNumber)

  // ── Status pesanan: share of batches at each stage, in pipeline order.
  const orderCounts = ORDER_STATUS_OPTIONS.map((s) => [s, batches.filter((b) => b.orderStatus === s).length] as const)
  const maxOrderCount = Math.max(0, ...orderCounts.map(([, n]) => n))

  // ── Penjualan per item: items sold + revenue per category, biggest first.
  const sales = TIPE_BARANG_OPTIONS.map((tipe) => {
    const ofType = items.filter((i) => i.tipeBarang === tipe)
    return { tipe, count: ofType.length, revenue: ofType.reduce((s, i) => s + i.priceIDR, 0) }
  }).sort((a, b) => b.count - a.count || b.revenue - a.revenue)
  const totalRevenue = sales.reduce((s, x) => s + x.revenue, 0)
  const maxSalesCount = Math.max(0, ...sales.map((x) => x.count))

  // Same rule as Tax Bills' "melewati deadline" banner and DeadlineBadge.
  const overdueTax = taxBills.filter(isTaxOverdue)

  // ── Perlu Perhatian
  const now = Date.now()
  // A batch needs attention when any of its bills is still unpaid more than
  // BATCH_DUE_DAYS after being issued (batch bills carry no deadline field).
  // Shown per batch with Order Recap's own payment counts: paid / total.
  const countsByBatch = paymentCountsByBatch(batchBills)
  const overdueBatchIds = new Set(
    batchBills
      .filter(
        (b) =>
          b.status !== 'Lunas' &&
          daysPast(new Date(b.createdAt).getTime() + BATCH_DUE_DAYS * DAY_MS, now) !== null,
      )
      .map((b) => b.batchId),
  )
  const batchAttention: BatchChip[] = batches
    .filter((batch) => overdueBatchIds.has(batch.id))
    .map((batch) => {
      const counts = countsByBatch.get(batch.id) ?? emptyPaymentCounts()
      return {
        batchId: batch.id,
        // From the batch record, exactly as Order Recap shows it.
        batchNumber: batch.batchNumber,
        paid: counts.Lunas,
        total: counts.Lunas + counts['Menunggu Konfirmasi'] + counts['Belum Bayar'],
        unpaidNames: batchBills
          .filter((b) => b.batchId === batch.id && b.status !== 'Lunas')
          .map((b) => getCustomerName(b.customerId)),
      }
    })
    .sort((a, b) => a.batchNumber.localeCompare(b.batchNumber, undefined, { numeric: true }))

  // Tax: overdue (as on Tax Bills) by more than TAX_GRACE_DAYS. The flag is
  // the same N that Tax Bills shows as "Overdue N hari".
  const taxAttention: AttentionRow[] = overdueTax
    .filter((t) => taxDaysOverdue(t) > TAX_GRACE_DAYS)
    .map((t) => ({
      key: t.id,
      title: getCustomerName(t.customerId),
      subtitle: `Box ${getBoxNumber(t.boxId)}`,
      amount: taxAmountDue(t),
      status: t.status,
      daysLate: taxDaysOverdue(t),
      to: `/tax-bills?box=${encodeURIComponent(t.boxId)}`,
    }))
    .sort((a, b) => b.daysLate - a.daysLate)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Overview</h2>
        <p className="text-sm text-slate-500">Ringkasan status pesanan, pembayaran, dan penjualan.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Status Pesanan"
          subtitle={`Persentase ${batches.length} batch di tiap tahap pengiriman`}
          to="/orders"
          linkLabel="Order Recap"
        >
          {batches.length === 0 ? (
            <EmptyNote>Belum ada batch.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {orderCounts.map(([status, n]) => (
                <BarRow
                  key={status}
                  label={status}
                  value={n}
                  max={maxOrderCount}
                  title={`${status}: ${n} batch (${pct(n, batches.length)}%)`}
                  valueText={
                    <>
                      {pct(n, batches.length)}% <span className="text-slate-400">({n})</span>
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Penjualan per Item"
          subtitle={`${items.length} item terjual · ${formatIDR(totalRevenue)} total penjualan`}
          to="/orders"
          linkLabel="Order Recap"
        >
          {items.length === 0 ? (
            <EmptyNote>Belum ada item terjual.</EmptyNote>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {sales.map((s) => (
                <BarRow
                  key={s.tipe}
                  label={s.tipe}
                  sublabel={s.count > 0 ? formatIDR(s.revenue) : undefined}
                  value={s.count}
                  max={maxSalesCount}
                  title={`${s.tipe}: ${s.count} item (${pct(s.count, items.length)}%) · ${formatIDR(s.revenue)}`}
                  valueText={
                    <>
                      {s.count} item <span className="text-slate-400">({pct(s.count, items.length)}%)</span>
                    </>
                  }
                />
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Status Pembayaran Batch"
          subtitle="Tagihan barang per customer per batch"
          to="/orders"
          linkLabel="Order Recap"
        >
          <PaymentBreakdown statuses={batchBills.map((b) => b.status)} noun="tagihan batch" />
        </Card>

        <Card
          title="Status Pembayaran Tax"
          subtitle="Tagihan pajak per customer per box"
          to="/tax-bills"
          linkLabel="Tax Bills"
        >
          <PaymentBreakdown
            statuses={taxBills.map((t) => t.status)}
            noun="tagihan pajak"
            extra={
              overdueTax.length > 0 && (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  ⚠ {overdueTax.length} tagihan lewat deadline
                </p>
              )
            }
          />
        </Card>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Perlu Perhatian</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BatchAttentionCard chips={batchAttention} />
          <AttentionCard
            title="Box (Pajak)"
            rule={`Belum lunas lebih dari ${TAX_GRACE_DAYS} hari lewat deadline`}
            rows={taxAttention}
            empty="Semua tagihan pajak aman."
          />
        </div>
      </div>
    </div>
  )
}

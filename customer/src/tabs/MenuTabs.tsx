import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BagIcon,
  CalculatorIcon,
  ChatIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  FileTextIcon,
  PackageIcon,
  PlaneIcon,
  ShieldIcon,
  StoreIcon,
  WarehouseIcon,
} from '../components/Icons'

type Icon = ComponentType<{ size?: number }>

function TabHeading({ plain, gradient, body }: { plain: string; gradient: string; body: string }) {
  return (
    <div className="mb-6">
      <h2 className="t-section text-ink">
        {plain} <span className="text-gradient">{gradient}</span>
      </h2>
      <p className="t-body read-measure mt-3 text-ink-2">{body}</p>
    </div>
  )
}

function FeatureMenu({
  label,
  items,
}: {
  label: string
  items: Array<{ label: string; to: string; icon: Icon; primary?: boolean; wide?: boolean }>
}) {
  return (
    <nav className="feature-menu" aria-label={label}>
      {items.map((it) => (
        <Link
          key={it.to}
          className="feature-menu-item"
          data-primary={it.primary || undefined}
          data-wide={it.wide || undefined}
          to={it.to}
        >
          <span className="feature-menu-icon">
            <it.icon size={it.primary ? 22 : 18} />
          </span>
          <span className="feature-menu-label">{it.label}</span>
          {it.primary && <ChevronRightIcon size={20} className="feature-menu-arrow" />}
        </Link>
      ))}
    </nav>
  )
}

function TabShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[848px] px-5 pt-8 pb-32 sm:px-6 md:pt-10">{children}</div>
}

// ── Order tab (FR-GO-L-003) ────────────────────────────────────────
export function OrderTab() {
  return (
    <TabShell>
      <TabHeading plain="Layanan" gradient="Pesanan" body="Bayar tagihan batch kamu atau hitung estimasi harga jajan dari Jepang." />
      <FeatureMenu
        label="Layanan pesanan"
        items={[
          { label: 'Bayar Batch', to: '/id/order', icon: BagIcon, primary: true },
          { label: 'Kalkulator Harga', to: '/id/calculator', icon: CalculatorIcon, wide: true },
        ]}
      />
    </TabShell>
  )
}

// ── Tagihan tab (FR-GO-L-003, FR-GO-L-004) ─────────────────────────
// One card per `order_status` value in the admin MVP, in the same order and
// with the same labels the admin sets through Box Management.
const ORDER_STAGES: Array<{ name: string; status: string; text: string; icon: Icon }> = [
  {
    name: 'Di seller',
    status: 'Dibeli dari Seller',
    text: 'Sudah dibelikan admin di Mercari. Tinggal tunggu seller kirim ke gudang.',
    icon: StoreIcon,
  },
  {
    name: 'Gudang Jepang',
    status: 'Di WH Jepang',
    text: 'Sampai di gudang Jepang, dikumpulkan dulu ke dalam box.',
    icon: WarehouseIcon,
  },
  {
    name: 'Ke Indonesia',
    status: 'Dikirim ke Indonesia',
    text: 'Box sedang terbang ke Indonesia pakai EMS.',
    icon: PlaneIcon,
  },
  {
    name: 'Bea cukai',
    status: 'Di Bea Cukai',
    text: 'Box diperiksa bea cukai. Tagihan pajak per customer terbit di sini.',
    icon: ShieldIcon,
  },
  {
    name: 'Gudang Indonesia',
    status: 'Di WH Indonesia',
    text: 'Sudah di tangan kami. Lunasi pajak, lalu barang disiapkan untuk dikirim.',
    icon: PackageIcon,
  },
  {
    name: 'Selesai',
    status: 'Selesai',
    text: 'Pesanan selesai dan sudah dikirim ke kamu.',
    icon: CheckCircleIcon,
  },
]

export function TagihanTab() {
  return (
    <TabShell>
      <TabHeading plain="Tagihan &" gradient="Pembayaran" body="Tagihan pajak EMS per box dan posisi barang kamu." />
      <FeatureMenu
        label="Layanan tagihan"
        items={[{ label: 'Tagihan EMS & Pajak', to: '/id/ems-tax', icon: FileTextIcon, primary: true }]}
      />

      <section className="flow" aria-label="Posisi barang kamu">
        <div className="flow-head">
          <h2 className="flow-title">Posisi barang kamu</h2>
          <Link className="flow-link" to="/id/ems-tax">
            Tagihan
            <ArrowRightIcon size={14} />
          </Link>
        </div>
        {/* Signed out: stages only. Signed in (later): mark each of the
            customer's batches on its current stage via data-current. */}
        <ol className="flow-row">
          {ORDER_STAGES.map((s, i) => (
            <li key={s.status}>
              <div className="flow-card">
                <span className="flow-icon" aria-hidden="true">
                  <s.icon size={17} />
                </span>
                <span className="flow-step tnum" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="flow-name">{s.name}</span>
                <span className="flow-status">{s.status}</span>
                <span className="flow-text">{s.text}</span>
              </div>
            </li>
          ))}
        </ol>
        {/* Only rules the MVP actually enforces: tax bills are published once
            a box reaches Di Bea Cukai, and late fees are entered by admin. */}
        <p className="flow-note">
          Tagihan pajak terbit setelah box sampai di bea cukai. Denda keterlambatan, jika ada, ditentukan admin dan
          tampil di tagihanmu.
        </p>
      </section>
    </TabShell>
  )
}

// ── Profil tab (FR-GO-PAY-001) ─────────────────────────────────────
export function ProfileTab() {
  return (
    <div className="mx-auto max-w-[416px] px-5 pt-6 pb-32">
      <div className="raised p-6" style={{ boxShadow: 'var(--lift-lg)' }}>
        <h2 className="text-xl font-bold tracking-tight text-ink">Masuk ke profil kamu</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Masuk dulu untuk memantau status pesanan, rincian tagihan, dan riwayat batch kamu.
        </p>
        {/* TODO: wire to Supabase Auth with the LINE (OIDC) provider. */}
        <button
          type="button"
          className="login-line mt-6 flex h-12 w-full items-center gap-3 rounded-full px-4 text-[15px] font-medium transition-colors"
          onClick={() => alert('Login LINE belum tersedia.')}
        >
          <ChatIcon size={20} />
          Lanjut dengan LINE
        </button>
        <div className="mt-6 border-t border-hairline pt-5">
          <ul className="space-y-2.5 text-[13px] text-ink-2">
            <li className="flex items-center gap-2.5">
              <PackageIcon size={15} /> Lacak batch pesanan
            </li>
            <li className="flex items-center gap-2.5">
              <FileTextIcon size={15} /> Cek rincian tagihan
            </li>
          </ul>
          <p className="mt-5 flex items-center gap-2 text-xs font-semibold text-ink-2">
            <ShieldIcon size={14} /> Autentikasi resmi lewat LINE.
          </p>
        </div>
      </div>
    </div>
  )
}

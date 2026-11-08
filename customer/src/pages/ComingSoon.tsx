import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '../components/Icons'

// Temporary target for the Bayar Batch, Kalkulator Harga and Tagihan EMS &
// Pajak tiles until those pages are built, so no tile leads to a 404.
export default function ComingSoon({ title, backTab }: { title: string; backTab: 'order' | 'tagihan' }) {
  return (
    <div className="mx-auto max-w-[624px] px-5 pt-6 pb-24">
      <Link
        to={`/id?tab=${backTab}`}
        aria-label="Kembali"
        className="raised-interactive flex h-10 w-10 items-center justify-center rounded-full text-accent"
      >
        <ArrowRightIcon size={18} className="rotate-180" />
      </Link>
      <div className="raised mt-6 p-8 text-center">
        <h1 className="t-section text-ink">{title}</h1>
        <p className="t-body mt-3 text-ink-2">Halaman ini sedang disiapkan.</p>
      </div>
    </div>
  )
}

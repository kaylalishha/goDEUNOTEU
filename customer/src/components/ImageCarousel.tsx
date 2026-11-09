import { useState } from 'react'
import { ChevronRightIcon } from './Icons'

// Same behaviour as the admin's ImageCarousel (Foto Produk in the batch
// record), but the arrows are always visible because most customers are on
// a phone, where there is no hover.
export function ImageCarousel({ images, onImageClick }: { images: string[]; onImageClick: (src: string) => void }) {
  const [index, setIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 text-center text-xs text-slate-400">
        Foto produk belum ada
      </div>
    )
  }

  const safeIndex = Math.min(index, images.length - 1)
  const current = images[safeIndex]
  const go = (delta: number) => setIndex((i) => (i + delta + images.length) % images.length)
  const arrow = 'absolute top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/50 text-white hover:bg-slate-900/70'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onImageClick(current)}
        className="block w-full overflow-hidden rounded-lg border border-slate-200"
        title="Ketuk untuk memperbesar"
      >
        <img src={current} alt={`Foto produk ${safeIndex + 1} dari ${images.length}`} className="aspect-square w-full object-cover" />
      </button>
      {images.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} className={`${arrow} left-1.5`} aria-label="Foto sebelumnya">
            <ChevronRightIcon size={16} className="rotate-180" />
          </button>
          <button type="button" onClick={() => go(1)} className={`${arrow} right-1.5`} aria-label="Foto selanjutnya">
            <ChevronRightIcon size={16} />
          </button>
          <span className="absolute right-1.5 bottom-1.5 rounded-full bg-slate-900/60 px-2 py-0.5 text-[10px] font-medium text-white">
            {safeIndex + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  )
}

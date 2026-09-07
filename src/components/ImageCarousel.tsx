import { useState } from 'react'

export function ImageCarousel({
  images,
  onImageClick,
}: {
  images: string[]
  onImageClick: (src: string) => void
}) {
  const [index, setIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-4 text-center text-xs text-slate-400">
        foto product
        <span className="mt-1">(yg biasa ada di notes line)</span>
      </div>
    )
  }

  const safeIndex = Math.min(index, images.length - 1)
  const current = images[safeIndex]

  return (
    <div>
      <div className="group relative">
        <button
          type="button"
          onClick={() => onImageClick(current)}
          className="block w-full overflow-hidden rounded-lg border border-slate-200"
          title="Klik untuk memperbesar"
        >
          <img
            src={current}
            alt={`foto produk ${safeIndex + 1} dari ${images.length}`}
            className="aspect-square w-full object-cover"
          />
        </button>
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/50 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Foto sebelumnya"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/50 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Foto selanjutnya"
            >
              ›
            </button>
            <span className="absolute bottom-1.5 right-1.5 rounded-full bg-slate-900/60 px-2 py-0.5 text-[10px] font-medium text-white">
              {safeIndex + 1}/{images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === safeIndex ? 'w-4 bg-rose-500' : 'w-1.5 bg-slate-300'
              }`}
              aria-label={`Lihat foto ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

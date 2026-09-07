function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

export function MultiImageInput({
  label,
  values,
  onChange,
}: {
  label: string
  values: string[]
  onChange: (dataUrls: string[]) => void
}) {
  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const dataUrls = await Promise.all(Array.from(files).map(readAsDataUrl))
    onChange([...values, ...dataUrls])
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        {values.map((url, i) => (
          <div
            key={i}
            className="group relative h-16 w-16 overflow-hidden rounded-md border border-slate-200"
          >
            <img src={url} alt={`foto ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900/70 text-[10px] leading-none text-white opacity-0 transition group-hover:opacity-100"
              aria-label={`Hapus foto ${i + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
        <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 text-center text-xs text-slate-400 hover:border-rose-300 hover:text-rose-500">
          + Foto
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </div>
    </div>
  )
}

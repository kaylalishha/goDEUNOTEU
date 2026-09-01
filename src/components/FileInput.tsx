import { useRef } from 'react'

export function FileInput({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (dataUrl: string | undefined) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(file: File | undefined) {
    if (!file) {
      onChange(undefined)
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-3">
        {value ? (
          <img
            src={value}
            alt="preview"
            className="h-16 w-16 rounded-md border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">
            No photo
          </div>
        )}
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {value && (
            <button
              type="button"
              className="self-start text-xs text-rose-600 hover:underline"
              onClick={() => {
                onChange(undefined)
                if (inputRef.current) inputRef.current.value = ''
              }}
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function AlertDialog({
  tone,
  title,
  message,
  onClose,
}: {
  tone: 'success' | 'error'
  title: string
  message: string
  onClose: () => void
}) {
  const isSuccess = tone === 'success'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full text-xl ${
            isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
          }`}
        >
          {isSuccess ? '✓' : '✕'}
        </div>
        <h3 className="mb-1 text-center text-base font-semibold text-slate-900">{title}</h3>
        <p className="mb-5 text-center text-sm text-slate-500">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className={`w-full rounded-md px-4 py-2 text-sm font-medium text-white ${
            isSuccess ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          OK
        </button>
      </div>
    </div>
  )
}

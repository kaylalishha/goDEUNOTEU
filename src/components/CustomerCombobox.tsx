import { useEffect, useRef, useState } from 'react'
import type { Customer } from '../types'

// A searchable stand-in for a native <select> of customers — with 15+
// customers (and growing), scrolling a plain dropdown to find one by eye
// stops being practical, so this filters by typed text instead.
export function CustomerCombobox({
  customers,
  value,
  onChange,
  disabled,
  disabledIds,
  placeholder = 'Pilih customer…',
  allowClear = false,
  clearLabel = 'Semua Customer',
}: {
  customers: Customer[]
  value: string
  onChange: (customerId: string) => void
  disabled?: boolean
  disabledIds?: Set<string>
  placeholder?: string
  allowClear?: boolean
  clearLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = customers.find((c) => c.id === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = normalizedQuery
    ? customers.filter((c) => c.name.toLowerCase().includes(normalizedQuery))
    : customers

  function selectCustomer(customerId: string) {
    onChange(customerId)
    setOpen(false)
    setQuery('')
  }

  function openDropdown() {
    if (disabled) return
    setOpen(true)
    setQuery('')
    requestAnimationFrame(() => inputRef.current?.select())
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={openDropdown}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-left text-sm focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
          {selected ? selected.name : allowClear ? clearLabel : placeholder}
        </span>
        <span className="text-slate-400">{open ? '︿' : '﹀'}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama customer…"
            className="w-full border-b border-slate-200 px-3 py-2 text-sm focus:outline-none"
          />
          <ul className="max-h-56 overflow-y-auto py-1 text-sm">
            {allowClear && (
              <li>
                <button
                  type="button"
                  onClick={() => selectCustomer('')}
                  className="block w-full px-3 py-1.5 text-left text-slate-500 hover:bg-rose-50"
                >
                  {clearLabel}
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-slate-400">Tidak ada customer yang cocok.</li>
            ) : (
              filtered.map((c) => {
                const isDisabled = disabledIds?.has(c.id) && c.id !== value
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => selectCustomer(c.id)}
                      className={`block w-full px-3 py-1.5 text-left ${
                        c.id === value ? 'bg-rose-50 text-rose-700' : 'text-slate-700 hover:bg-slate-50'
                      } disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white`}
                    >
                      {c.name}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

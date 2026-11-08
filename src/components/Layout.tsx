import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAdminSession } from '../lib/adminSession'
import { Toaster } from './Toaster'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', exact: true },
  { to: '/orders', label: 'A · Order Recap & Payments' },
  { to: '/boxes', label: 'B · Box Management' },
  { to: '/tax-bills', label: 'C · Tax Bills (EMS)' },
  { to: '/estimator-config', label: 'D · Estimator Config' },
]

export function Layout({ children }: { children: ReactNode }) {
  const adminSession = useAdminSession()
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">GO Aikatsu</p>
          <h1 className="text-lg font-bold text-slate-900">Admin Dashboard</h1>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-rose-50 text-rose-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-400">
          Admin GO retains final judgment on all order and payment decisions.
        </div>
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-4">
          <div className="text-sm text-slate-500">Group Order · Aikatsu (Mercari Japan)</div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            {!adminSession && (
              <span
                className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                title="Supabase belum dikonfigurasi — data disimpan di localStorage browser ini saja."
              >
                Mode demo
              </span>
            )}
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              A
            </span>
            {adminSession ? adminSession.email : 'Admin GO'}
            {adminSession && (
              <button
                type="button"
                onClick={adminSession.signOut}
                className="ml-2 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Keluar
              </button>
            )}
          </div>
        </header>
        <main className="flex-1 px-8 py-6">{children}</main>
      </div>
      <Toaster />
    </div>
  )
}

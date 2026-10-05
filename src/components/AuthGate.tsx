import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { AdminSessionContext } from '../lib/adminSession'
import { isCurrentUserAdmin } from '../lib/remote'
import { useStore } from '../store/useStore'
import LoginPage from '../pages/LoginPage'

// Demo mode (no Supabase env vars): renders the app as-is.
// Supabase mode: Login → admin check (row in `admins`) → initial data load
// → app. Admin accounts are email/password; see docs/SUPABASE_SETUP.md.
export function AuthGate({ children }: { children: ReactNode }) {
  if (!supabase) return <>{children}</>
  return <RemoteAuthGate>{children}</RemoteAuthGate>
}

// Result of looking the user up in `admins`, tagged with whose result
// it is — a different (or no) userId means the check is still pending.
type AdminCheck =
  | { userId: string; result: 'admin' | 'not-admin' }
  | { userId: string; result: 'error'; message: string }

function RemoteAuthGate({ children }: { children: ReactNode }) {
  const client = supabase!
  // undefined = still reading the stored session on first render
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [adminCheck, setAdminCheck] = useState<AdminCheck | null>(null)
  const syncStatus = useStore((s) => s.syncStatus)
  const syncError = useStore((s) => s.syncError)
  const loadRemote = useStore((s) => s.loadRemote)
  const clearRemote = useStore((s) => s.clearRemote)

  useEffect(() => {
    client.auth.getSession().then(({ data }) => setSession(data.session))
    // Don't call other Supabase methods inside this callback (supabase-js
    // can deadlock) — just record the session; the effect below reacts.
    const { data } = client.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [client])

  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    isCurrentUserAdmin(userId)
      .then((isAdmin) => {
        if (cancelled) return
        setAdminCheck({ userId, result: isAdmin ? 'admin' : 'not-admin' })
        if (isAdmin) loadRemote()
      })
      .catch((err: Error) => {
        if (!cancelled) setAdminCheck({ userId, result: 'error', message: err.message })
      })
    return () => {
      cancelled = true
    }
  }, [userId, loadRemote])

  async function signOut() {
    await client.auth.signOut()
    clearRemote()
  }

  if (session === undefined) return <FullScreenMessage message="Memuat sesi…" />
  if (!session) return <LoginPage />

  if (adminCheck?.userId !== session.user.id) return <FullScreenMessage message="Memeriksa akun…" />
  if (adminCheck.result === 'error') {
    return (
      <FullScreenMessage
        message={`Gagal memeriksa akun: ${adminCheck.message}`}
        action={{ label: 'Keluar', onClick: signOut }}
      />
    )
  }
  if (adminCheck.result === 'not-admin') {
    return (
      <FullScreenMessage
        message={`Akun ${session.user.email} bukan akun Admin GO. Minta admin lain menambahkan akun ini ke tabel "admins".`}
        action={{ label: 'Keluar', onClick: signOut }}
      />
    )
  }

  if (syncStatus === 'error') {
    return (
      <FullScreenMessage
        message={`Gagal memuat data dari Supabase: ${syncError}`}
        action={{ label: 'Coba lagi', onClick: loadRemote }}
      />
    )
  }
  if (syncStatus !== 'ready') return <FullScreenMessage message="Memuat data…" />

  return (
    <AdminSessionContext.Provider value={{ email: session.user.email ?? '', signOut }}>
      {children}
    </AdminSessionContext.Provider>
  )
}

function FullScreenMessage({
  message,
  action,
}: {
  message: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">GO Aikatsu</p>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

import { createContext, useContext } from 'react'

export interface AdminSession {
  email: string
  signOut: () => Promise<void>
}

// Provided by AuthGate once an admin is signed in (Supabase mode only).
export const AdminSessionContext = createContext<AdminSession | null>(null)

// The signed-in admin, or null in demo (localStorage) mode.
export function useAdminSession(): AdminSession | null {
  return useContext(AdminSessionContext)
}

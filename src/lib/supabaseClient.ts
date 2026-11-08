import { createClient } from '@supabase/supabase-js'

// Configured from .env (see .env.example and docs/SUPABASE_SETUP.md).
// When both values are present the app runs against Supabase — sign-in
// required, all data via src/lib/remote.ts. When either is missing it
// falls back to the original demo mode (seed data in localStorage).

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

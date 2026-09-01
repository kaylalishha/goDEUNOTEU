import { createClient } from '@supabase/supabase-js'

// Not wired into the app yet — see supabase/migrations/0001_init.sql for
// the schema this targets, and README.md for how to connect a real
// project. The dashboard currently runs entirely on the zustand store in
// src/store/useStore.ts (localStorage), independent of this client.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

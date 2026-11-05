import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
// null = no keys configured → app falls back to mock data/auth.
export const sb = url && key ? createClient(url, key) : null
export const isMock = !sb

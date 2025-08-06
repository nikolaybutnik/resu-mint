import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types/database'

// TODO: temporary measure to pass Vercel build. Update with prod keys
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key'

export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabasePublishableKey
)

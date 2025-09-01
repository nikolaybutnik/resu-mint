import { NextRequest, NextResponse } from 'next/server'
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const originUrl = new URL(`${process.env.ELECTRIC_HTTP_BASE}/v1/shape`)

  // Forward Electric params from client
  // [ 'live', 'handle', 'offset', 'cursor' ]
  url.searchParams.forEach((value, key) => {
    if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
      originUrl.searchParams.set(key, value)
    }
  })

  // Forward data parameters that Electric needs
  if (url.searchParams.has('table')) {
    originUrl.searchParams.set('table', url.searchParams.get('table')!)
  }

  if (url.searchParams.has('columns')) {
    const clientColumns = url.searchParams.get('columns')

    let electricColumns = clientColumns || ''
    if (!clientColumns?.includes('id')) {
      electricColumns = `id,${clientColumns}`
    }

    originUrl.searchParams.set('columns', electricColumns)
  }

  if (url.searchParams.has('offset')) {
    originUrl.searchParams.set('offset', url.searchParams.get('offset')!)
  } else {
    originUrl.searchParams.set('offset', '-1')
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  let userId: string | null = null

  if (token) {
    const { data, error } = await supabase.auth.getUser(token)
    if (!error && data.user) {
      userId = data.user.id
    }
  }

  if (userId) {
    originUrl.searchParams.set('where', `user_id = '${userId}'`)
  } else {
    originUrl.searchParams.set('where', '1=0') // Empty shape if unauthenticated
  }

  originUrl.searchParams.set('secret', process.env.ELECTRIC_SECRET!)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers['x-vercel-protection-bypass'] =
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  }

  const response = await fetch(originUrl.toString(), {
    method: 'GET',
    headers,
    cache: 'no-store',
    credentials: 'omit',
  })

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })
}

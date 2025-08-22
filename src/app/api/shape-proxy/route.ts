import { NextRequest, NextResponse } from 'next/server'
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Testing
// With auth: curl http://localhost:3000/api/shape-proxy
// Straight to electric: curl "http://localhost:3001/v1/shape?table=personal_details&offset=-1"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const originUrl = new URL('http://localhost:3001/v1/shape')

  // Forward Electric params from client
  // [ 'live', 'handle', 'offset', 'cursor' ]
  url.searchParams.forEach((value, key) => {
    if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
      originUrl.searchParams.set(key, value)
    }
  })

  // Set table explicitly (temporary for testing)
  originUrl.searchParams.set('table', 'personal_details')

  // offset is required
  if (!originUrl.searchParams.has('offset')) {
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

  // Add user_id filter or return empty shape
  if (userId) {
    originUrl.searchParams.set('where', `user_id = '${userId}'`)
  } else {
    originUrl.searchParams.set('where', '1=0') // Empty shape for unauthenticated
  }

  const response = await fetch(originUrl.toString())

  if (!response.ok) {
    const errorText = await response.text()

    return new NextResponse(JSON.stringify({ error: errorText }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await response.clone().text()

  return new NextResponse(body, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  })
}

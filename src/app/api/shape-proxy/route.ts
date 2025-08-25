import { NextRequest, NextResponse } from 'next/server'
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Testing
// With auth: curl http://localhost:3000/api/shape-proxy
// Straight to electric: curl "http://localhost:3001/v1/shape?table=personal_details&offset=-1"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const originUrl = new URL(`${process.env.NEXT_PUBLIC_ELECTRIC_URL}/v1/shape`)

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

  // Don't handle errors here, handle within stream on client side
  const response = await fetch(originUrl.toString())

  const newHeaders = new Headers(response.headers)
  newHeaders.set('Content-Type', 'application/json')

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}

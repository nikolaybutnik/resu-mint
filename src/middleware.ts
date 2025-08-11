import { ROUTES } from '@/lib/constants'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && request.nextUrl.pathname === ROUTES.LOGIN) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.HOME
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname === ROUTES.RESET_PASSWORD) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTES.HOME
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

// TODO: block the admin panel behind a user role
export const config = {
  matcher: ['/login', '/reset-password'],
}

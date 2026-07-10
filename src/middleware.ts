import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedPaths = [
    '/home', '/finance', '/members', '/community',
    '/events', '/admin', '/camp', '/notices', '/profile', '/settlement'
  ]
  const isProtected = protectedPaths.some(p =>
    request.nextUrl.pathname.startsWith(p)
  )

  if (!user && isProtected) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (
      profile?.role === 'withdrawn' &&
      !request.nextUrl.pathname.startsWith('/withdrawn') &&
      !request.nextUrl.pathname.startsWith('/login')
    ) {
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/withdrawn', request.url))
    }

    if (
      profile?.role === 'pending' &&
      !request.nextUrl.pathname.startsWith('/pending') &&
      !request.nextUrl.pathname.startsWith('/login') &&
      !request.nextUrl.pathname.startsWith('/register')
    ) {
      // pending이어도 redirect 파라미터 유지
      const pendingUrl = new URL('/pending', request.url)
      const redirect = request.nextUrl.searchParams.get('redirect')
      if (redirect) pendingUrl.searchParams.set('redirect', redirect)
      return NextResponse.redirect(pendingUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
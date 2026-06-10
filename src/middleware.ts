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

  // 세션 갱신 (중요!)
  const { data: { user } } = await supabase.auth.getUser()

  // 보호된 경로 접근 시 로그인 리다이렉트
  const protectedPaths = ['/home', '/finance', '/members', '/community', '/events', '/admin']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // pending 상태면 승인 대기 페이지로
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (
      profile?.role === 'pending' &&
      !request.nextUrl.pathname.startsWith('/pending') &&
      !request.nextUrl.pathname.startsWith('/login')
    ) {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
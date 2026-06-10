import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 로그인 안 된 상태에서 보호된 페이지 접근 시 로그인으로 리다이렉트
  if (!user && request.nextUrl.pathname.startsWith('/home')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // pending 상태면 승인 대기 페이지로
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'pending' &&
        !request.nextUrl.pathname.startsWith('/pending') &&
        !request.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/pending', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/home/:path*', '/finance/:path*', '/members/:path*', '/community/:path*', '/events/:path*', '/admin/:path*'],
}
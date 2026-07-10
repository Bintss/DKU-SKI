import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') ?? '/home'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('generation, join_type')
        .eq('id', user.id)
        .single()

      if (!profile || profile.generation === 0) {
        // 신규 가입 — redirect 파라미터 유지해서 가입 완료 후 돌아올 수 있게
        const registerUrl = new URL('/register/kakao', origin)
        if (redirect !== '/home') {
          registerUrl.searchParams.set('redirect', redirect)
        }
        return NextResponse.redirect(registerUrl.toString())
      }
    }
  }

  // 로그인 완료 → redirect 파라미터 있으면 해당 URL로
  return NextResponse.redirect(`${origin}${redirect}`)
}
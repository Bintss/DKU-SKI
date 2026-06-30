import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 본인 계정만 비활성화 가능
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'withdrawn' })
      .eq('id', user.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabase.auth.signOut()

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('withdraw error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
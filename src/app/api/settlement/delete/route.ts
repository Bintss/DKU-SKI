import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { settlementIds, deleteAll } = await req.json()

    // 1. 인증 확인
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

    // 2. 운영진만 가능
    const { data: requester } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    if (requester?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. 전체 삭제 또는 선택 삭제
    if (deleteAll) {
      const { error } = await adminClient
        .from('settlements')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // 전체 매칭용 더미 조건

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      return NextResponse.json({ ok: true, deletedCount: 'all' })
    }

    if (!Array.isArray(settlementIds) || settlementIds.length === 0) {
      return NextResponse.json({ error: 'No settlement IDs provided' }, { status: 400 })
    }

    const { error, count } = await adminClient
      .from('settlements')
      .delete({ count: 'exact' })
      .in('id', settlementIds)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, deletedCount: count ?? settlementIds.length })
  } catch (error) {
    console.error('settlement delete error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
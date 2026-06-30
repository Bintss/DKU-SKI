import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendToUsers } from '@/lib/push-server'

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

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 새로 가입 신청한 본인의 이름 조회
    const { data: applicant } = await adminClient
      .from('profiles')
      .select('name, generation')
      .eq('id', user.id)
      .single()

    // 운영진 전체 조회
    const { data: admins } = await adminClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    const adminIds = (admins ?? []).map(a => a.id)

    if (adminIds.length > 0) {
      sendToUsers(
        adminClient,
        adminIds,
        '새 가입 신청',
        `${applicant?.name ?? '신규 회원'}님(${applicant?.generation ?? '?'}기)이 가입을 신청했어요`,
        '/admin/members'
      ).catch(err => console.error('push send error:', err))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('notify-new-member error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendToUsers } from '@/lib/push-server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      title,
      description,
      totalAmount,
      dueDate,
      splitEqual,
      targets,
      eventId,        // 행사 연동 시 (optional)
      transferLabel,  // 송금명 구분 코드 (optional, 예: '합숙비', '티셔츠')
    } = body
    // targets: { userId: string, amount: number, name: string }[]
    // name은 송금명 자동완성용 (선택)

    if (!title || !totalAmount || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

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

    const { data: requester } = await supabase
      .from('profiles').select('role, name').eq('id', user.id).single()

    if (requester?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }

    const sumOfTargets = targets.reduce((s: number, t: { amount: number }) => s + t.amount, 0)
    if (sumOfTargets !== totalAmount) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: settlement, error: settlementError } = await adminClient
      .from('settlements')
      .insert({
        title,
        description: description || null,
        total_amount: totalAmount,
        amount_per_person: splitEqual ? Math.ceil(totalAmount / targets.length) : 0,
        due_date: dueDate || null,
        created_by: user.id,
        event_id: eventId || null,
        transfer_label: transferLabel || null,
      })
      .select()
      .single()

    if (settlementError || !settlement) {
      return NextResponse.json({ error: settlementError?.message ?? 'Create failed' }, { status: 500 })
    }

    // 송금명 자동완성: {이름}{transferLabel} (토스 기준 한글 7자 이내)
    const items = targets.map((t: { userId: string; amount: number; name?: string }) => {
      let transferName: string | null = null
      if (transferLabel && t.name) {
        const combined = `${t.name}${transferLabel}`
        // 한글 7자 이내로 truncate
        transferName = combined.length > 7 ? combined.slice(0, 7) : combined
      }
      return {
        settlement_id: settlement.id,
        user_id: t.userId,
        amount: t.amount,
        is_paid: false,
        status: 'unpaid',
        transfer_name: transferName,
      }
    })

    const { error: itemsError } = await adminClient
      .from('settlement_items')
      .insert(items)

    if (itemsError) {
      await adminClient.from('settlements').delete().eq('id', settlement.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    sendToUsers(
      adminClient,
      targets.map((t: { userId: string }) => t.userId),
      '새 정산 요청',
      `${requester?.name ?? '운영진'}님이 "${title}" 정산을 요청했어요`,
      `/settlement/${settlement.id}`
    ).catch(err => console.error('push send error:', err))

    return NextResponse.json({ ok: true, settlementId: settlement.id })
  } catch (error) {
    console.error('settlement create error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
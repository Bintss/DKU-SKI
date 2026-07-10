import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendToUsers } from '@/lib/push-server'

type Target = {
  userId: string
  amount: number
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      title,
      description,
      totalAmount,
      transferLabel,
      dueDate,
      splitEqual,
      targets,
      eventId,           // 행사 연동 시
      autoConfirmEventParticipants, // 행사 참가비 즉시 정산 시
    }: {
      title: string
      description: string | null
      totalAmount: number
      transferLabel: string
      dueDate: string | null
      splitEqual: boolean
      targets: Target[]
      eventId?: string
      autoConfirmEventParticipants?: boolean
    } = body

    if (!title || !totalAmount || !targets?.length) {
  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: requesterProfile } = await adminClient
      .from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = requesterProfile?.role === 'admin'
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const amountPerPerson = splitEqual
      ? Math.floor(totalAmount / targets.length)
      : 0

    // settlements 생성
    const { data: settlement, error: settlementError } = await adminClient
      .from('settlements')
      .insert({
        title,
        description,
        total_amount: totalAmount,
        amount_per_person: amountPerPerson,
        transfer_label: transferLabel,
        due_date: dueDate,
        event_id: eventId ?? null,
        created_by: user.id,
      })
      .select()
      .single()

    if (settlementError || !settlement) {
      return NextResponse.json({ error: settlementError?.message ?? 'Failed to create settlement' }, { status: 500 })
    }

    // 부원별 profiles 조회 (이름 필요)
    const userIds = targets.map(t => t.userId)
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, name')
      .in('id', userIds)

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p.name]))

    // settlement_items 생성
    const items = targets.map((target, index) => {
      const amount = splitEqual
        ? (index < (totalAmount % targets.length) ? amountPerPerson + 1 : amountPerPerson)
        : target.amount

      const name = profileMap[target.userId] ?? ''
      const combined = name + (transferLabel ?? '')
      const transferName = combined.length > 0 ? combined.slice(0, 7) : null

      return {
        settlement_id: settlement.id,
        user_id: target.userId,
        amount,
        status: 'unpaid',
        is_paid: false,
        transfer_name: transferName || null,
      }
    })

    const { error: itemsError } = await adminClient
      .from('settlement_items')
      .insert(items)

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // 행사 참가자 status를 pending_payment로 업데이트
    if (eventId && autoConfirmEventParticipants) {
      await adminClient
        .from('event_participants')
        .update({ status: 'pending_payment' })
        .eq('event_id', eventId)
        .in('user_id', userIds)
    }

    // 부원들에게 납부 안내 알림
    sendToUsers(
      adminClient,
      userIds,
      '정산 요청',
      `"${title}" ${amountPerPerson.toLocaleString()}원 납부 요청이 왔어요`,
      `/settlement/${settlement.id}`
    ).catch(err => console.error('push send error:', err))

    return NextResponse.json({ ok: true, settlementId: settlement.id })
  } catch (error) {
    console.error('settlement create error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

type PushSubscriptionRow = {
  id: string
  user_id: string
  endpoint: string
  p256dh: string
  auth: string
}

async function sendToUsers(
  adminClient: any,
  userIds: string[],
  title: string,
  body: string,
  url: string
) {
  if (!userIds.length) return

  const { data: subscriptions } = await adminClient
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds) as { data: PushSubscriptionRow[] | null }

  if (!subscriptions?.length) return

  const payload = JSON.stringify({ title, body, url })
  const failed: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode
        if (statusCode === 410) failed.push(sub.id)
      }
    })
  )

  if (failed.length > 0) {
    await adminClient.from('push_subscriptions').delete().in('id', failed)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, totalAmount, dueDate, splitEqual, targets } = body
    // targets: { userId: string, amount: number }[]

    if (!title || !totalAmount || !Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

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

    // 2. 정산 요청은 운영진만 가능
    const { data: requester } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()

    if (requester?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }

    // 3. 금액 합계 검증 (개별 금액 모드일 때 위변조 방지)
    const sumOfTargets = targets.reduce((s: number, t: { amount: number }) => s + t.amount, 0)
    if (sumOfTargets !== totalAmount) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // 4. 트랜잭션처럼 처리 — settlements insert 후 items insert 실패 시 rollback
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
      })
      .select()
      .single()

    if (settlementError || !settlement) {
      return NextResponse.json({ error: settlementError?.message ?? 'Create failed' }, { status: 500 })
    }

    const items = targets.map((t: { userId: string; amount: number }) => ({
      settlement_id: settlement.id,
      user_id: t.userId,
      amount: t.amount,
      is_paid: false,
      status: 'unpaid',
    }))

    const { error: itemsError } = await adminClient
      .from('settlement_items')
      .insert(items)

    if (itemsError) {
      // rollback: 생성된 settlement 삭제
      await adminClient.from('settlements').delete().eq('id', settlement.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }

    // 5. 알림 발송 — items가 확실히 생성된 후 실행 (race condition 없음)
    const { data: creator } = await adminClient
      .from('profiles').select('name').eq('id', user.id).single()

    sendToUsers(
      adminClient,
      targets.map((t: { userId: string }) => t.userId),
      '새 정산 요청',
      `${creator?.name ?? '운영진'}님이 "${title}" 정산을 요청했어요`,
      `/settlement/${settlement.id}`
    ).catch(err => console.error('push send error:', err))

    return NextResponse.json({ ok: true, settlementId: settlement.id })
  } catch (error) {
    console.error('settlement create error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
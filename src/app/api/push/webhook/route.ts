import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendToUsers(userIds: string[], title: string, body: string, url: string) {
  if (!userIds.length) return

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)

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
    await supabase.from('push_subscriptions').delete().in('id', failed)
  }
}

export async function POST(req: NextRequest) {
  // Webhook 인증
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await req.json()
    const { type, table, record, old_record } = payload

    // 정산 생성 — settlements INSERT
    if (table === 'settlements' && type === 'INSERT') {
      const settlementId = record.id
      const createdBy = record.created_by
      const title = record.title

      // 요청자 프로필 조회
      const { data: creator } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', createdBy)
        .single()

      // 정산 대상자 조회 (요청자 제외)
      const { data: items } = await supabase
        .from('settlement_items')
        .select('user_id')
        .eq('settlement_id', settlementId)
        .neq('user_id', createdBy)

      const targetIds = items?.map(i => i.user_id) ?? []

      await sendToUsers(
        targetIds,
        '새 정산 요청',
        `${creator?.name ?? '누군가'}님이 "${title}" 정산을 요청했어요`,
        `/settlement/${settlementId}`
      )
    }

    // 정산 상태 변경 — settlement_items UPDATE
    if (table === 'settlement_items' && type === 'UPDATE') {
      const newStatus = record.status
      const oldStatus = old_record?.status
      const settlementId = record.settlement_id
      const userId = record.user_id

      // 정산 정보 조회
      const { data: settlement } = await supabase
        .from('settlements')
        .select('title, created_by')
        .eq('id', settlementId)
        .single()

      if (!settlement) return NextResponse.json({ ok: true })

      // unpaid → pending: 요청자에게 알림
      if (oldStatus === 'unpaid' && newStatus === 'pending') {
        const { data: sender } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', userId)
          .single()

        await sendToUsers(
          [settlement.created_by],
          '송금 확인 요청',
          `${sender?.name ?? '누군가'}님이 "${settlement.title}" 정산 송금을 완료했어요. 확인해주세요!`,
          `/settlement/${settlementId}`
        )
      }

      // pending → paid: 해당 부원에게 알림
      if (oldStatus === 'pending' && newStatus === 'paid') {
        await sendToUsers(
          [userId],
          '정산 납부 확인 완료',
          `"${settlement.title}" 정산 ${record.amount.toLocaleString()}원 납부가 확인됐어요!`,
          `/settlement/${settlementId}`
        )
      }

      // unpaid → paid (바로 확인): 해당 부원에게 알림
      if (oldStatus === 'unpaid' && newStatus === 'paid') {
        await sendToUsers(
          [userId],
          '정산 납부 확인 완료',
          `"${settlement.title}" 정산 ${record.amount.toLocaleString()}원 납부가 확인됐어요!`,
          `/settlement/${settlementId}`
        )
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
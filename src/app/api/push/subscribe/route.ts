import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

// Supabase 서비스 롤 키 필요 — .env.local에 추가 필요
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    // 내부 호출만 허용
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.INTERNAL_API_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userIds, title, body, url } = await req.json()

    // 대상 유저들의 구독 정보 조회
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)

    if (!subscriptions?.length) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const payload = JSON.stringify({ title, body, url })
    let sent = 0
    const failed: string[] = []

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          )
          sent++
        } catch (err: any) {
          // 만료된 구독 삭제
          if (err.statusCode === 410) {
            failed.push(sub.id)
          }
        }
      })
    )

    // 만료된 구독 정리
    if (failed.length > 0) {
      await supabase.from('push_subscriptions').delete().in('id', failed)
    }

    return NextResponse.json({ ok: true, sent })
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
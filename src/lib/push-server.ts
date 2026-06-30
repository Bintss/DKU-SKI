import webpush from 'web-push'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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

/**
 * 지정된 사용자들에게 푸시 알림을 발송한다.
 * 정산 생성/상태변경 등 서버 API에서 공통으로 사용.
 * 만료된(410) 구독은 자동으로 정리한다.
 */
export async function sendToUsers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
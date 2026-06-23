// 푸시 구독 등록
export async function subscribePush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const registration = await navigator.serviceWorker.ready
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!

    // Base64 → Uint8Array 변환
    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
      const rawData = atob(base64)
      return new Uint8Array([...rawData].map(char => char.charCodeAt(0)))
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    const { endpoint, keys } = subscription.toJSON() as {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }),
    })

    return true
  } catch (error) {
    console.error('Push subscription failed:', error)
    return false
  }
}

// 푸시 알림 발송 (서버 내부용)
export async function sendPushNotification({
  userIds,
  title,
  body,
  url,
}: {
  userIds: string[]
  title: string
  body: string
  url?: string
}) {
  if (!userIds.length) return

  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/push/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.INTERNAL_API_SECRET}`,
      },
      body: JSON.stringify({ userIds, title, body, url }),
    })
  } catch (error) {
    console.error('Push send failed:', error)
  }
}
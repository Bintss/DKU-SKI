self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim())
})

// 푸시 수신 — 무조건 showNotification을 호출해서 iOS의 구독 취소를 방지
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let title = '단국대 스키부'
      let body = '새로운 알림이 있어요'
      let url = '/'
      let icon = '/icon-192x192.png'

      try {
        if (event.data) {
          const data = event.data.json()
          title = data.title ?? title
          body = data.body ?? body
          url = data.url ?? url
          icon = data.icon ?? icon
        }
      } catch (err) {
        // 파싱 실패해도 기본값으로 알림은 반드시 표시
      }

      await self.registration.showNotification(title, {
        body,
        icon,
        badge: '/icon-192x192.png',
        data: { url },
        vibrate: [100, 50, 100],
      })
    })()
  )
})

// 알림 클릭 시 해당 페이지로 이동
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
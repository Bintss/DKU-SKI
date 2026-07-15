import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: '단국대학교 스키부',
  description: '단국대학교 스키부 40주년 공식 앱',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'DKU 스키부',
  },
}

export const viewport: Viewport = {
  themeColor: '#003C75',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ background: '#E8EBF5', minHeight: '100vh', position: 'relative' }}>
  <div style={{
    position: 'fixed',
    inset: 0,
    backgroundImage: 'url(/back_image.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: 0.3,
    zIndex: 0,
    pointerEvents: 'none',
  }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <ServiceWorkerRegister />
          {children}
        </div>
      </body>
    </html>
  )
}

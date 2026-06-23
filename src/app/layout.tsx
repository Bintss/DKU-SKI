'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import { ProfileProvider } from '@/contexts/ProfileContext'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <ProfileProvider>
      <div className="min-h-screen relative" style={{ background: 'var(--bg-primary)' }}>
        {/* 배경 워터마크 — 스키부 로고, mix-blend-mode로 흰 배경 제거 */}
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/icon-192x192.png)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center 15%',
            backgroundSize: '280px 280px',
            opacity: 0.05,
            mixBlendMode: 'screen',
            zIndex: 0,
          }}
        />
        <div className="relative" style={{ zIndex: 1 }}>
          <Header />
          <div
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.25s ease, transform 0.25s ease',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </ProfileProvider>
  )
}
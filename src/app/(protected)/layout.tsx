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
  const [showSplash, setShowSplash] = useState(false)
  const [splashChecked, setSplashChecked] = useState(false)

  // 세션당 한 번만 스플래시 표시 (로그인 후 첫 진입)
  useEffect(() => {
  const alreadyShown = sessionStorage.getItem('splash_shown')
  if (!alreadyShown) {
    setShowSplash(true)
    sessionStorage.setItem('splash_shown', 'true')
    const timer = setTimeout(() => setShowSplash(false), 1200) // 500 → 1200으로 변경
    return () => clearTimeout(timer)
  } else {
    setSplashChecked(true)
  }
}, [])

  useEffect(() => {
    setVisible(false)
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <ProfileProvider>
      {/* 스플래시 화면 — 세션당 최초 1회 */}
{showSplash && (
  <div
    className="fixed inset-0 z-[9999] flex items-center justify-center"
    style={{
      backgroundImage: 'url(/splash-logo.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      animation: 'splashFadeOut 1.2s ease-in-out forwards',
    }}
  >
    <style>{`
      @keyframes splashFadeOut {
        0% { opacity: 0; transform: scale(1.04); }
        15% { opacity: 1; transform: scale(1); }
        75% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.02); }
      }
    `}</style>
  </div>
)}

      <div className="min-h-screen relative" style={{ background: 'var(--bg-primary)' }}>
        {/* 배경 이미지 — 슬로프 일러스트, 어둡게 깔림 */}
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(/bg-slope.jpg)',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center top',
            backgroundSize: 'cover',
            opacity: 0.1,
            zIndex: 0,
          }}
        />
        {/* 어둡게 덮는 오버레이 — 콘텐츠 가독성 확보 */}
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(10,10,15,0.4) 0%, rgba(10,10,15,0.85) 40%, rgba(10,10,15,0.97) 100%)',
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
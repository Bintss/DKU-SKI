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

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('splash_shown')
    if (!alreadyShown) {
      setShowSplash(true)
      sessionStorage.setItem('splash_shown', 'true')
      const timer = setTimeout(() => setShowSplash(false), 1800)
      return () => clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    setVisible(false)
    const timer = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <ProfileProvider>
      {/* 스플래시 */}
      {showSplash && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: '#fff',
            animation: 'splashFadeOut 1.8s ease-in-out forwards',
          }}
        >
          <style>{`
            @keyframes splashFadeOut {
              0%   { opacity: 0; transform: scale(1.04); }
              15%  { opacity: 1; transform: scale(1); }
              75%  { opacity: 1; transform: scale(1); }
              100% { opacity: 0; transform: scale(1.02); }
            }
          `}</style>
          <img
            src="/back_image.png"
            alt="DKU SKI"
            style={{ width: '65%', maxWidth: 360, objectFit: 'contain' }}
          />
        </div>
      )}

      {/* 배경 이미지 워터마크 */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'url(/back_image.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: 0.06,
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      <div className="min-h-screen" style={{ background: 'transparent', position: 'relative', zIndex: 1 }}>
        <Header />
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          {children}
        </div>
      </div>
    </ProfileProvider>
  )
}
'use client'

import { createClient } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginContent() {
  const searchParams = useSearchParams()

  const handleKakaoLogin = async () => {
    const supabase = createClient()
    const redirect = searchParams.get('redirect') ?? '/home'
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`
      }
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: 'var(--surface)' }}>
      <div className="flex flex-col items-center mb-12">
        <div className="mb-5">
          <img
            src="/icon-192x192.png"
            alt="단국대 스키부"
            className="w-20 h-20 rounded-2xl"
            style={{ boxShadow: 'var(--shadow-blue)' }}
          />
        </div>
        <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
          단국대학교 스키부
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          40주년 기념 공식 앱
        </p>
      </div>

      <div className="w-full max-w-sm">
        <button
          onClick={handleKakaoLogin}
          className="w-full rounded-2xl py-4 text-sm font-black btn-press flex items-center justify-center gap-2"
          style={{ background: '#FEE500', color: '#3A1D1D' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#3A1D1D">
            <path d="M12 3C7.03 3 3 6.14 3 10c0 2.49 1.52 4.68 3.84 6.03l-.98 3.64a.25.25 0 0 0 .37.28L10.5 17.8A10.6 10.6 0 0 0 12 17c4.97 0 9-3.14 9-7S16.97 3 12 3z" />
          </svg>
          카카오로 로그인
        </button>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-hint)' }}>
          카카오 계정으로 로그인하면 자동으로 가입돼요
        </p>
      </div>

      <div className="mt-16 text-center">
        <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
          단국대학교 스키부 · 창립 40주년
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
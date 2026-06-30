'use client'

import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const handleKakaoLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* 로고 */}
      <div className="flex flex-col items-center mb-10">
        <img
          src="/icon-192x192.png"
          alt="단국대 스키부"
          className="w-20 h-20 rounded-2xl mb-4"
          style={{ boxShadow: '0 8px 32px rgba(27,63,171,0.4)' }}
        />
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
          단국대학교 스키부
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>40주년 기념</p>
      </div>

      <div className="w-full max-w-sm">
        <button
          onClick={handleKakaoLogin}
          className="w-full rounded-2xl py-3.5 text-sm font-black btn-press"
          style={{ background: '#FEE500', color: '#3A1D1D' }}
        >
          카카오로 로그인
        </button>

        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-hint)' }}>
          카카오 계정으로 로그인하면 자동으로 가입돼요
        </p>
      </div>
    </main>
  )
}
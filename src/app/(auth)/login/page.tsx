'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
      return
    }

    router.push('/home')
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
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-2xl px-4 py-3.5 text-sm"
            style={{
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-2xl px-4 py-3.5 text-sm"
            style={{
              background: 'var(--bg-secondary)',
              border: '0.5px solid var(--border-primary)',
              color: 'var(--text-primary)',
            }}
            required
          />
          {error && <p className="text-xs px-1" style={{ color: 'var(--accent-red)' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl py-3.5 text-sm font-black disabled:opacity-50 btn-press mt-1"
            style={{ background: 'var(--ski-blue)', color: '#fff' }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
          <span className="text-xs" style={{ color: 'var(--text-hint)' }}>또는</span>
          <div className="flex-1 h-px" style={{ background: 'var(--border-primary)' }} />
        </div>

        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signInWithOAuth({
              provider: 'kakao',
              options: { redirectTo: `${window.location.origin}/auth/callback` }
            })
          }}
          className="w-full rounded-2xl py-3.5 text-sm font-black btn-press"
          style={{ background: '#FEE500', color: '#3A1D1D' }}
        >
          카카오로 로그인
        </button>

        <div className="flex items-center justify-between mt-6">
          <a href="/forgot-password"
            className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            비밀번호 찾기
          </a>
          <a href="/register"
            className="text-xs font-semibold" style={{ color: 'var(--accent-blue)' }}>
            회원가입 →
          </a>
        </div>
      </div>
    </main>
  )
}
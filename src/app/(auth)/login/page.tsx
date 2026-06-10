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
      style={{ background: 'var(--gray-50)' }}
    >
      {/* 로고 */}
      <div className="flex flex-col items-center mb-10">
        <img
          src="/icon-192x192.png"
          alt="단국대 스키부"
          className="w-20 h-20 rounded-2xl shadow-md mb-4"
        />
        <h1 className="text-xl font-bold text-gray-900">단국대학교 스키부</h1>
        <p className="text-sm text-gray-400 mt-1">40주년 기념</p>
      </div>

      {/* 폼 */}
      <div className="w-full max-w-sm">
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 transition-colors"
            style={{ borderColor: 'var(--gray-200)' }}
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 transition-colors"
            style={{ borderColor: 'var(--gray-200)' }}
            required
          />
          {error && (
            <p className="text-red-500 text-xs px-1">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50 transition-opacity mt-1"
            style={{ background: 'var(--ski-blue)' }}
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: 'var(--gray-200)' }} />
          <span className="text-xs text-gray-400">또는</span>
          <div className="flex-1 h-px" style={{ background: 'var(--gray-200)' }} />
        </div>

        <button
  onClick={async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }}
  className="w-full bg-yellow-400 text-yellow-900 rounded-2xl py-3.5 text-sm font-medium hover:bg-yellow-500 transition-colors"
>
  카카오로 로그인
</button>
        <p className="text-xs text-center text-gray-400 mt-6">
  <a href="/forgot-password" className="hover:underline" style={{ color: 'var(--ski-blue)' }}>
    비밀번호를 잊으셨나요?
  </a>
</p>
        <p className="text-xs text-center text-gray-400 mt-6">
          계정이 없으신가요?{' '}
          <a href="/register" style={{ color: 'var(--ski-blue)' }} className="font-medium hover:underline">
            회원가입
          </a>
        </p>
      </div>
    </main>
  )
}
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
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-semibold text-center mb-2">단국대학교 스키부</h1>
        <p className="text-sm text-gray-400 text-center mb-8">로그인</p>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white rounded-lg py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-200"/>
          <span className="text-xs text-gray-400">또는</span>
          <div className="flex-1 h-px bg-gray-200"/>
        </div>

        <button
          onClick={() => supabase.auth.signInWithOAuth({
            provider: 'kakao',
            options: { redirectTo: `${window.location.origin}/auth/callback` }
          })}
          className="w-full bg-yellow-400 text-yellow-900 rounded-lg py-3 text-sm font-medium hover:bg-yellow-500"
        >
          카카오로 로그인
        </button>

        <p className="text-xs text-center text-gray-400 mt-6">
          계정이 없으신가요?{' '}
          <a href="/register" className="text-blue-500 hover:underline">회원가입</a>
        </p>
      </div>
    </main>
  )
}
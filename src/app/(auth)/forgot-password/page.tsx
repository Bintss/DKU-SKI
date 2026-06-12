'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError('이메일 전송에 실패했어요. 다시 시도해주세요.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex flex-col items-center mb-8">
        <img
          src="/icon-192x192.png"
          alt="단국대 스키부"
          className="w-16 h-16 rounded-2xl shadow-md mb-3"
        />
        <h1 className="text-xl font-bold text-gray-900">비밀번호 찾기</h1>
        <p className="text-sm text-gray-400 mt-1">단국대학교 스키부</p>
      </div>

      <div className="w-full max-w-sm">
        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📧</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">이메일을 확인해주세요</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              {email}으로<br />
              비밀번호 재설정 링크를 보냈어요
            </p>
            <a
              href="/login"
              className="text-sm hover:underline"
              style={{ color: 'var(--text-primary)' }}
            >
              로그인으로 돌아가기
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <p className="text-sm text-gray-500 text-center mb-2">
              가입한 이메일을 입력하면<br />재설정 링크를 보내드려요
            </p>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 transition-colors"
              style={{
  background: 'var(--bg-secondary)',
  border: '0.5px solid var(--border-primary)',
  color: 'var(--text-primary)',
}}
              required
            />
            {error && <p className="text-red-500 text-xs px-1">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--ski-blue)', color: '#fff' }}
            >
              {loading ? '전송 중...' : '재설정 링크 보내기'}
            </button>
            <a
              href="/login"
              className="text-xs text-center text-gray-400 hover:text-gray-600 mt-1"
            >
              로그인으로 돌아가기
            </a>
          </form>
        )}
      </div>
    </main>
  )
}
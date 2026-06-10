'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않아요')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('비밀번호 변경에 실패했어요. 링크가 만료됐을 수 있어요.')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    setTimeout(() => router.push('/home'), 2000)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--gray-50)' }}
    >
      <div className="flex flex-col items-center mb-8">
        <img
          src="/icon-192x192.png"
          alt="단국대 스키부"
          className="w-16 h-16 rounded-2xl shadow-md mb-3"
        />
        <h1 className="text-xl font-bold text-gray-900">비밀번호 재설정</h1>
        <p className="text-sm text-gray-400 mt-1">단국대학교 스키부</p>
      </div>

      <div className="w-full max-w-sm">
        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">비밀번호가 변경됐어요</h2>
            <p className="text-sm text-gray-400">잠시 후 홈으로 이동해요</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              placeholder="새 비밀번호 (6자 이상)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 transition-colors"
              style={{ borderColor: 'var(--gray-200)' }}
              required
            />
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 transition-colors"
              style={{ borderColor: 'var(--gray-200)' }}
              required
            />
            {error && <p className="text-red-500 text-xs px-1">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--ski-blue)' }}
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
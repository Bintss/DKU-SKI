'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function KakaoRegisterPage() {
  const [joinType, setJoinType] = useState<'student' | 'ob'>('student')
  const [generation, setGeneration] = useState('')
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase
      .from('profiles')
      .update({
        generation: parseInt(generation),
        join_type: joinType,
        student_id: studentId || null,
        role: 'pending',
      })
      .eq('id', user.id)

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/pending')
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
        <h1 className="text-xl font-bold text-gray-900">추가 정보 입력</h1>
        <p className="text-sm text-gray-400 mt-1">카카오 계정으로 가입</p>
      </div>

      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* 가입 유형 */}
          <div className="flex flex-col gap-2 mb-1">
            <button
              type="button"
              onClick={() => setJoinType('student')}
              className={`border-2 rounded-2xl p-4 text-left transition-colors ${
                joinType === 'student' ? 'border-blue-500' : 'bg-white border-gray-200'
              }`}
            >
              <p className="font-semibold text-gray-900 text-sm mb-0.5">재학생 부원</p>
              <p className="text-xs text-gray-400">현재 단국대학교 재학 중인 스키부 부원</p>
            </button>
            <button
              type="button"
              onClick={() => setJoinType('ob')}
              className={`border-2 rounded-2xl p-4 text-left transition-colors ${
                joinType === 'ob' ? 'border-blue-500' : 'bg-white border-gray-200'
              }`}
            >
              <p className="font-semibold text-gray-900 text-sm mb-0.5">졸업생 / OB</p>
              <p className="text-xs text-gray-400">졸업한 스키부 OB 회원</p>
            </button>
          </div>

          <input
            type="number"
            placeholder="기수 (예: 38)"
            value={generation}
            onChange={e => setGeneration(e.target.value)}
            className="w-full bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400"
            style={{ borderColor: 'var(--gray-200)' }}
            required
          />

          {joinType === 'student' && (
            <input
              type="text"
              placeholder="학번 (예: 32222435)"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400"
              style={{ borderColor: 'var(--gray-200)' }}
            />
          )}

          {error && <p className="text-red-500 text-xs px-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50 mt-1"
            style={{ background: 'var(--ski-blue)' }}
          >
            {loading ? '저장 중...' : '가입 신청'}
          </button>
          <p className="text-xs text-gray-400 text-center">
            가입 후 운영진 승인이 필요해요
          </p>
        </form>
      </div>
    </main>
  )
}
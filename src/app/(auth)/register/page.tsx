'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [step, setStep] = useState(1)
  const [joinType, setJoinType] = useState<'student' | 'ob'>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [generation, setGeneration] = useState('')
  const [studentId, setStudentId] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          generation: parseInt(generation),
          join_type: joinType,
          student_id: studentId,
        }
      }
    })

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
      {/* 로고 */}
      <div className="flex flex-col items-center mb-8">
        <img
          src="/icon-192x192.png"
          alt="단국대 스키부"
          className="w-16 h-16 rounded-2xl shadow-md mb-3"
        />
        <h1 className="text-xl font-bold text-gray-900">회원가입</h1>
        <p className="text-sm text-gray-400 mt-1">단국대학교 스키부</p>
      </div>

      <div className="w-full max-w-sm">
        {/* Step 1 — 가입 유형 */}
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500 text-center mb-2">가입 유형을 선택해주세요</p>
            <button
              onClick={() => { setJoinType('student'); setStep(2) }}
              className="bg-white border-2 rounded-2xl p-5 text-left hover:border-blue-400 transition-colors"
              style={{ borderColor: 'var(--gray-200)' }}
            >
              <p className="font-semibold text-gray-900 mb-1">재학생 부원</p>
              <p className="text-xs text-gray-400">현재 단국대학교 재학 중인 스키부 부원</p>
            </button>
            <button
              onClick={() => { setJoinType('ob'); setStep(2) }}
              className="bg-white border-2 rounded-2xl p-5 text-left hover:border-blue-400 transition-colors"
              style={{ borderColor: 'var(--gray-200)' }}
            >
              <p className="font-semibold text-gray-900 mb-1">졸업생 / OB</p>
              <p className="text-xs text-gray-400">졸업한 스키부 OB 회원</p>
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">
              이미 계정이 있으신가요?{' '}
              <a href="/login" style={{ color: 'var(--ski-blue)' }} className="font-medium hover:underline">
                로그인
              </a>
            </p>
          </div>
        )}

        {/* Step 2 — 정보 입력 */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-gray-400 text-left hover:text-gray-600 mb-1 flex items-center gap-1"
            >
              ← 유형 다시 선택
            </button>

            <div className="rounded-xl px-4 py-2.5 text-sm font-medium mb-1"
              style={{ background: 'var(--ski-blue-50)', color: 'var(--ski-blue)' }}
            >
              {joinType === 'student' ? '재학생 부원' : '졸업생 / OB'} 으로 가입
            </div>

            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 transition-colors"
              style={{ borderColor: 'var(--gray-200)' }}
              required
            />
            <input
              type="number"
              placeholder="기수 (예: 38)"
              value={generation}
              onChange={e => setGeneration(e.target.value)}
              className="bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 transition-colors"
              style={{ borderColor: 'var(--gray-200)' }}
              required
            />
            {joinType === 'student' && (
              <input
                type="text"
                placeholder="학번 (예: 32222435)"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 transition-colors"
                style={{ borderColor: 'var(--gray-200)' }}
              />
            )}
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 transition-colors"
              style={{ borderColor: 'var(--gray-200)' }}
              required
            />
            <input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-white border rounded-2xl px-4 py-3.5 text-sm outline-none focus:border-blue-400 transition-colors"
              style={{ borderColor: 'var(--gray-200)' }}
              required
            />
            {error && <p className="text-red-500 text-xs px-1">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full text-white rounded-2xl py-3.5 text-sm font-semibold disabled:opacity-50 mt-1"
              style={{ background: 'var(--ski-blue)' }}
            >
              {loading ? '가입 중...' : '가입 신청'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-1">
              가입 후 운영진 승인이 필요해요
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
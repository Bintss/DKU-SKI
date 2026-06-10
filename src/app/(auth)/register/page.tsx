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
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-semibold text-center mb-2">단국대학교 스키부</h1>
        <p className="text-sm text-gray-400 text-center mb-8">회원가입</p>

        {/* Step 1 — 가입 유형 선택 */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600 text-center mb-2">가입 유형을 선택해주세요</p>
            <button
              onClick={() => { setJoinType('student'); setStep(2) }}
              className="border-2 rounded-xl p-5 text-left hover:border-blue-500 transition-colors"
            >
              <p className="font-medium mb-1">재학생 부원</p>
              <p className="text-xs text-gray-400">현재 단국대학교 재학 중인 스키부 부원</p>
            </button>
            <button
              onClick={() => { setJoinType('ob'); setStep(2) }}
              className="border-2 rounded-xl p-5 text-left hover:border-blue-500 transition-colors"
            >
              <p className="font-medium mb-1">졸업생 / OB</p>
              <p className="text-xs text-gray-400">졸업한 스키부 OB 회원</p>
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">
              이미 계정이 있으신가요?{' '}
              <a href="/login" className="text-blue-500 hover:underline">로그인</a>
            </p>
          </div>
        )}

        {/* Step 2 — 정보 입력 */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs text-gray-400 text-left hover:text-gray-600 mb-2"
            >
              ← 유형 다시 선택
            </button>

            <div className="bg-blue-50 rounded-lg px-4 py-2 text-xs text-blue-600 font-medium">
              {joinType === 'student' ? '재학생 부원' : '졸업생 / OB'} 으로 가입
            </div>

            <input
              type="text"
              placeholder="이름"
              value={name}
              onChange={e => setName(e.target.value)}
              className="border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="number"
              placeholder="기수 (예: 38)"
              value={generation}
              onChange={e => setGeneration(e.target.value)}
              className="border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {joinType === 'student' && (
              <input
                type="text"
                placeholder="학번 (예: 32222435)"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="border rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
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
              placeholder="비밀번호 (6자 이상)"
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
              {loading ? '가입 중...' : '가입 신청'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              가입 후 운영진 승인이 필요해요
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
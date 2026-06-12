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
        data: { name, generation: parseInt(generation), join_type: joinType, student_id: studentId }
      }
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.push('/pending')
  }

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-primary)',
    color: 'var(--text-primary)',
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex flex-col items-center mb-8">
        <img src="/icon-192x192.png" alt="단국대 스키부"
          className="w-16 h-16 rounded-2xl mb-3"
          style={{ boxShadow: '0 8px 32px rgba(27,63,171,0.4)' }}
        />
        <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>회원가입</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>단국대학교 스키부</p>
      </div>

      <div className="w-full max-w-sm">
        {step === 1 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-center mb-2" style={{ color: 'var(--text-tertiary)' }}>
              가입 유형을 선택해주세요
            </p>
            {[
              { value: 'student', title: '재학생 부원', desc: '현재 단국대학교 재학 중인 스키부 부원' },
              { value: 'ob', title: '졸업생 / OB', desc: '졸업한 스키부 OB 회원' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => { setJoinType(opt.value as 'student' | 'ob'); setStep(2) }}
                className="rounded-2xl p-5 text-left transition-all btn-press"
                style={{
                  background: 'var(--bg-secondary)',
                  border: `0.5px solid ${joinType === opt.value ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
                }}
              >
                <p className="font-black text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                  {opt.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{opt.desc}</p>
              </button>
            ))}
            <p className="text-xs text-center mt-2" style={{ color: 'var(--text-tertiary)' }}>
              이미 계정이 있으신가요?{' '}
              <a href="/login" className="font-semibold" style={{ color: 'var(--accent-blue)' }}>
                로그인
              </a>
            </p>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <button type="button" onClick={() => setStep(1)}
              className="text-xs text-left mb-1 flex items-center gap-1"
              style={{ color: 'var(--text-tertiary)' }}>
              ← 유형 다시 선택
            </button>

            <div className="rounded-xl px-4 py-2.5 text-xs font-black"
              style={{ background: 'rgba(27,63,171,0.2)', color: 'var(--accent-blue)' }}>
              {joinType === 'student' ? '재학생 부원' : '졸업생 / OB'} 으로 가입
            </div>

            {[
              { type: 'text', placeholder: '이름', value: name, onChange: (v: string) => setName(v) },
              { type: 'number', placeholder: '기수 (예: 38)', value: generation, onChange: (v: string) => setGeneration(v) },
            ].map((field, i) => (
              <input key={i} type={field.type} placeholder={field.placeholder}
                value={field.value} onChange={e => field.onChange(e.target.value)}
                className="w-full rounded-2xl px-4 py-3.5 text-sm" style={inputStyle} required />
            ))}

            {joinType === 'student' && (
              <input type="text" placeholder="학번 (예: 32222435)"
                value={studentId} onChange={e => setStudentId(e.target.value)}
                className="w-full rounded-2xl px-4 py-3.5 text-sm" style={inputStyle} />
            )}

            <input type="email" placeholder="이메일"
              value={email} onChange={e => setEmail(e.target.value)}
              className="w-full rounded-2xl px-4 py-3.5 text-sm" style={inputStyle} required />

            <input type="password" placeholder="비밀번호 (6자 이상)"
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-2xl px-4 py-3.5 text-sm" style={inputStyle} required />

            {error && <p className="text-xs px-1" style={{ color: 'var(--accent-red)' }}>{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl py-3.5 text-sm font-black disabled:opacity-50 btn-press mt-1"
              style={{ background: 'var(--ski-blue)', color: '#fff' }}>
              {loading ? '가입 중...' : '가입 신청'}
            </button>
            <p className="text-xs text-center" style={{ color: 'var(--text-hint)' }}>
              가입 후 운영진 승인이 필요해요
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
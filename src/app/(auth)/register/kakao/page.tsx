'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function KakaoRegisterPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [joinType, setJoinType] = useState<'student' | 'ob'>('student')
  const [generation, setGeneration] = useState('')
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [initializing, setInitializing] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // 카카오에서 가져온 이름을 기본값으로 미리 채워둠
  useEffect(() => {
    const fetchInitialName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      if (profile?.name && profile.name !== '이름없음') {
        setName(profile.name)
      }
      setInitializing(false)
    }
    fetchInitialName()
  }, [])

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length < 4) return digits
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase
      .from('profiles')
      .update({
        name,
        phone: phone || null,
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

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-primary)',
    color: 'var(--text-primary)',
  }

  if (initializing) {
    return (
      <main className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}>
        <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="flex flex-col items-center mb-8">
        <img
          src="/icon-192x192.png"
          alt="단국대 스키부"
          className="w-16 h-16 rounded-2xl mb-3"
          style={{ boxShadow: '0 8px 32px rgba(27,63,171,0.4)' }}
        />
        <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>추가 정보 입력</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>카카오 계정으로 가입</p>
      </div>

      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-2xl px-4 py-3.5 text-sm"
            style={inputStyle}
            required
          />

          <input
            type="tel"
            placeholder="전화번호 (010-0000-0000)"
            value={phone}
            onChange={e => setPhone(formatPhoneInput(e.target.value))}
            className="w-full rounded-2xl px-4 py-3.5 text-sm"
            style={inputStyle}
          />

          {/* 가입 유형 */}
          <div className="flex flex-col gap-2 mb-1">
            {[
              { value: 'student', title: '재학생 부원', desc: '현재 단국대학교 재학 중인 스키부 부원' },
              { value: 'ob', title: '졸업생 / OB', desc: '졸업한 스키부 OB 회원' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setJoinType(opt.value as 'student' | 'ob')}
                className="rounded-2xl p-4 text-left transition-all btn-press"
                style={{
                  background: 'var(--bg-secondary)',
                  border: `0.5px solid ${joinType === opt.value ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
                }}
              >
                <p className="font-black text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
                  {opt.title}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{opt.desc}</p>
              </button>
            ))}
          </div>

          <input
            type="number"
            placeholder="기수 (예: 38)"
            value={generation}
            onChange={e => setGeneration(e.target.value)}
            className="w-full rounded-2xl px-4 py-3.5 text-sm"
            style={inputStyle}
            required
          />

          {joinType === 'student' && (
            <input
              type="text"
              placeholder="학번 (예: 32222435)"
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full rounded-2xl px-4 py-3.5 text-sm"
              style={inputStyle}
            />
          )}

          {error && <p className="text-xs px-1" style={{ color: 'var(--accent-red)' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl py-3.5 text-sm font-black disabled:opacity-50 btn-press mt-1"
            style={{ background: 'var(--ski-blue)', color: '#fff' }}
          >
            {loading ? '저장 중...' : '가입 신청'}
          </button>
          <p className="text-xs text-center" style={{ color: 'var(--text-hint)' }}>
            가입 후 운영진 승인이 필요해요
          </p>
        </form>
      </div>
    </main>
  )
}
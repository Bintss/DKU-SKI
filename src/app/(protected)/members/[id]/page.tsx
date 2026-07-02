'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import Link from 'next/link'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

type Member = {
  id: string
  name: string
  generation: number
  role: string
  join_type: string
  ski_level: string | null
  equipment: string[] | null
  camp_intent: string | null
  bio: string | null
  avatar_url: string | null
  affiliation: string | null
  phone: string | null
  birth_date: string | null
  gender: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  student_id: string | null
}

const SKI_LEVEL_LABEL: Record<string, string> = {
  beginner: '처음', novice: '초급', intermediate: '중급',
  advanced: '상급', certified: '자격증 보유',
}

const EQUIPMENT_LABEL: Record<string, string> = {
  ski: '스키', boots: '부츠', poles: '폴',
  helmet: '헬멧', goggles: '고글', gloves: '장갑',
}

const CAMP_INTENT_LABEL: Record<string, string> = {
  yes: '참여', no: '미참여', undecided: '미정',
}

export default function MemberDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()
    setMember(data)
    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    if (!profile) return
    if (profile.id === id as string) { router.replace('/profile'); return }
    fetchData()
  }, [profile, id, router, fetchData])

  usePageVisibilityRefetch(fetchData, { enabled: !!profile && profile.id !== id, debounceMs: 5000 })

  const isAdmin = profile?.role === 'admin'

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  if (!member) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>부원을 찾을 수 없어요</p>
    </div>
  )

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '승인 대기'
  }

  const sectionCard = {
    background: '#fff',
    border: '1px solid var(--border-primary)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '12px',
    boxShadow: 'var(--shadow-sm)',
  }

  const sectionTitle = {
    fontSize: '11px',
    fontWeight: '900',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-hint)',
    marginBottom: '12px',
  }

  const row = (label: string, value: string | null | undefined) => value ? (
    <div className="flex items-center justify-between py-2.5"
      style={{ borderBottom: '1px solid var(--border-primary)' }}>
      <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</span>
    </div>
  ) : null

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <Link href="/members" className="text-xs font-semibold"
          style={{ color: 'var(--text-tertiary)' }}>← 동문 찾기</Link>
      </div>

      {/* 프로필 헤더 */}
      <div className="rounded-2xl p-6 mb-5 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--dku-blue-primary) 0%, var(--dku-blue) 100%)',
          boxShadow: 'var(--shadow-blue)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', transform: 'translate(30%,-30%)' }} />

        {member.avatar_url ? (
          <img src={member.avatar_url} alt={member.name}
            className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
            style={{ border: '2px solid rgba(255,255,255,0.3)' }} />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-3"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            {member.name[0]}
          </div>
        )}

        <p className="text-xl font-black mb-1" style={{ color: '#fff' }}>{member.name}</p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {member.generation}기 · {member.join_type === 'ob' ? '졸업생' : '재학생'}
        </p>
        <span className="inline-block mt-2 text-xs font-black px-3 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
          {roleLabel[member.role] ?? member.role}
        </span>
      </div>

      {/* 공개 정보 */}
      <div style={sectionCard}>
        <p style={sectionTitle}>스키 활동</p>
        {member.ski_level && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>실력</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
              {SKI_LEVEL_LABEL[member.ski_level] ?? member.ski_level}
            </span>
          </div>
        )}
        {member.equipment && member.equipment.length > 0 && (
          <div className="flex items-start gap-2 mb-2">
            <span className="text-sm mt-1 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>장비</span>
            <div className="flex flex-wrap gap-1.5">
              {member.equipment.map(e => (
                <span key={e} className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                  {EQUIPMENT_LABEL[e] ?? e}
                </span>
              ))}
            </div>
          </div>
        )}
        {member.camp_intent && (
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>합숙 의향</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {CAMP_INTENT_LABEL[member.camp_intent] ?? member.camp_intent}
            </span>
          </div>
        )}
        {!member.ski_level && !member.equipment?.length && !member.camp_intent && (
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>등록된 정보가 없어요</p>
        )}
      </div>

      {member.affiliation && (
        <div style={sectionCard}>
          <p style={sectionTitle}>소속</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {member.affiliation}
          </p>
        </div>
      )}

      {member.bio && (
        <div style={sectionCard}>
          <p style={sectionTitle}>자기소개</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--text-secondary)' }}>
            {member.bio}
          </p>
        </div>
      )}

      {/* 운영진 전용 정보 */}
      {isAdmin && (
        <div style={{ ...sectionCard, background: 'rgba(0,60,117,0.04)', border: '1px solid var(--dku-blue-light)' }}>
          <p style={{ ...sectionTitle, color: 'var(--dku-blue)' }}>운영진 전용 정보</p>
          <div style={{ borderBottom: 'none' }}>
            {row('성별', member.gender === 'male' ? '남성' : member.gender === 'female' ? '여성' : null)}
            {row('생년월일', member.birth_date)}
            {row('연락처', member.phone)}
            {row('학번', member.student_id)}
          </div>
          {(member.emergency_contact_name || member.emergency_contact_phone) && (
            <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--dku-blue-light)' }}>
              <p className="text-xs font-black mb-2" style={{ color: 'var(--dku-blue)' }}>비상연락처</p>
              {row('이름', member.emergency_contact_name)}
              {row('번호', member.emergency_contact_phone)}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
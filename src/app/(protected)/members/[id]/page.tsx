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
  join_year: number | null
  student_id: string | null
  student_id_status: string | null
  bio: string | null
  avatar_url: string | null
  // 부원 공개
  affiliation: string | null
  ski_level: string | null
  equipment: string[] | null
  camp_intent: string | null
  // 운영진만
  gender: string | null
  birth_date: string | null
  phone: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

const SKI_LEVEL_LABEL: Record<string, string> = {
  beginner: '처음',
  novice: '초급',
  intermediate: '중급',
  advanced: '상급',
  certified: '자격증 보유',
}

const CAMP_INTENT_LABEL: Record<string, string> = {
  yes: '참여',
  no: '미참여',
  undecided: '미정',
}

const EQUIPMENT_LABEL: Record<string, string> = {
  ski: '스키', boots: '부츠', poles: '폴',
  helmet: '헬멧', goggles: '고글', gloves: '장갑',
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
      .select(`
        id, name, generation, role, join_type, join_year,
        student_id, student_id_status, bio, avatar_url,
        affiliation, ski_level, equipment, camp_intent,
        gender, birth_date, phone,
        emergency_contact_name, emergency_contact_phone
      `)
      .eq('id', id)
      .single()
    setMember(data)
    setLoading(false)
  }, [id, supabase])

  useEffect(() => {
    if (!profile) return
    if (profile.id === id) { router.replace('/profile'); return }
    fetchData()
  }, [profile, id, router, fetchData])

  usePageVisibilityRefetch(fetchData, { enabled: !!profile && profile.id !== id, debounceMs: 5000 })

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '승인 대기'
  }
  const roleColor: Record<string, string> = {
    member: 'rgba(27,63,171,0.3)',
    ob: 'rgba(155,89,182,0.3)',
    admin: 'rgba(230,126,34,0.3)',
    pending: 'rgba(255,255,255,0.06)',
  }
  const roleTextColor: Record<string, string> = {
    member: 'var(--accent-blue)',
    ob: 'var(--accent-purple)',
    admin: 'var(--accent-orange)',
    pending: 'var(--text-hint)',
  }

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

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <Link href="/members" className="text-xs font-semibold block mb-4"
        style={{ color: 'var(--text-tertiary)' }}>
        ← 동문 디렉토리
      </Link>

      {/* 프로필 카드 */}
      <div className="rounded-2xl p-6 mb-5 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1B3FAB 0%, #2E55C8 100%)',
          boxShadow: '0 8px 32px rgba(27,63,171,0.3)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(30%,-30%)' }} />

        {member.avatar_url ? (
          <img src={member.avatar_url} alt={member.name}
            className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
            style={{ border: '2px solid rgba(255,255,255,0.3)' }} />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-3"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            {member.name[0]}
          </div>
        )}

        <p className="text-xl font-black mb-1" style={{ color: '#fff' }}>{member.name}</p>
        <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {member.generation}기
          {member.join_year && ` · ${member.join_year}년 입부`}
          {' · '}{member.join_type === 'ob' ? '졸업생' : '재학생'}
        </p>
        <span className="inline-block text-xs font-black px-3 py-1 rounded-full"
          style={{
            background: roleColor[member.role] ?? 'rgba(255,255,255,0.15)',
            color: roleTextColor[member.role] ?? '#fff',
          }}>
          {roleLabel[member.role]}
        </span>
      </div>

      {/* 자기소개 */}
      {member.bio && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <h2 className="text-xs font-black tracking-widest uppercase mb-2"
            style={{ color: 'var(--text-hint)' }}>자기소개</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {member.bio}
          </p>
        </div>
      )}

      {/* 소속 및 스키 활동 — 부원 전체 공개 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>활동 정보</h2>

        <div className="flex flex-col gap-2.5">
          {member.affiliation && (
            <div className="flex items-start gap-3">
              <span className="text-xs font-black w-16 flex-shrink-0 mt-0.5"
                style={{ color: 'var(--text-tertiary)' }}>소속</span>
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {member.affiliation}
              </span>
            </div>
          )}

          {member.ski_level && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-black w-16 flex-shrink-0"
                style={{ color: 'var(--text-tertiary)' }}>스키 실력</span>
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(27,63,171,0.2)', color: 'var(--accent-blue)' }}>
                🎿 {SKI_LEVEL_LABEL[member.ski_level] ?? member.ski_level}
              </span>
            </div>
          )}

          {member.equipment && member.equipment.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-xs font-black w-16 flex-shrink-0 mt-0.5"
                style={{ color: 'var(--text-tertiary)' }}>보유 장비</span>
              <div className="flex flex-wrap gap-1.5">
                {member.equipment.map(e => (
                  <span key={e} className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                    {EQUIPMENT_LABEL[e] ?? e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {member.camp_intent && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-black w-16 flex-shrink-0"
                style={{ color: 'var(--text-tertiary)' }}>합숙 의향</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: member.camp_intent === 'yes'
                    ? 'rgba(46,204,113,0.15)'
                    : member.camp_intent === 'no'
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(255,214,0,0.15)',
                  color: member.camp_intent === 'yes'
                    ? 'var(--accent-green)'
                    : member.camp_intent === 'no'
                    ? 'var(--text-hint)'
                    : '#FFD700',
                }}>
                🏔️ {CAMP_INTENT_LABEL[member.camp_intent]}
              </span>
            </div>
          )}

          {/* 공개 정보가 하나도 없을 때 */}
          {!member.affiliation && !member.ski_level &&
            (!member.equipment || member.equipment.length === 0) && !member.camp_intent && (
            <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
              아직 입력된 정보가 없어요
            </p>
          )}
        </div>
      </div>

      {/* 운영진 전용 — 개인 정보 */}
      {isAdmin && (
        <div className="rounded-2xl p-5 mb-4"
          style={{
            background: 'rgba(230,126,34,0.06)',
            border: '0.5px solid rgba(230,126,34,0.2)',
          }}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--accent-orange)' }}>운영진 전용</h2>
            <span className="text-xs font-black px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(230,126,34,0.2)', color: 'var(--accent-orange)' }}>
              비공개
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              {
                label: '성별',
                value: member.gender === 'male' ? '남성'
                  : member.gender === 'female' ? '여성' : null,
              },
              { label: '생년월일', value: member.birth_date },
              { label: '연락처', value: member.phone },
              {
                label: '비상연락처',
                value: member.emergency_contact_name && member.emergency_contact_phone
                  ? `${member.emergency_contact_name} · ${member.emergency_contact_phone}`
                  : null,
              },
              {
                label: '학번',
                value: member.student_id_status === 'completed' ? member.student_id
                  : member.student_id_status === 'not_issued' ? '미발급'
                  : member.student_id_status === 'not_applicable' ? '해당없음'
                  : null,
              },
            ].filter(item => item.value).map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="text-xs font-black w-20 flex-shrink-0 mt-0.5"
                  style={{ color: 'var(--text-tertiary)' }}>
                  {item.label}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
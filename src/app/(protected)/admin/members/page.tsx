'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

type Profile = {
  id: string
  name: string
  generation: number
  join_type: string
  student_id: string | null
  student_id_status: string | null
  role: string
  created_at: string
  // 2단계 추가 필드
  gender: string | null
  birth_date: string | null
  phone: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  join_year: number | null
  // 3단계 추가 필드
  affiliation: string | null
  ski_level: string | null
  equipment: string[] | null
  camp_intent: string | null
  membership_type: string | null
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

export default function AdminMembersPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [pending, setPending] = useState<Profile[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('generation', { ascending: false })

    if (data) {
      setPending(data.filter(p => p.role === 'pending'))
      setMembers(data.filter(p => p.role !== 'pending' && p.role !== 'withdrawn'))
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'admin') { router.push('/home'); return }
    fetchProfiles()
  }, [profile, router, fetchProfiles])

  usePageVisibilityRefetch(fetchProfiles, { enabled: profile?.role === 'admin', debounceMs: 2000 })

  const approve = async (id: string, joinType: string) => {
    const role = joinType === 'ob' ? 'ob' : 'member'
    await fetch('/api/admin/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: id, newRole: role }),
    })
    fetchProfiles()
  }

  const reject = async (id: string) => {
    if (!confirm('거절하면 계정이 완전히 삭제돼요. 계속할까요?')) return
    await fetch('/api/admin/reject-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    fetchProfiles()
  }

  const changeRole = async (id: string, role: string) => {
    await fetch('/api/admin/update-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: id, newRole: role }),
    })
    fetchProfiles()
  }

  const withdraw = async (id: string, name: string) => {
    if (!confirm(`${name}님을 탈퇴 처리할까요? 작성한 글/기록은 유지되지만 로그인은 차단돼요.`)) return
    await fetch('/api/admin/withdraw-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: id }),
    })
    fetchProfiles()
  }

  const filteredMembers = members.filter(m =>
    !search ||
    m.name.includes(search) ||
    String(m.generation).includes(search) ||
    (m.student_id ?? '').includes(search) ||
    (m.affiliation ?? '').includes(search)
  )

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '대기'
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

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Admin</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>회원 관리</h1>
      </div>

      {/* 승인 대기 */}
      {pending.length > 0 ? (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--text-hint)' }}>승인 대기</h2>
            <span className="text-xs font-black text-white px-2 py-0.5 rounded-full"
              style={{ background: 'var(--ski-blue)' }}>
              {pending.length}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {pending.map(p => (
              <div key={p.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'rgba(27,63,171,0.08)', border: '0.5px solid rgba(27,63,171,0.25)' }}>

                {/* 기본 정보 + 버튼 */}
                <div className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm mb-0.5" style={{ color: 'var(--text-primary)' }}>
                        {p.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                        {p.generation}기 · {p.join_type === 'ob' ? '졸업생' : '재학생'}
                        {p.join_year && ` · ${p.join_year}년 입부`}
                      </p>
                      {p.affiliation && (
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                          {p.affiliation}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => approve(p.id, p.join_type)}
                        className="text-xs font-black text-white px-3 py-1.5 rounded-lg btn-press"
                        style={{ background: 'var(--ski-blue)' }}>
                        승인
                      </button>
                      <button onClick={() => reject(p.id)}
                        className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
                        style={{
                          background: 'rgba(255,107,107,0.1)',
                          color: '#FF6B6B',
                          border: '0.5px solid rgba(255,107,107,0.2)',
                        }}>
                        거절
                      </button>
                    </div>
                  </div>

                  {/* 핵심 정보 한 줄 요약 */}
                  <div className="flex flex-wrap gap-2">
                    {p.ski_level && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(27,63,171,0.2)', color: 'var(--accent-blue)' }}>
                        🎿 {SKI_LEVEL_LABEL[p.ski_level] ?? p.ski_level}
                      </span>
                    )}
                    {p.camp_intent && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(46,204,113,0.15)', color: 'var(--accent-green)' }}>
                        🏔️ {CAMP_INTENT_LABEL[p.camp_intent] ?? p.camp_intent}
                      </span>
                    )}
                    {p.student_id_status === 'not_issued' && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,214,0,0.15)', color: '#FFD700' }}>
                        학번 미발급
                      </span>
                    )}
                  </div>

                  {/* 상세 정보 토글 */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                    className="text-xs mt-3"
                    style={{ color: 'var(--accent-blue)' }}>
                    {expandedId === p.id ? '상세 정보 접기 ▲' : '상세 정보 보기 ▼'}
                  </button>
                </div>

                {/* 상세 정보 패널 */}
                {expandedId === p.id && (
                  <div className="px-4 pb-4 pt-1"
                    style={{ borderTop: '0.5px solid rgba(27,63,171,0.2)' }}>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { label: '성별', value: p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : null },
                        { label: '생년월일', value: p.birth_date },
                        { label: '연락처', value: p.phone },
                        { label: '비상연락처', value: p.emergency_contact_name && p.emergency_contact_phone
                            ? `${p.emergency_contact_name} · ${p.emergency_contact_phone}` : null },
                        { label: '학번', value: p.student_id_status === 'completed' ? p.student_id
                            : p.student_id_status === 'not_issued' ? '미발급'
                            : p.student_id_status === 'not_applicable' ? '해당없음' : null },
                        { label: '보유 장비', value: p.equipment?.length
                            ? p.equipment.map(e => EQUIPMENT_LABEL[e] ?? e).join(', ') : '없음' },
                      ].filter(item => item.value).map(item => (
                        <div key={item.label} className="flex items-start gap-2">
                          <span className="text-xs font-black flex-shrink-0 w-20"
                            style={{ color: 'var(--text-hint)' }}>
                            {item.label}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl px-5 py-4 text-center mb-6"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
            대기 중인 가입 신청이 없어요
          </p>
        </div>
      )}

      {/* 전체 부원 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black tracking-widest uppercase"
            style={{ color: 'var(--text-hint)' }}>
            전체 부원
            <span className="ml-2" style={{ color: 'var(--text-tertiary)' }}>
              {members.length}명
            </span>
          </h2>
        </div>

        <input type="text" placeholder="이름, 기수, 학번, 소속 검색"
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm mb-3"
          style={{
            background: 'var(--bg-secondary)',
            border: '0.5px solid var(--border-primary)',
            color: 'var(--text-primary)',
          }} />

        {filteredMembers.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: 'var(--text-hint)' }}>
            검색 결과가 없어요
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredMembers.map(p => (
              <div key={p.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>

                <div className="px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                      style={{ background: 'var(--ski-blue)' }}>
                      {p.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {p.name}
                        </p>
                        <span className="text-xs font-black px-2 py-0.5 rounded-full"
                          style={{ background: roleColor[p.role], color: roleTextColor[p.role] }}>
                          {roleLabel[p.role]}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-hint)' }}>
                        {p.generation}기 · {p.join_type === 'ob' ? '졸업생' : '재학생'}
                        {p.affiliation && ` · ${p.affiliation}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select value={p.role} onChange={e => changeRole(p.id, e.target.value)}
                      className="text-xs font-bold rounded-lg px-2 py-1.5"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '0.5px solid var(--border-primary)',
                        color: 'var(--text-secondary)',
                      }}>
                      <option value="member">부원</option>
                      <option value="ob">OB</option>
                      <option value="admin">운영진</option>
                      <option value="pending">대기</option>
                    </select>
                    <button onClick={() => withdraw(p.id, p.name)}
                      className="text-xs font-black px-2 py-1.5 rounded-lg"
                      style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B' }}>
                      탈퇴
                    </button>
                  </div>
                </div>

                {/* 부원 상세 토글 */}
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  className="w-full text-xs py-2 text-center"
                  style={{
                    borderTop: '0.5px solid var(--border-primary)',
                    color: 'var(--text-hint)',
                  }}>
                  {expandedId === p.id ? '접기 ▲' : '상세 보기 ▼'}
                </button>

                {expandedId === p.id && (
                  <div className="px-4 pb-4 pt-2 flex flex-col gap-1.5">
                    {[
                      { label: '성별', value: p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : null },
                      { label: '생년월일', value: p.birth_date },
                      { label: '연락처', value: p.phone },
                      { label: '비상연락처', value: p.emergency_contact_name && p.emergency_contact_phone
                          ? `${p.emergency_contact_name} · ${p.emergency_contact_phone}` : null },
                      { label: '학번', value: p.student_id_status === 'completed' ? p.student_id
                          : p.student_id_status === 'not_issued' ? '미발급'
                          : p.student_id_status === 'not_applicable' ? '해당없음' : null },
                      { label: '스키 실력', value: p.ski_level ? SKI_LEVEL_LABEL[p.ski_level] : null },
                      { label: '보유 장비', value: p.equipment?.length
                          ? p.equipment.map(e => EQUIPMENT_LABEL[e] ?? e).join(', ') : null },
                      { label: '합숙 의향', value: p.camp_intent ? CAMP_INTENT_LABEL[p.camp_intent] : null },
                    ].filter(item => item.value).map(item => (
                      <div key={item.label} className="flex items-start gap-2">
                        <span className="text-xs font-black flex-shrink-0 w-20"
                          style={{ color: 'var(--text-hint)' }}>
                          {item.label}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
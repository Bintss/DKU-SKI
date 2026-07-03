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
  phone: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  ski_level: string | null
  camp_intent: string | null
  affiliation: string | null
  membership_type: string | null
}

const SKI_LEVEL_LABEL: Record<string, string> = {
  beginner: '처음', novice: '초급', intermediate: '중급',
  advanced: '상급', certified: '자격증',
}

const CAMP_INTENT_LABEL: Record<string, string> = {
  yes: '참여 예정', no: '미참여', undecided: '미정',
}

export default function AdminMembersPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [pending, setPending] = useState<Profile[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const fetchProfiles = useCallback(async () => {
    const { data } = await supabase
      .from('profiles').select('*')
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

  const callApi = async (url: string, body: object, userId: string) => {
    setActionLoading(userId)
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await fetchProfiles()
    setActionLoading(null)
  }

  const approve = (id: string, joinType: string) => {
    const role = joinType === 'ob' ? 'ob' : 'member'
    callApi('/api/admin/update-role', { targetUserId: id, newRole: role }, id)
  }

  const reject = async (id: string) => {
    if (!confirm('이 신청을 거절할까요? 계정이 삭제돼요.')) return
    setActionLoading(id)
    await fetch('/api/admin/reject-user', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    await fetchProfiles()
    setActionLoading(null)
  }

  const changeRole = (id: string, role: string) => {
    callApi('/api/admin/update-role', { targetUserId: id, newRole: role }, id)
  }

  const withdraw = async (id: string, name: string) => {
    if (!confirm(`${name}님을 강제 탈퇴시킬까요?`)) return
    setActionLoading(id)
    await fetch('/api/admin/withdraw-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    await fetchProfiles()
    setActionLoading(null)
  }

  const filteredMembers = members.filter(m =>
    search === '' ||
    m.name.includes(search) ||
    String(m.generation).includes(search) ||
    (m.affiliation ?? '').includes(search)
  )

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진',
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
      {pending.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-black tracking-widest uppercase mb-3"
            style={{ color: 'var(--accent-red)' }}>
            승인 대기 {pending.length}명
          </p>
          <div className="flex flex-col gap-3">
            {pending.map(p => {
              const isExpanded = expandedId === p.id
              const isLoading = actionLoading === p.id
              return (
                <div key={p.id} className="rounded-2xl overflow-hidden"
                  style={{
                    background: '#fff',
                    border: '1px solid rgba(220,38,38,0.2)',
                    boxShadow: 'var(--shadow-sm)',
                  }}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-base font-black"
                            style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                          <span className="text-xs font-black px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--accent-red)' }}>
                            {p.join_type === 'ob' ? 'OB 신청' : '재학생 신청'}
                          </span>
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {p.generation}기
                          {p.affiliation && ` · ${p.affiliation}`}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {p.ski_level && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
                              {SKI_LEVEL_LABEL[p.ski_level] ?? p.ski_level}
                            </span>
                          )}
                          {p.camp_intent && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
                              합숙 {CAMP_INTENT_LABEL[p.camp_intent] ?? p.camp_intent}
                            </span>
                          )}
                          {p.student_id_status && p.student_id_status !== 'completed' && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                              style={{ background: 'rgba(202,138,10,0.1)', color: 'var(--accent-yellow)' }}>
                              학번 {p.student_id_status === 'not_issued' ? '미발급' : '해당없음'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        className="text-xs font-black px-3 py-1.5 rounded-lg btn-press flex-shrink-0"
                        style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
                        {isExpanded ? '접기' : '상세'}
                      </button>
                    </div>

                    {/* 상세 정보 */}
                    {isExpanded && (
                      <div className="mt-3 pt-3"
                        style={{ borderTop: '1px solid var(--border-primary)' }}>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                          {[
                            { label: '연락처', value: p.phone },
                            { label: '학번', value: p.student_id || (p.student_id_status === 'not_issued' ? '미발급' : '해당없음') },
                            { label: '비상연락처', value: p.emergency_contact_name },
                            { label: '비상연락 번호', value: p.emergency_contact_phone },
                          ].map(item => item.value && (
                            <div key={item.label}>
                              <p style={{ color: 'var(--text-hint)' }}>{item.label}</p>
                              <p className="font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
                                {item.value}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                          신청일 {new Date(p.created_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button onClick={() => approve(p.id, p.join_type)}
                        disabled={isLoading}
                        className="flex-1 rounded-xl py-2.5 text-sm font-black disabled:opacity-50 btn-press"
                        style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                        {isLoading ? '처리 중...' : '승인'}
                      </button>
                      <button onClick={() => reject(p.id)}
                        disabled={isLoading}
                        className="rounded-xl px-4 py-2.5 text-sm font-black disabled:opacity-50 btn-press"
                        style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--accent-red)' }}>
                        거절
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 전체 부원 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black tracking-widest uppercase"
            style={{ color: 'var(--text-hint)' }}>
            전체 부원 {members.length}명
          </p>
        </div>

        <div className="relative mb-4">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="16" height="16"
            viewBox="0 0 24 24" fill="none" stroke="var(--text-hint)"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input type="text" placeholder="이름, 기수, 소속 검색"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl pl-10 pr-4 py-3 text-sm"
            style={{
              background: '#fff',
              border: '1px solid var(--border-primary)',
              color: 'var(--text-primary)',
              outline: 'none',
            }} />
        </div>

        <div className="flex flex-col gap-2">
          {filteredMembers.map(m => {
            const isLoading = actionLoading === m.id
            return (
              <div key={m.id} className="rounded-2xl p-4"
                style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                        {m.name}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                        {m.generation}기
                      </span>
                    </div>
                    {m.affiliation && (
                      <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {m.affiliation}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select value={m.role}
                      onChange={e => changeRole(m.id, e.target.value)}
                      disabled={isLoading}
                      className="text-xs font-bold rounded-lg px-2 py-1.5 disabled:opacity-50"
                      style={{
                        background: 'var(--surface-low)',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-secondary)',
                        outline: 'none',
                      }}>
                      <option value="member">부원</option>
                      <option value="ob">OB</option>
                      <option value="admin">운영진</option>
                    </select>
                    <button onClick={() => withdraw(m.id, m.name)}
                      disabled={isLoading || m.id === profile?.id}
                      className="text-xs font-black px-2.5 py-1.5 rounded-lg disabled:opacity-30 btn-press"
                      style={{ background: 'rgba(220,38,38,0.08)', color: 'var(--accent-red)' }}>
                      탈퇴
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
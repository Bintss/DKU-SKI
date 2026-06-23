'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

type Profile = {
  id: string
  name: string
  generation: number
  join_type: string
  student_id: string | null
  role: string
  created_at: string
}

export default function AdminMembersPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [pending, setPending] = useState<Profile[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const router = useRouter()
  const supabase = createClient()
  
  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('generation', { ascending: false })

    if (data) {
      setPending(data.filter(p => p.role === 'pending'))
      setMembers(data.filter(p => p.role !== 'pending'))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'admin') { router.push('/home'); return }
    fetchProfiles()
  }, [profile])

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

  const filteredMembers = members.filter(m =>
    !search ||
    m.name.includes(search) ||
    String(m.generation).includes(search) ||
    (m.student_id ?? '').includes(search)
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
          <div className="flex flex-col gap-2">
            {pending.map(p => (
              <div key={p.id}
                className="rounded-2xl px-4 py-4 flex items-center justify-between gap-4"
                style={{
                  background: 'rgba(27,63,171,0.1)',
                  border: '0.5px solid rgba(27,63,171,0.3)',
                }}>
                <div>
                  <p className="font-black text-sm" style={{ color: 'var(--text-primary)' }}>
                    {p.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                    {p.generation}기 · {p.join_type === 'ob' ? '졸업생' : '재학생'}
                    {p.student_id && ` · ${p.student_id}`}
                  </p>
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

        <input type="text" placeholder="이름, 기수, 학번 검색"
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
                className="rounded-2xl px-4 py-3.5 flex items-center justify-between gap-4"
                style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                    style={{ background: 'var(--ski-blue)' }}>
                    {p.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {p.name}
                      </p>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full"
                        style={{
                          background: roleColor[p.role],
                          color: roleTextColor[p.role],
                        }}>
                        {roleLabel[p.role]}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                      {p.generation}기 · {p.join_type === 'ob' ? '졸업생' : '재학생'}
                      {p.student_id && ` · ${p.student_id}`}
                    </p>
                  </div>
                </div>
                <select value={p.role} onChange={e => changeRole(p.id, e.target.value)}
                  className="text-xs font-bold rounded-lg px-2 py-1.5 flex-shrink-0"
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
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
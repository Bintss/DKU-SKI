'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

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
  const [pending, setPending] = useState<Profile[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  useEffect(() => { fetchProfiles() }, [])

  const approve = async (id: string, joinType: string) => {
    const role = joinType === 'ob' ? 'ob' : 'member'
    await supabase.from('profiles').update({ role }).eq('id', id)
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
    await supabase.from('profiles').update({ role }).eq('id', id)
    fetchProfiles()
  }

  const filteredMembers = members.filter(m =>
    m.name.includes(search) ||
    String(m.generation).includes(search) ||
    (m.student_id ?? '').includes(search)
  )

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '대기'
  }

  const roleColor: Record<string, string> = {
    member: 'bg-blue-50 text-blue-600',
    ob: 'bg-purple-50 text-purple-600',
    admin: 'bg-orange-50 text-orange-600',
    pending: 'bg-gray-100 text-gray-400',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">회원 관리</h1>

      {/* 승인 대기 */}
      {pending.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-medium text-gray-500">승인 대기</h2>
            <span
              className="text-xs font-medium text-white px-2 py-0.5 rounded-full"
              style={{ background: 'var(--ski-blue)' }}
            >
              {pending.length}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {pending.map(p => (
              <div
                key={p.id}
                className="bg-white border border-blue-100 rounded-2xl px-4 py-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-medium text-sm text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.generation}기 · {p.join_type === 'ob' ? '졸업생' : '재학생'}
                    {p.student_id && ` · ${p.student_id}`}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => approve(p.id, p.join_type)}
                    className="text-xs text-white px-3 py-1.5 rounded-lg"
                    style={{ background: 'var(--ski-blue)' }}
                  >
                    승인
                  </button>
                  <button
                    onClick={() => reject(p.id)}
                    className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && (
        <div className="mb-6 bg-white border rounded-2xl px-5 py-4 text-center">
          <p className="text-sm text-gray-400">대기 중인 가입 신청이 없어요</p>
        </div>
      )}

      {/* 전체 부원 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-gray-500">
            전체 부원 <span className="text-gray-900 ml-1">{members.length}명</span>
          </h2>
        </div>

        {/* 검색 */}
        <input
          type="text"
          placeholder="이름, 기수, 학번 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 text-sm outline-none mb-3 bg-white focus:border-blue-400 transition-colors"
          style={{ borderColor: 'var(--gray-200)' }}
        />

        {filteredMembers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">검색 결과가 없어요</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredMembers.map(p => (
              <div
                key={p.id}
                className="bg-white border rounded-2xl px-4 py-3.5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                    style={{ background: 'var(--ski-blue)' }}
                  >
                    {p.name[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-gray-900">{p.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[p.role]}`}>
                        {roleLabel[p.role]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {p.generation}기 · {p.join_type === 'ob' ? '졸업생' : '재학생'}
                      {p.student_id && ` · ${p.student_id}`}
                    </p>
                  </div>
                </div>
                <select
                  value={p.role}
                  onChange={e => changeRole(p.id, e.target.value)}
                  className="text-xs border rounded-lg px-2 py-1.5 text-gray-600 outline-none bg-white flex-shrink-0"
                >
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
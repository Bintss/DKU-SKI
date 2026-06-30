'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { SkeletonList } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

type Member = {
  id: string
  name: string
  generation: number
  role: string
  join_type: string
  student_id: string | null
  bio: string | null
  avatar_url: string | null
}

export default function MembersPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'student' | 'ob'>('all')
  const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, generation, role, join_type, student_id, bio, avatar_url')
      .neq('role', 'pending')
      .order('generation', { ascending: false })
      .order('name')
    setMembers(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  usePageVisibilityRefetch(fetchData)

  // 클라이언트 사이드 필터링
  const generations = [...new Set(members.map(m => m.generation))].sort((a, b) => b - a)

  const filtered = members.filter(m => {
    const matchSearch = !search ||
      m.name.includes(search) ||
      String(m.generation).includes(search)
    const matchType = filterType === 'all' || m.join_type === filterType
    const matchGen = selectedGeneration === null || m.generation === selectedGeneration
    return matchSearch && matchType && matchGen
  })

  const grouped = filtered.reduce((acc, m) => {
    if (!acc[m.generation]) acc[m.generation] = []
    acc[m.generation].push(m)
    return acc
  }, {} as Record<number, Member[]>)

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진'
  }

  const roleColor: Record<string, string> = {
    member: 'rgba(27,63,171,0.3)',
    ob: 'rgba(155,89,182,0.3)',
    admin: 'rgba(230,126,34,0.3)',
  }

  const roleTextColor: Record<string, string> = {
    member: 'var(--accent-blue)',
    ob: 'var(--accent-purple)',
    admin: 'var(--accent-orange)',
  }

  const filterBtnStyle = (active: boolean) => ({
    background: active ? 'var(--ski-blue)' : 'var(--bg-card)',
    border: `0.5px solid ${active ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
    color: active ? '#fff' : 'var(--text-tertiary)',
  })

  if (profileLoading || loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 rounded-full w-32 mb-5 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.06)' }} />
      <SkeletonList count={5} />
    </main>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Directory</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
          동문 디렉토리
        </h1>
      </div>

      {/* 검색 */}
      <input type="text" placeholder="이름, 기수 검색"
        value={search} onChange={e => setSearch(e.target.value)}
        className="w-full rounded-xl px-4 py-3 text-sm mb-3"
        style={{
          background: 'var(--bg-secondary)',
          border: '0.5px solid var(--border-primary)',
          color: 'var(--text-primary)',
        }} />

      {/* 타입 필터 */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {[
          { value: 'all', label: `전체 ${members.length}명` },
          { value: 'student', label: `재학생 ${members.filter(m => m.join_type === 'student').length}명` },
          { value: 'ob', label: `OB ${members.filter(m => m.join_type === 'ob').length}명` },
        ].map(f => (
          <button key={f.value}
            onClick={() => setFilterType(f.value as 'all' | 'student' | 'ob')}
            className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 transition-all btn-press"
            style={filterBtnStyle(filterType === f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* 기수 필터 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        <button onClick={() => setSelectedGeneration(null)}
          className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 transition-all btn-press"
          style={filterBtnStyle(selectedGeneration === null)}>
          전체 기수
        </button>
        {generations.map(gen => (
          <button key={gen}
            onClick={() => setSelectedGeneration(selectedGeneration === gen ? null : gen)}
            className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 transition-all btn-press"
            style={filterBtnStyle(selectedGeneration === gen)}>
            {gen}기
          </button>
        ))}
      </div>

      {/* 부원 목록 */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl font-black mb-2"
            style={{ color: 'rgba(255,255,255,0.04)' }}>NO RESULT</p>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>검색 결과가 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([gen, genMembers]) => (
              <div key={gen}>
                <p className="text-xs font-black tracking-widest uppercase mb-3"
                  style={{ color: 'var(--text-hint)' }}>{gen}기</p>
                <div className="flex flex-col gap-2">
                  {genMembers.map(m => (
                    <a key={m.id} href={`/members/${m.id}`}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3.5 card-hover btn-press"
                      style={{
                        background: 'var(--bg-card)',
                        border: '0.5px solid var(--border-primary)',
                      }}>
                      {m.avatar_url ? (
                        <img src={m.avatar_url} alt={m.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                          style={{ background: m.id === profile?.id ? 'var(--accent-green)' : 'var(--ski-blue)' }}>
                          {m.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {m.name}
                          </p>
                          {m.id === profile?.id && (
                            <span className="text-xs font-black"
                              style={{ color: 'var(--accent-green)' }}>나</span>
                          )}
                          <span className="text-xs font-black px-2 py-0.5 rounded-full"
                            style={{
                              background: roleColor[m.role] ?? 'rgba(255,255,255,0.06)',
                              color: roleTextColor[m.role] ?? 'var(--text-tertiary)',
                            }}>
                            {roleLabel[m.role] ?? m.role}
                          </span>
                        </div>
                        {m.bio && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-hint)' }}>
                            {m.bio}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-bold flex-shrink-0"
                        style={{ color: 'var(--text-hint)' }}>›</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </main>
  )
}
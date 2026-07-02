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
  ski_level: string | null
  bio: string | null
  avatar_url: string | null
  affiliation: string | null
}

const SKI_LEVEL_LABEL: Record<string, string> = {
  beginner: '처음', novice: '초급', intermediate: '중급',
  advanced: '상급', certified: '자격증',
}

export default function MembersPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'student' | 'ob'>('all')
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, generation, role, join_type, ski_level, bio, avatar_url, affiliation')
      .not('role', 'in', '("pending","withdrawn")')
      .order('generation', { ascending: false })
      .order('name')
    setMembers(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])
  usePageVisibilityRefetch(fetchData)

  const filtered = members.filter(m => {
    const matchSearch = search === '' ||
      m.name.includes(search) ||
      String(m.generation).includes(search) ||
      (m.affiliation ?? '').includes(search)
    const matchType = filterType === 'all' ||
      (filterType === 'student' && m.join_type === 'student') ||
      (filterType === 'ob' && (m.join_type === 'ob' || m.role === 'ob'))
    return matchSearch && matchType
  })

  const generationGroups = filtered.reduce((acc, m) => {
    const gen = m.generation
    if (!acc[gen]) acc[gen] = []
    acc[gen].push(m)
    return acc
  }, {} as Record<number, Member[]>)

  const sortedGenerations = Object.keys(generationGroups)
    .map(Number)
    .sort((a, b) => b - a)

  if (profileLoading || loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 rounded-full w-24 mb-5 animate-pulse"
        style={{ background: 'var(--surface-low)' }} />
      <SkeletonList count={4} />
    </main>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-5">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Members</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>동문 찾기</h1>
      </div>

      {/* 검색 */}
      <div className="relative mb-3">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="var(--text-hint)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input type="text" placeholder="이름, 기수, 소속으로 검색"
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl pl-10 pr-4 py-3 text-sm"
          style={{
            background: '#fff',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-primary)',
            outline: 'none',
          }} />
      </div>

      {/* 필터 */}
      <div className="flex gap-2 mb-5">
        {[
          { value: 'all', label: `전체 ${members.length}` },
          { value: 'student', label: `재학생 ${members.filter(m => m.join_type === 'student').length}` },
          { value: 'ob', label: `OB ${members.filter(m => m.join_type === 'ob' || m.role === 'ob').length}` },
        ].map(opt => (
          <button key={opt.value}
            onClick={() => setFilterType(opt.value as typeof filterType)}
            className="px-4 py-2 rounded-full text-xs font-black btn-press"
            style={{
              background: filterType === opt.value ? 'var(--dku-blue-primary)' : '#fff',
              border: `1px solid ${filterType === opt.value ? 'var(--dku-blue-primary)' : 'var(--border-primary)'}`,
              color: filterType === opt.value ? '#fff' : 'var(--text-tertiary)',
            }}>
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {search ? `"${search}" 검색 결과가 없어요` : '부원이 없어요'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {sortedGenerations.map(gen => (
            <div key={gen}>
              <p className="text-xs font-black tracking-widest uppercase mb-3"
                style={{ color: 'var(--text-hint)' }}>
                {gen}기 · {generationGroups[gen].length}명
              </p>
              <div className="flex flex-col gap-2">
                {generationGroups[gen].map(member => (
                  <a key={member.id} href={`/members/${member.id}`}
                    className="flex items-center gap-3 rounded-2xl p-4 card-hover btn-press"
                    style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.name}
                        className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-black flex-shrink-0"
                        style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                        {member.name[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                          {member.name}
                        </p>
                        {member.role === 'admin' && (
                          <span className="text-xs font-black px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(217,119,6,0.1)', color: 'var(--accent-orange)' }}>
                            운영진
                          </span>
                        )}
                        {(member.role === 'ob' || member.join_type === 'ob') && member.role !== 'admin' && (
                          <span className="text-xs font-black px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--accent-purple)' }}>
                            OB
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {member.affiliation && (
                          <span className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                            {member.affiliation}
                          </span>
                        )}
                        {member.ski_level && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
                            {SKI_LEVEL_LABEL[member.ski_level] ?? member.ski_level}
                          </span>
                        )}
                      </div>
                      {member.bio && (
                        <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-hint)' }}>
                          {member.bio}
                        </p>
                      )}
                    </div>
                    <span className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--text-hint)' }}>
                      →
                    </span>
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
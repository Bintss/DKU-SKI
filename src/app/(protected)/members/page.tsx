'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = {
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
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'student' | 'ob'>('all')
  const [selectedGeneration, setSelectedGeneration] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('role', 'pending')
        .order('generation', { ascending: false })
        .order('name')

      setMembers(data ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  // 기수 목록
  const generations = [...new Set(members.map(m => m.generation))].sort((a, b) => b - a)

  // 필터링
  const filtered = members.filter(m => {
    const matchSearch = m.name.includes(search) ||
      String(m.generation).includes(search)
    const matchType = filterType === 'all' || m.join_type === filterType ||
      (filterType === 'student' && m.join_type === 'student') ||
      (filterType === 'ob' && m.join_type === 'ob')
    const matchGen = selectedGeneration === null || m.generation === selectedGeneration
    return matchSearch && matchType && matchGen
  })

  // 기수별 그룹
  const grouped = filtered.reduce((acc, m) => {
    const gen = m.generation
    if (!acc[gen]) acc[gen] = []
    acc[gen].push(m)
    return acc
  }, {} as Record<number, Profile[]>)

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진'
  }

  const roleColor: Record<string, string> = {
    member: 'bg-blue-50 text-blue-600',
    ob: 'bg-purple-50 text-purple-600',
    admin: 'bg-orange-50 text-orange-600',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">동문 디렉토리</h1>

      {/* 검색 */}
      <input
        type="text"
        placeholder="이름, 기수 검색"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none mb-3 focus:border-blue-400"
        style={{ borderColor: 'var(--gray-200)' }}
      />

      {/* 필터 */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterType('all')}
          className={`text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-colors ${
            filterType === 'all'
              ? 'text-white'
              : 'bg-white border text-gray-500 hover:border-gray-300'
          }`}
          style={filterType === 'all' ? { background: 'var(--ski-blue)' } : {}}
        >
          전체 {members.length}명
        </button>
        <button
          onClick={() => setFilterType('student')}
          className={`text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-colors ${
            filterType === 'student'
              ? 'text-white'
              : 'bg-white border text-gray-500 hover:border-gray-300'
          }`}
          style={filterType === 'student' ? { background: 'var(--ski-blue)' } : {}}
        >
          재학생 {members.filter(m => m.join_type === 'student').length}명
        </button>
        <button
          onClick={() => setFilterType('ob')}
          className={`text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-colors ${
            filterType === 'ob'
              ? 'text-white'
              : 'bg-white border text-gray-500 hover:border-gray-300'
          }`}
          style={filterType === 'ob' ? { background: 'var(--ski-blue)' } : {}}
        >
          OB {members.filter(m => m.join_type === 'ob').length}명
        </button>
      </div>

      {/* 기수 필터 */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedGeneration(null)}
          className={`text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-colors ${
            selectedGeneration === null
              ? 'text-white'
              : 'bg-white border text-gray-500 hover:border-gray-300'
          }`}
          style={selectedGeneration === null ? { background: 'var(--ski-blue)' } : {}}
        >
          전체 기수
        </button>
        {generations.map(gen => (
          <button
            key={gen}
            onClick={() => setSelectedGeneration(selectedGeneration === gen ? null : gen)}
            className={`text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-colors ${
              selectedGeneration === gen
                ? 'text-white'
                : 'bg-white border text-gray-500 hover:border-gray-300'
            }`}
            style={selectedGeneration === gen ? { background: 'var(--ski-blue)' } : {}}
          >
            {gen}기
          </button>
        ))}
      </div>

      {/* 부원 목록 — 기수별 그룹 */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400">검색 결과가 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => Number(b) - Number(a))
            .map(([gen, genMembers]) => (
              <div key={gen}>
                <p className="text-xs font-medium text-gray-400 mb-2">{gen}기</p>
                <div className="flex flex-col gap-2">
                  {genMembers.map(m => (
                    <a
                      key={m.id}
                      href={`/members/${m.id}`}
                      className="flex items-center gap-3 bg-white border rounded-2xl px-4 py-3.5 hover:border-gray-300 transition-colors"
                    >
                      {/* 아바타 */}
                      {m.avatar_url ? (
                        <img
                          src={m.avatar_url}
                          alt={m.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                          style={{ background: 'var(--ski-blue)' }}
                        >
                          {m.name[0]}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{m.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${roleColor[m.role] ?? 'bg-gray-100 text-gray-500'}`}>
                            {roleLabel[m.role] ?? m.role}
                          </span>
                        </div>
                        {m.bio && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{m.bio}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-300 flex-shrink-0">›</span>
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
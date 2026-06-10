'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Camp = {
  id: string
  title: string
  season: string
  start_date: string
  end_date: string
  location: string | null
  description: string | null
  guest_fee: number
  max_participants: number | null
  is_open: boolean
  deadline: string | null
}

export default function CampPage() {
  const [camps, setCamps] = useState<Camp[]>([])
  const [profile, setProfile] = useState<{ role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: profileData }, { data: campData }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('camps').select('*').order('start_date', { ascending: false }),
      ])

      setProfile(profileData)
      setCamps(campData ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const filtered = camps.filter(c =>
    tab === 'upcoming' ? c.end_date >= today : c.end_date < today
  )

  const daysLeft = (deadline: string | null) => {
    if (!deadline) return null
    const diff = Math.ceil(
      (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diff < 0) return '마감'
    if (diff === 0) return '오늘 마감'
    return `D-${diff}`
  }

  const getNights = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-gray-900">합숙</h1>
        {profile?.role === 'admin' && (
          <a
            href="/camp/new"
            className="text-sm font-medium text-white px-4 py-2 rounded-xl transition-colors"
            style={{ background: 'var(--ski-blue)' }}
          >
            + 합숙 등록
          </a>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-1 p-1 rounded-xl mb-5"
        style={{ background: 'var(--gray-100)' }}
      >
        {(['upcoming', 'past'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm py-2 rounded-lg font-medium transition-colors ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {t === 'upcoming' ? '예정 · 진행 중' : '지난 합숙'}
          </button>
        ))}
      </div>

      {/* 합숙 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎿</p>
          <p className="text-sm text-gray-400">
            {tab === 'upcoming' ? '예정된 합숙이 없어요' : '지난 합숙 기록이 없어요'}
          </p>
          {tab === 'upcoming' && profile?.role === 'admin' && (
            <a
              href="/camp/new"
              className="mt-4 inline-block text-sm hover:underline"
              style={{ color: 'var(--ski-blue)' }}
            >
              합숙 등록하기
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(camp => {
            const nights = getNights(camp.start_date, camp.end_date)
            const deadline = daysLeft(camp.deadline)
            return (
              <a
                key={camp.id}
                href={`/camp/${camp.id}`}
                className="block bg-white border rounded-2xl p-5 hover:border-gray-300 transition-colors"
              >
                {/* 시즌 + 마감 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{
                      background: 'var(--ski-blue-50)',
                      color: 'var(--ski-blue)'
                    }}
                  >
                    {camp.season} 시즌
                  </span>
                  {deadline && (
                    <span className={`text-xs font-medium ${
                      deadline === '마감' ? 'text-gray-400' :
                      deadline === '오늘 마감' ? 'text-red-500' : 'text-orange-500'
                    }`}>
                      신청 {deadline}
                    </span>
                  )}
                </div>

                <p className="font-semibold text-gray-900 mb-2">{camp.title}</p>

                <p className="text-sm text-gray-500">
                  📅 {camp.start_date} ~ {camp.end_date}
                  <span className="text-gray-400 ml-1">
                    ({nights}박 {nights + 1}일)
                  </span>
                </p>
                {camp.location && (
                  <p className="text-sm text-gray-500 mt-0.5">📍 {camp.location}</p>
                )}

                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    camp.is_open && deadline !== '마감'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {camp.is_open && deadline !== '마감' ? '신청 중' : '신청 마감'}
                  </span>
                  {camp.max_participants && (
                    <span className="text-xs text-gray-400">
                      최대 {camp.max_participants}명
                    </span>
                  )}
                </div>
              </a>
            )
          })}
        </div>
      )}
    </main>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { SkeletonList } from '@/components/Skeleton'

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
    if (diff < 0) return null
    if (diff === 0) return '오늘 마감'
    return `D-${diff}`
  }

  const getNights = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const sm = String(s.getMonth() + 1).padStart(2, '0')
    const sd = String(s.getDate()).padStart(2, '0')
    const em = String(e.getMonth() + 1).padStart(2, '0')
    const ed = String(e.getDate()).padStart(2, '0')
    return `${sm}.${sd} — ${em}.${ed}`
  }

  if (loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 bg-gray-200 rounded-full w-16 mb-5 animate-pulse" />
      <SkeletonList count={3} />
    </main>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10 relative">
  {/* 배경 그라디언트 블러 */}
  <div
    className="absolute top-0 left-0 right-0 h-64 -z-10 opacity-10 blur-3xl rounded-full"
    style={{ background: 'var(--ski-blue)' }}
  />
      {/* 헤더 */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
            Ski Camp
          </p>
          <h1 className="text-3xl font-black text-gray-900 leading-tight">합숙</h1>
        </div>
        {profile?.role === 'admin' && (
          <a
            href="/camp/new"
            className="text-xs font-semibold text-white px-4 py-2 rounded-xl"
            style={{ background: 'var(--ski-blue)' }}
          >
            + 등록
          </a>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-4 mb-6 border-b">
        {[
          { value: 'upcoming', label: '예정' },
          { value: 'past', label: '지난 합숙' },
        ].map(t => (
          <button
            key={t.value}
            onClick={() => setTab(t.value as 'upcoming' | 'past')}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              tab === t.value ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {t.label}
            {tab === t.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--ski-blue)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* 합숙 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl font-black text-gray-100 mb-2">NO CAMP</p>
          <p className="text-sm text-gray-400">
            {tab === 'upcoming' ? '예정된 합숙이 없어요' : '지난 합숙 기록이 없어요'}
          </p>
          {tab === 'upcoming' && profile?.role === 'admin' && (
            <a href="/camp/new" className="mt-4 inline-block text-sm font-semibold hover:underline"
              style={{ color: 'var(--ski-blue)' }}>
              합숙 등록하기
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((camp, idx) => {
            const nights = getNights(camp.start_date, camp.end_date)
            const deadline = daysLeft(camp.deadline)
            const isFirst = idx === 0 && tab === 'upcoming'

            return (
              <a
                key={camp.id}
  href={`/camp/${camp.id}`}
  className="block rounded-2xl overflow-hidden card-hover btn-press"
  style={{
    background: isFirst
      ? 'linear-gradient(135deg, rgba(27,63,171,0.85) 0%, rgba(46,85,200,0.75) 100%)'
      : 'white',
    border: isFirst
      ? '1px solid rgba(255,255,255,0.2)'
      : '1px solid var(--gray-200)',
    backdropFilter: isFirst ? 'blur(12px)' : 'none',
    WebkitBackdropFilter: isFirst ? 'blur(12px)' : 'none',
    boxShadow: isFirst
      ? '0 8px 32px rgba(27,63,171,0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
      : 'none',
  }}
>
                <div className="p-5">
                  {/* 상단 메타 */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                      style={{
                        background: isFirst ? 'rgba(255,255,255,0.2)' : 'var(--ski-blue-50)',
                        color: isFirst ? 'white' : 'var(--ski-blue)',
                      }}
                    >
                      {camp.season}
                    </span>
                    {deadline && (
                      <span className={`text-xs font-bold ${
                        isFirst ? 'text-yellow-300' : 'text-orange-500'
                      }`}>
                        {deadline}
                      </span>
                    )}
                  </div>

                  {/* 제목 */}
                  <h2 className={`text-xl font-black leading-tight mb-4 ${
                    isFirst ? 'text-white' : 'text-gray-900'
                  }`}>
                    {camp.title}
                  </h2>

                  {/* 날짜·장소 */}
                  <div className={`flex items-center gap-4 text-sm ${
                    isFirst ? 'text-blue-200' : 'text-gray-500'
                  }`}>
                    <span className="font-semibold">
                      {formatDateRange(camp.start_date, camp.end_date)}
                    </span>
                    <span className="text-xs">
                      {nights}박 {nights + 1}일
                    </span>
                    {camp.location && (
                      <>
                        <span>·</span>
                        <span className="truncate">{camp.location}</span>
                      </>
                    )}
                  </div>

                  {/* 신청 상태 바 */}
                  <div className="flex items-center justify-between mt-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      camp.is_open
                        ? isFirst
                          ? 'bg-white/20 text-white'
                          : 'bg-green-50 text-green-600'
                        : isFirst
                          ? 'bg-white/10 text-blue-200'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {camp.is_open ? '신청 중' : '신청 마감'}
                    </span>
                    <span className={`text-xs font-bold ${
                      isFirst ? 'text-blue-200' : 'text-gray-400'
                    }`}>
                      자세히 →
                    </span>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </main>
  )
}
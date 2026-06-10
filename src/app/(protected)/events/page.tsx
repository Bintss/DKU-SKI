'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { SkeletonList } from '@/components/Skeleton'

type Event = {
  id: string
  title: string
  type: string
  start_date: string
  end_date: string
  location: string | null
  description: string | null
  max_participants: number | null
  guest_fee: number
  is_open: boolean
  deadline: string | null
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  daytrip: '당일',
  training: '훈련',
  ob_invite: 'OB',
  etc: '기타',
}

const EVENT_TYPE_COLOR: Record<string, string> = {
  daytrip: '#2ECC71',
  training: '#9B59B6',
  ob_invite: '#E67E22',
  etc: '#1B3FAB',
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [profile, setProfile] = useState<{ role: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: profileData }, { data: eventsData }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', user.id).single(),
        supabase.from('events').select('*').order('start_date', { ascending: tab === 'upcoming' }),
      ])

      setProfile(profileData)
      setEvents(eventsData ?? [])
      setLoading(false)
    }
    fetchData()
  }, [tab])

  const today = new Date().toISOString().split('T')[0]
  const filtered = events.filter(e =>
    tab === 'upcoming' ? e.end_date >= today : e.end_date < today
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

  const formatMonth = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ko-KR', { month: 'short' })
  }

  const formatDay = (dateStr: string) => {
    return new Date(dateStr).getDate()
  }

  const formatWeekday = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('ko-KR', { weekday: 'short' })
  }

  // 월별 그룹
  const grouped = filtered.reduce((acc, event) => {
    const month = new Date(event.start_date).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long'
    })
    if (!acc[month]) acc[month] = []
    acc[month].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  if (loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 bg-gray-200 rounded-full w-16 mb-5 animate-pulse" />
      <SkeletonList count={3} />
    </main>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {/* 헤더 */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-1">
            Schedule
          </p>
          <h1 className="text-3xl font-black text-gray-900 leading-tight">행사</h1>
        </div>
        {profile?.role === 'admin' && (
          <a
            href="/admin/events/new"
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
          { value: 'past', label: '지난 행사' },
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

      {/* 행사 목록 — 타임라인 */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl font-black text-gray-100 mb-2">ALL CLEAR</p>
          <p className="text-sm text-gray-400">
            {tab === 'upcoming' ? '예정된 행사가 없어요' : '지난 행사가 없어요'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(grouped).map(([month, monthEvents]) => (
            <div key={month}>
              {/* 월 헤더 */}
              <p className="text-xs font-black tracking-widest text-gray-400 uppercase mb-4">
                {month}
              </p>

              <div className="flex flex-col gap-2">
                {monthEvents.map(event => {
                  const deadline = daysLeft(event.deadline)
                  const typeColor = EVENT_TYPE_COLOR[event.type] ?? '#1B3FAB'
                  const typeLabel = EVENT_TYPE_LABEL[event.type] ?? '기타'

                  return (
                    <a
                      key={event.id}
                      href={event.type === 'camp'
                        ? `/events/${event.id}/calendar`
                        : `/events/${event.id}`}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white border hover:border-gray-300 transition-colors card-hover btn-press"
                    >
                      {/* 날짜 블록 */}
                      <div className="flex-shrink-0 w-12 text-center">
                        <p className="text-xs font-semibold text-gray-400 uppercase">
                          {formatMonth(event.start_date)}
                        </p>
                        <p className="text-2xl font-black text-gray-900 leading-tight">
                          {formatDay(event.start_date)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatWeekday(event.start_date)}
                        </p>
                      </div>

                      {/* 구분선 */}
                      <div
                        className="w-0.5 h-12 rounded-full flex-shrink-0"
                        style={{ background: typeColor }}
                      />

                      {/* 내용 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${typeColor}15`, color: typeColor }}
                          >
                            {typeLabel}
                          </span>
                          {deadline && (
                            <span className="text-xs font-semibold text-orange-500">
                              {deadline}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {event.title}
                        </p>
                        {event.location && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {event.location}
                          </p>
                        )}
                      </div>

                      {/* 신청 상태 */}
                      <div className="flex-shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          event.is_open
                            ? 'bg-green-50 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {event.is_open ? '신청 중' : '마감'}
                        </span>
                      </div>
                    </a>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
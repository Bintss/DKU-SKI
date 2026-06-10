'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

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
  daytrip: '당일 행사',
  camp: '합숙 · MT',
  training: '정기 훈련',
  ob_invite: 'OB 초청',
}

const EVENT_TYPE_COLOR: Record<string, string> = {
  daytrip: 'bg-green-100 text-green-700',
  camp: 'bg-blue-100 text-blue-700',
  training: 'bg-purple-100 text-purple-700',
  ob_invite: 'bg-orange-100 text-orange-700',
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const supabase = createClient()

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: tab === 'upcoming' })
      setEvents(data ?? [])
      setLoading(false)
    }
    fetchEvents()
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
    if (diff < 0) return '마감'
    if (diff === 0) return '오늘 마감'
    return `D-${diff}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <h1 className="text-lg font-semibold text-gray-900 mb-5">행사</h1>

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
            {t === 'upcoming' ? '예정된 행사' : '지난 행사'}
          </button>
        ))}
      </div>

      {/* 행사 목록 */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm text-gray-400">
            {tab === 'upcoming' ? '예정된 행사가 없어요' : '지난 행사가 없어요'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(event => {
            const deadline = daysLeft(event.deadline)
            return (
              <a
                key={event.id}
                href={event.type === 'camp'
                  ? `/events/${event.id}/calendar`
                  : `/events/${event.id}`}
                className="block bg-white border rounded-2xl p-5 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    EVENT_TYPE_COLOR[event.type] ?? 'bg-gray-100 text-gray-600'
                  }`}>
                    {EVENT_TYPE_LABEL[event.type] ?? event.type}
                  </span>
                  {deadline && (
                    <span className={`text-xs font-medium ${
                      deadline === '마감' ? 'text-gray-400' :
                      deadline === '오늘 마감' ? 'text-red-500' : 'text-orange-500'
                    }`}>
                      {deadline}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-900 mb-2">{event.title}</p>
                <p className="text-sm text-gray-500">
                  📅 {event.start_date === event.end_date
                    ? event.start_date
                    : `${event.start_date} ~ ${event.end_date}`}
                </p>
                {event.location && (
                  <p className="text-sm text-gray-500 mt-0.5">📍 {event.location}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    event.is_open && deadline !== '마감'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {event.is_open && deadline !== '마감' ? '신청 중' : '신청 마감'}
                  </span>
                  {event.max_participants && (
                    <span className="text-xs text-gray-400">
                      최대 {event.max_participants}명
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
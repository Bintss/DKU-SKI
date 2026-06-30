'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { SkeletonList } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

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
  daytrip: 'Day Trip',
  training: 'Training',
  ob_invite: 'OB Event',
  etc: 'Event',
}

const EVENT_TYPE_COLOR: Record<string, string> = {
  daytrip: '#2ECC71',
  training: '#9B59B6',
  ob_invite: '#E67E22',
  etc: '#1B3FAB',
}

export default function EventsPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const supabase = createClient()

  const fetchEvents = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('start_date', { ascending: true })
    setEvents(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  usePageVisibilityRefetch(fetchEvents)

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

  const formatMonth = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short' })

  const formatDay = (dateStr: string) => new Date(dateStr).getDate()

  const formatWeekday = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('ko-KR', { weekday: 'short' })

  const grouped = filtered.reduce((acc, event) => {
    const month = new Date(event.start_date).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long'
    })
    if (!acc[month]) acc[month] = []
    acc[month].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  if (profileLoading || loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 rounded-full w-16 mb-5 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.06)' }} />
      <SkeletonList count={3} />
    </main>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Schedule</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>행사</h1>
        </div>
        {profile?.role === 'admin' && (
          <a href="/admin/events/new"
            className="text-xs font-black text-white px-4 py-2 rounded-xl btn-press"
            style={{ background: 'var(--ski-blue)' }}>
            + 등록
          </a>
        )}
      </div>

      <div className="flex gap-4 mb-6"
        style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
        {[
          { value: 'upcoming', label: '예정' },
          { value: 'past', label: '지난 행사' },
        ].map(t => (
          <button key={t.value} onClick={() => setTab(t.value as 'upcoming' | 'past')}
            className="pb-3 text-sm font-black transition-colors relative"
            style={{ color: tab === t.value ? 'var(--text-primary)' : 'var(--text-hint)' }}>
            {t.label}
            {tab === t.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ background: 'var(--ski-blue)' }} />
            )}
          </button>
        ))}
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl font-black mb-2"
            style={{ color: 'rgba(255,255,255,0.05)' }}>ALL CLEAR</p>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {tab === 'upcoming' ? '예정된 행사가 없어요' : '지난 행사가 없어요'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {Object.entries(grouped).map(([month, monthEvents]) => (
            <div key={month}>
              <p className="text-xs font-black tracking-widest uppercase mb-4"
                style={{ color: 'var(--text-hint)' }}>{month}</p>
              <div className="flex flex-col gap-2">
                {monthEvents.map(event => {
                  const deadline = daysLeft(event.deadline)
                  const typeColor = EVENT_TYPE_COLOR[event.type] ?? '#1B3FAB'
                  const typeLabel = EVENT_TYPE_LABEL[event.type] ?? 'Event'

                  return (
                    <a key={event.id} href={`/events/${event.id}`}
                      className="flex items-center gap-4 p-4 rounded-2xl card-hover btn-press"
                      style={{
                        background: 'var(--bg-card)',
                        border: '0.5px solid var(--border-primary)',
                      }}>
                      <div className="flex-shrink-0 w-12 text-center">
                        <p className="text-xs font-black uppercase"
                          style={{ color: 'var(--text-hint)' }}>
                          {formatMonth(event.start_date)}
                        </p>
                        <p className="text-2xl font-black leading-tight"
                          style={{ color: 'var(--text-primary)' }}>
                          {formatDay(event.start_date)}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                          {formatWeekday(event.start_date)}
                        </p>
                      </div>

                      <div className="w-0.5 h-12 rounded-full flex-shrink-0"
                        style={{ background: typeColor }} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-black px-2 py-0.5 rounded-full"
                            style={{ background: `${typeColor}20`, color: typeColor }}>
                            {typeLabel}
                          </span>
                          {deadline && (
                            <span className="text-xs font-black"
                              style={{ color: 'var(--accent-orange)' }}>
                              {deadline}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-black truncate"
                          style={{ color: 'var(--text-primary)' }}>
                          {event.title}
                        </p>
                        {event.location && (
                          <p className="text-xs mt-0.5 truncate"
                            style={{ color: 'var(--text-hint)' }}>
                            {event.location}
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <span className="text-xs font-black px-2.5 py-1 rounded-full"
                          style={{
                            background: event.is_open
                              ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.06)',
                            color: event.is_open
                              ? 'var(--accent-green)' : 'var(--text-hint)',
                          }}>
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
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { SkeletonList } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

type Camp = {
  id: string
  title: string
  start_date: string
  end_date: string
  location: string | null
  is_open: boolean
  deadline: string | null
  participant_count?: number
}

export default function CampPage() {
  const { profile, loading: profileLoading } = useProfile()
  const [camps, setCamps] = useState<Camp[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCamps = useCallback(async () => {
    const { data } = await supabase
      .from('camps')
      .select('*, camp_participants(id)')
      .order('start_date', { ascending: false })
    setCamps((data ?? []).map((c: any) => ({
      ...c,
      participant_count: c.camp_participants?.length ?? 0,
    })))
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchCamps() }, [fetchCamps])
  usePageVisibilityRefetch(fetchCamps)

  const getNights = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))

  const daysLeft = (deadline: string | null) => {
    if (!deadline) return null
    const diff = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return null
    if (diff === 0) return '오늘 마감'
    return `D-${diff}`
  }

  const formatDate = (start: string, end: string) => {
    const s = new Date(start)
    const e = new Date(end)
    const fmt = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    return `${fmt(s)} — ${fmt(e)}`
  }

  if (profileLoading || loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 rounded-full w-20 mb-5 animate-pulse" style={{ background: 'var(--surface-low)' }} />
      <SkeletonList count={3} />
    </main>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Camp</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>합숙</h1>
        </div>
        {profile?.role === 'admin' && (
          <a href="/camp/new"
            className="text-xs font-black px-4 py-2 rounded-xl btn-press"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            + 등록
          </a>
        )}
      </div>

      {camps.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>등록된 합숙이 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {camps.map(camp => {
            const nights = getNights(camp.start_date, camp.end_date)
            const deadline = daysLeft(camp.deadline)
            const isPast = new Date(camp.end_date) < new Date()
            return (
              <a key={camp.id} href={`/camp/${camp.id}`}
                className="block rounded-2xl p-5 card-hover btn-press"
                style={{
                  background: '#fff',
                  border: '1px solid var(--border-primary)',
                  boxShadow: 'var(--shadow-sm)',
                  opacity: isPast ? 0.6 : 1,
                }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: isPast ? 'var(--surface-low)'
                            : camp.is_open ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.08)',
                          color: isPast ? 'var(--text-hint)'
                            : camp.is_open ? 'var(--accent-green)' : 'var(--accent-red)',
                        }}>
                        {isPast ? '종료' : camp.is_open ? '신청 중' : '신청 마감'}
                      </span>
                      {deadline && !isPast && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(202,138,10,0.1)', color: 'var(--accent-yellow)' }}>
                          {deadline}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-black truncate" style={{ color: 'var(--text-primary)' }}>
                      {camp.title}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-black" style={{ color: 'var(--dku-blue-primary)' }}>
                      {nights}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-hint)' }}>박</p>
                  </div>
                </div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                  {formatDate(camp.start_date, camp.end_date)}
                </p>
                {camp.location && (
                  <p className="text-xs" style={{ color: 'var(--text-hint)' }}>📍 {camp.location}</p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3"
                  style={{ borderTop: '1px solid var(--border-primary)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                    참가 {camp.participant_count}명
                  </span>
                  <span className="text-xs font-bold" style={{ color: 'var(--dku-blue)' }}>자세히 →</span>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </main>
  )
}
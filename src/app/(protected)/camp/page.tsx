'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { SkeletonList } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'

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
  const { profile, loading: profileLoading } = useProfile()
  const [camps, setCamps] = useState<Camp[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: campData } = await supabase
        .from('camps')
        .select('*')
        .order('start_date', { ascending: false })
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
    return `${String(s.getMonth() + 1).padStart(2, '0')}.${String(s.getDate()).padStart(2, '0')} — ${String(e.getMonth() + 1).padStart(2, '0')}.${String(e.getDate()).padStart(2, '0')}`
  }

  if (profileLoading || loading) return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="h-8 rounded-full w-16 mb-5 animate-pulse"
        style={{ background: 'rgba(255,255,255,0.06)' }} />
      <SkeletonList count={3} />
    </main>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10 relative">
      <div className="absolute top-0 left-0 right-0 h-64 -z-10 opacity-10 blur-3xl rounded-full"
        style={{ background: 'var(--ski-blue)' }} />

      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Ski Camp</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>합숙</h1>
        </div>
        {profile?.role === 'admin' && (
          <a href="/camp/new"
            className="text-xs font-black text-white px-4 py-2 rounded-xl btn-press"
            style={{ background: 'var(--ski-blue)' }}>
            + 등록
          </a>
        )}
      </div>

      <div className="flex gap-4 mb-6" style={{ borderBottom: '0.5px solid var(--border-primary)' }}>
        {[
          { value: 'upcoming', label: '예정' },
          { value: 'past', label: '지난 합숙' },
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

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl font-black mb-2" style={{ color: 'rgba(255,255,255,0.05)' }}>
            NO CAMP
          </p>
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {tab === 'upcoming' ? '예정된 합숙이 없어요' : '지난 합숙 기록이 없어요'}
          </p>
          {tab === 'upcoming' && profile?.role === 'admin' && (
            <a href="/camp/new" className="mt-4 inline-block text-sm font-black hover:underline"
              style={{ color: 'var(--accent-blue)' }}>
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
              <a key={camp.id} href={`/camp/${camp.id}`}
                className="block rounded-2xl overflow-hidden card-hover btn-press"
                style={{
                  background: isFirst
                    ? 'linear-gradient(135deg, rgba(27,63,171,0.85) 0%, rgba(46,85,200,0.75) 100%)'
                    : 'var(--bg-card)',
                  border: isFirst
                    ? '0.5px solid rgba(255,255,255,0.15)'
                    : '0.5px solid var(--border-primary)',
                  backdropFilter: isFirst ? 'blur(12px)' : 'none',
                  boxShadow: isFirst
                    ? '0 8px 32px rgba(27,63,171,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                    : 'none',
                }}>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black tracking-widest uppercase px-2.5 py-1 rounded-full"
                      style={{
                        background: isFirst ? 'rgba(255,255,255,0.15)' : 'rgba(27,63,171,0.2)',
                        color: isFirst ? '#fff' : 'var(--accent-blue)',
                      }}>
                      {camp.season}
                    </span>
                    {deadline && (
                      <span className="text-xs font-black"
                        style={{ color: isFirst ? '#FFD700' : 'var(--accent-orange)' }}>
                        {deadline}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black leading-tight mb-4"
                    style={{ color: isFirst ? '#fff' : 'var(--text-primary)' }}>
                    {camp.title}
                  </h2>
                  <div className="flex items-center gap-3 text-sm flex-wrap"
                    style={{ color: isFirst ? 'rgba(255,255,255,0.5)' : 'var(--text-tertiary)' }}>
                    <span className="font-semibold">{formatDateRange(camp.start_date, camp.end_date)}</span>
                    <span className="text-xs">{nights}박 {nights + 1}일</span>
                    {camp.location && <><span>·</span><span className="truncate">{camp.location}</span></>}
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs font-black px-2.5 py-1 rounded-full"
                      style={{
                        background: camp.is_open
                          ? isFirst ? 'rgba(255,255,255,0.15)' : 'rgba(46,204,113,0.15)'
                          : isFirst ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.06)',
                        color: camp.is_open
                          ? isFirst ? '#fff' : 'var(--accent-green)'
                          : isFirst ? 'rgba(255,255,255,0.4)' : 'var(--text-hint)',
                      }}>
                      {camp.is_open ? '신청 중' : '신청 마감'}
                    </span>
                    <span className="text-xs font-black"
                      style={{ color: isFirst ? 'rgba(255,255,255,0.4)' : 'var(--text-hint)' }}>
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
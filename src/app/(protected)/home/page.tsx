'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { SkeletonHome } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'

type Camp = {
  id: string
  title: string
  start_date: string
  end_date: string
  location: string | null
  is_open: boolean
  deadline: string | null
}

type FinanceSummary = {
  totalIncome: number
  totalExpense: number
  balance: number
}

export default function HomePage() {
  const { profile, loading: profileLoading } = useProfile()
  const [upcomingCamp, setUpcomingCamp] = useState<Camp | null>(null)
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [dataLoading, setDataLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return
    const fetchData = async () => {
      const today = new Date().toISOString().split('T')[0]

      const [
        { data: campData },
        { data: financeData },
        { data: noticeData },
        { data: readData },
      ] = await Promise.all([
        supabase.from('camps').select('*').gte('end_date', today).order('start_date').limit(1).single(),
        supabase.from('finance').select('amount, type').eq('season', '2026-27'),
        supabase.from('notices').select('id'),
        supabase.from('notice_reads').select('notice_id').eq('user_id', profile.id),
      ])

      setUpcomingCamp(campData)

      if (financeData) {
        const totalIncome = financeData.filter((r: any) => r.type === 'income').reduce((s: number, r: any) => s + r.amount, 0)
        const totalExpense = financeData.filter((r: any) => r.type === 'expense').reduce((s: number, r: any) => s + Math.abs(r.amount), 0)
        setFinance({ totalIncome, totalExpense, balance: totalIncome - totalExpense })
      }

      const readSet = new Set(readData?.map(r => r.notice_id) ?? [])
      setUnreadCount((noticeData ?? []).filter(n => !readSet.has(n.id)).length)
      setDataLoading(false)
    }
    fetchData()
  }, [profile])

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '승인 대기'
  }

  const daysLeft = (deadline: string | null) => {
    if (!deadline) return null
    const diff = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return '마감'
    if (diff === 0) return '오늘 마감'
    return `D-${diff}`
  }

  const getNights = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))

  if (profileLoading || dataLoading) return (
    <div className="max-w-lg mx-auto pt-4">
      <SkeletonHome />
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="fade-slide-up delay-1 rounded-2xl px-6 py-5 mb-4 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1B3FAB 0%, #2E55C8 100%)',
          boxShadow: '0 8px 32px rgba(27,63,171,0.3)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
        <p className="text-xs mb-1 font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
          안녕하세요
        </p>
        <p className="text-2xl font-black mb-0.5" style={{ color: '#fff' }}>
          {profile?.name}
        </p>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {profile?.generation}기 · {roleLabel[profile?.role ?? 'pending']}
        </p>
      </div>

      {upcomingCamp && (
        <a href={`/camp/${upcomingCamp.id}`}
          className="fade-slide-up delay-2 block rounded-2xl p-5 mb-4 card-hover btn-press"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--accent-blue)' }}>다음 합숙</span>
            {upcomingCamp.deadline && (
              <span className="text-xs font-bold" style={{ color: '#FFD700' }}>
                신청 {daysLeft(upcomingCamp.deadline)}
              </span>
            )}
          </div>
          <p className="text-lg font-black mb-2" style={{ color: 'var(--text-primary)' }}>
            {upcomingCamp.title}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {upcomingCamp.start_date} — {upcomingCamp.end_date}
            {upcomingCamp.location && ` · ${upcomingCamp.location}`}
            {` · ${getNights(upcomingCamp.start_date, upcomingCamp.end_date)}박`}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: upcomingCamp.is_open ? 'rgba(46,204,113,0.15)' : 'rgba(255,255,255,0.06)',
                color: upcomingCamp.is_open ? 'var(--accent-green)' : 'var(--text-hint)',
              }}>
              {upcomingCamp.is_open ? '신청 중' : '신청 마감'}
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--accent-blue)' }}>자세히 →</span>
          </div>
        </a>
      )}

      {finance && (
        <a href="/finance"
          className="fade-slide-up delay-3 block rounded-2xl p-5 mb-5 card-hover btn-press"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--text-tertiary)' }}>2026-27 재무 현황</p>
            <span className="text-xs font-bold" style={{ color: 'var(--text-hint)' }}>자세히 →</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>수입</p>
              <p className="text-base font-black" style={{ color: 'var(--accent-blue)' }}>
                {(finance.totalIncome / 10000).toFixed(0)}만
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>지출</p>
              <p className="text-base font-black" style={{ color: 'var(--accent-red)' }}>
                {(finance.totalExpense / 10000).toFixed(0)}만
              </p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>잔액</p>
              <p className="text-base font-black"
                style={{ color: finance.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {(finance.balance / 10000).toFixed(0)}만
              </p>
            </div>
          </div>
          <div className="mt-3 h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full"
              style={{
                width: `${Math.min((finance.totalExpense / finance.totalIncome) * 100 || 0, 100)}%`,
                background: 'var(--ski-blue)',
              }} />
          </div>
        </a>
      )}

      <div className="fade-slide-up delay-4 grid grid-cols-4 gap-2.5">
        {[
          { label: '공지', href: '/notices', badge: unreadCount, color: 'var(--accent-blue)' },
          { label: '합숙', href: '/camp', badge: 0, color: 'var(--accent-purple)' },
          { label: '행사', href: '/events', badge: 0, color: 'var(--accent-green)' },
          { label: '동문', href: '/members', badge: 0, color: 'var(--accent-orange)' },
        ].map(item => (
          <a key={item.label} href={item.href}
            className="relative flex flex-col items-center gap-2 py-4 rounded-2xl card-hover btn-press"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
            {item.badge > 0 && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                style={{ background: '#E24B4A' }}>
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `${item.color}20` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
            </div>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {item.label}
            </span>
          </a>
        ))}
      </div>
    </main>
  )
}
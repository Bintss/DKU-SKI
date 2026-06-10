'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = {
  name: string
  generation: number
  role: string
  join_type: string
}

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
  const [profile, setProfile] = useState<Profile | null>(null)
  const [upcomingCamp, setUpcomingCamp] = useState<Camp | null>(null)
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const today = new Date().toISOString().split('T')[0]
      const { data: noticeData } = await supabase.from('notices').select('id')
const { data: readData } = await supabase.from('notice_reads').select('notice_id').eq('user_id', user.id)
const readSet = new Set(readData?.map(r => r.notice_id) ?? [])
const unread = (noticeData ?? []).filter(n => !readSet.has(n.id)).length
setUnreadCount(unread)
      const [{ data: profileData }, { data: campData }, { data: financeData }] =
        await Promise.all([
          supabase.from('profiles').select('name, generation, role, join_type').eq('id', user.id).single(),
          supabase.from('camps').select('*').gte('end_date', today).order('start_date').limit(1).single(),
          supabase.from('finance').select('amount, type').eq('season', '2026-27'),
        ])

      setProfile(profileData)
      setUpcomingCamp(campData)

      if (financeData) {
        const totalIncome = financeData.filter((r: any) => r.type === 'income').reduce((s: number, r: any) => s + r.amount, 0)
        const totalExpense = financeData.filter((r: any) => r.type === 'expense').reduce((s: number, r: any) => s + Math.abs(r.amount), 0)
        setFinance({ totalIncome, totalExpense, balance: totalIncome - totalExpense })
      }

      setLoading(false)
    }
    fetchData()
  }, [])

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--gray-400)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {/* 프로필 카드 */}
      <div className="rounded-2xl px-6 py-5 mb-5 text-white"
        style={{ background: 'linear-gradient(135deg, var(--ski-blue) 0%, var(--ski-blue-light) 100%)' }}
      >
        <p className="text-blue-200 text-xs mb-1">안녕하세요 👋</p>
        <p className="text-xl font-bold mb-0.5">{profile?.name}</p>
        <p className="text-blue-200 text-sm">
          {profile?.generation}기 · {roleLabel[profile?.role ?? 'pending']}
        </p>
      </div>

      {/* 다음 합숙 카드 */}
      {upcomingCamp && (
        <a href={`/camp/${upcomingCamp.id}`}
          className="block rounded-2xl p-5 mb-5 border border-blue-100 hover:border-blue-300 transition-colors"
          style={{ background: 'var(--ski-blue-50)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: 'var(--ski-blue)' }}>다음 합숙</p>
            {upcomingCamp.deadline && (
              <span className="text-xs font-medium text-orange-500">
                신청 {daysLeft(upcomingCamp.deadline)}
              </span>
            )}
          </div>
          <p className="font-semibold text-gray-800 mb-1">{upcomingCamp.title}</p>
          <p className="text-sm text-gray-500">
            📅 {upcomingCamp.start_date} ~ {upcomingCamp.end_date}
          </p>
          {upcomingCamp.location && (
            <p className="text-sm text-gray-500">📍 {upcomingCamp.location}</p>
          )}
          <div className="mt-3 flex items-center justify-between">
            <span className={`text-xs px-2.5 py-1 rounded-full ${
              upcomingCamp.is_open ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
            }`}>
              {upcomingCamp.is_open ? '신청 중' : '신청 마감'}
            </span>
            <span className="text-xs" style={{ color: 'var(--ski-blue)' }}>자세히 보기 →</span>
          </div>
        </a>
      )}

      {/* 재무 요약 */}
      {finance && (
        <a href="/finance"
          className="block rounded-2xl p-5 mb-5 bg-white border hover:border-gray-300 transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-gray-500">2026-27 재무 현황</p>
            <span className="text-xs text-gray-400">자세히 →</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">수입</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ski-blue)' }}>
                {(finance.totalIncome / 10000).toFixed(0)}만원
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">지출</p>
              <p className="text-sm font-semibold text-red-500">
                {(finance.totalExpense / 10000).toFixed(0)}만원
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">잔액</p>
              <p className={`text-sm font-semibold ${finance.balance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {(finance.balance / 10000).toFixed(0)}만원
              </p>
            </div>
          </div>
        </a>
      )}

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
  { icon: '📢', label: '공지사항', href: '/notices', badge: unreadCount },
  { icon: '🏔', label: '합숙', href: '/camp', badge: 0 },
  { icon: '📅', label: '행사', href: '/events', badge: 0 },
  { icon: '👥', label: '동문', href: '/members', badge: 0 },
].map(item => (
  <a
    key={item.label}
    href={item.href}
    className="relative flex flex-col items-center gap-2 py-4 rounded-2xl bg-white border hover:border-gray-300 transition-colors"
  >
    {item.badge > 0 && (
      <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
        {item.badge > 9 ? '9+' : item.badge}
      </span>
    )}
    <span className="text-2xl">{item.icon}</span>
    <span className="text-xs text-gray-600 font-medium">{item.label}</span>
  </a>
))}
      </div>

    </main>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
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

type FinanceRow = { amount: number; type: string }

type Post = {
  id: string
  title: string
  content: string
  channel: string
  is_anonymous: boolean
  created_at: string
  profiles: { name: string } | null
  comment_count: number
}

const CHANNEL_LABEL: Record<string, string> = {
  free: '자유', student: '재학생', ob: 'OB'
}

export default function HomePage() {
  const { profile, loading: profileLoading } = useProfile()
  const [upcomingCamp, setUpcomingCamp] = useState<Camp | null>(null)
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unpaidCount, setUnpaidCount] = useState(0)
  const [myCampDday, setMyCampDday] = useState<number | null>(null)
  const [recentPosts, setRecentPosts] = useState<Post[]>([])
  const [dataLoading, setDataLoading] = useState(true)
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
        { data: settlementData },
        { data: postsData },
        { data: myParticipations },
      ] = await Promise.all([
        supabase.from('camps').select('*').gte('end_date', today).order('start_date').limit(1).single(),
        supabase.from('finance').select('amount, type').eq('season', '2026-27'),
        supabase.from('notices').select('id'),
        supabase.from('notice_reads').select('notice_id').eq('user_id', profile.id),
        supabase.from('settlement_items').select('id').eq('user_id', profile.id).in('status', ['unpaid', 'pending']),
        supabase.from('posts')
          .select('id, title, content, channel, is_anonymous, created_at, profiles(name), comments(id)')
          .order('created_at', { ascending: false })
          .limit(3),
        supabase.from('camp_participants')
          .select('join_date, camps(start_date)')
          .eq('user_id', profile.id)
          .gte('join_date', today)
          .order('join_date', { ascending: true })
          .limit(1),
      ])

      setUpcomingCamp(campData)

      if (financeData) {
        const rows = financeData as FinanceRow[]
        const totalIncome = rows.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0)
        const totalExpense = rows.filter(r => r.type === 'expense').reduce((s, r) => s + Math.abs(r.amount), 0)
        setFinance({ totalIncome, totalExpense, balance: totalIncome - totalExpense })
      }

      const readSet = new Set(readData?.map(r => r.notice_id) ?? [])
      setUnreadCount((noticeData ?? []).filter(n => !readSet.has(n.id)).length)
      setUnpaidCount(settlementData?.length ?? 0)

      if (myParticipations && myParticipations.length > 0) {
        const nextJoinDate = myParticipations[0].join_date
        const diff = Math.ceil(
          (new Date(nextJoinDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        )
        setMyCampDday(diff)
      } else {
        setMyCampDday(null)
      }

      const postsWithCount = (postsData ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        content: p.content,
        channel: p.channel,
        is_anonymous: p.is_anonymous,
        created_at: p.created_at,
        profiles: p.profiles,
        comment_count: p.comments?.length ?? 0,
      }))
      setRecentPosts(postsWithCount)

      setDataLoading(false)
    }

    fetchData()

    // 페이지가 다시 보여질 때마다 재조회 (뒤로가기/스와이프백 포함)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchData()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', fetchData)
    window.addEventListener('pageshow', fetchData)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', fetchData)
      window.removeEventListener('pageshow', fetchData)
    }
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

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMin = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    if (diffMin < 1) return '방금'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}시간 전`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `${diffD}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  const getAuthorName = (post: Post) => {
    if (!post.is_anonymous) return post.profiles?.name ?? '알 수 없음'
    if (profile?.role === 'admin') return `${post.profiles?.name} (익명)`
    return '익명'
  }

  if (profileLoading || dataLoading) return (
    <div className="max-w-lg mx-auto pt-4">
      <SkeletonHome />
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {/* 인사 카드 — 클릭 시 프로필로 이동 */}
      <a href="/profile"
        className="fade-slide-up delay-1 block rounded-2xl px-6 py-5 mb-4 relative overflow-hidden card-hover btn-press"
        style={{
          background: 'linear-gradient(135deg, #1B3FAB 0%, #2E55C8 100%)',
          boxShadow: '0 8px 32px rgba(27,63,171,0.3)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(30%, -30%)' }} />
        <div className="flex items-center justify-between relative">
          <div>
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
          {myCampDday !== null && (
            <div className="text-center flex-shrink-0 rounded-2xl px-4 py-2.5"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              <p className="text-xl font-black" style={{ color: '#fff', lineHeight: 1 }}>
                {myCampDday === 0 ? 'D-DAY' : myCampDday > 0 ? `D-${myCampDday}` : '진행중'}
              </p>
              <p className="text-[9px] mt-1 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.55)' }}>
                용평가는날!
              </p>
            </div>
          )}
        </div>
      </a>

      {/* 다음 합숙 카드 */}
      {upcomingCamp && (
        <a href={`/camp/${upcomingCamp.id}`}
          className="fade-slide-up delay-2 block rounded-2xl p-5 mb-4 card-hover btn-press"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--accent-blue)' }}>다음 합숙</span>
            {upcomingCamp.deadline && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700' }}>
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

      {/* 재무 요약 카드 */}
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

      {/* 메뉴 그리드 — 공지/행사/동문/정산 */}
      <div className="fade-slide-up delay-4 grid grid-cols-4 gap-2 mb-5">
        {[
          {
            label: '공지', href: '/notices', badge: unreadCount,
            bg: 'rgba(27,63,171,0.18)', stroke: '#7FA4FF',
            icon: <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
          },
          {
            label: '행사', href: '/events', badge: 0,
            bg: 'rgba(46,204,113,0.16)', stroke: '#6FE39B',
            icon: <path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M12 14l1.5 1.5L16 13" />,
          },
          {
            label: '동문', href: '/members', badge: 0,
            bg: 'rgba(230,126,34,0.16)', stroke: '#F2A35C',
            icon: <><circle cx="9" cy="7" r="3.2" /><path d="M3.5 20c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6" /><circle cx="17.5" cy="8" r="2.4" /><path d="M15.3 13.2c2.4.3 4.2 2.4 4.2 5.3" /></>,
          },
          {
            label: '정산', href: '/settlement', badge: unpaidCount,
            bg: 'rgba(240,149,149,0.18)', stroke: '#F09595',
            icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="12" cy="14.5" r="2" /></>,
          },
        ].map(item => (
          <a key={item.label} href={item.href}
            className="relative flex flex-col items-center gap-2 py-3.5 rounded-2xl card-hover btn-press"
            style={{
              background: item.badge > 0 ? 'rgba(242,48,48,0.08)' : 'var(--bg-card)',
              border: item.badge > 0
                ? '0.5px solid rgba(240,149,149,0.25)'
                : '0.5px solid var(--border-primary)',
            }}>
            {item.badge > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: '#E24B4A' }}>
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: item.bg }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke={item.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
            </div>
            <span className="text-xs font-semibold"
              style={{ color: item.badge > 0 ? '#F5B5B5' : 'var(--text-secondary)' }}>
              {item.label}
            </span>
          </a>
        ))}
      </div>

      {/* 커뮤니티 미리보기 카드 */}
      <div className="fade-slide-up delay-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black tracking-widest uppercase"
            style={{ color: 'var(--text-hint)' }}>커뮤니티</p>
          <a href="/community" className="text-xs font-bold" style={{ color: 'var(--accent-blue)' }}>
            전체보기 →
          </a>
        </div>

        {recentPosts.length === 0 ? (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
            <p className="text-sm" style={{ color: 'var(--text-hint)' }}>
              아직 게시글이 없어요
            </p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
            {recentPosts.map((post, i) => (
              <a key={post.id} href={`/community/${post.id}`}
                className="block px-5 py-4 card-hover"
                style={{
                  borderBottom: i !== recentPosts.length - 1
                    ? '0.5px solid var(--border-primary)' : 'none',
                }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'rgba(27,63,171,0.2)', color: 'var(--accent-blue)' }}>
                    {CHANNEL_LABEL[post.channel] ?? post.channel}
                  </span>
                  <span className="text-xs truncate" style={{ color: 'var(--text-hint)' }}>
                    {getAuthorName(post)}
                  </span>
                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-hint)' }}>
                    · {formatRelativeTime(post.created_at)}
                  </span>
                </div>
                <p className="text-sm font-bold mb-0.5 truncate" style={{ color: 'var(--text-primary)' }}>
                  {post.title}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs truncate flex-1" style={{ color: 'var(--text-tertiary)' }}>
                    {post.content}
                  </p>
                  {post.comment_count > 0 && (
                    <span className="text-xs font-bold ml-2 flex-shrink-0" style={{ color: 'var(--text-hint)' }}>
                      댓글 {post.comment_count}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { SkeletonHome } from '@/components/Skeleton'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'
import { getTransactionType } from '@/lib/finance-codes'

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
  lastUpdatedAt: string | null
}

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

const SEASON = '2026-27'

export default function HomePage() {
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [upcomingCamp, setUpcomingCamp] = useState<Camp | null>(null)
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [recentPosts, setRecentPosts] = useState<Post[]>([])
  const [publicLoading, setPublicLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unpaidCount, setUnpaidCount] = useState(0)
  const [myCampDday, setMyCampDday] = useState<number | null>(null)

  const fetchPublicData = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [{ data: campData }, { data: txData }, { data: postsData }] = await Promise.all([
      supabase.from('camps').select('*').gte('end_date', today).order('start_date').limit(1).single(),
      supabase
        .from('finance_transactions')
        .select('amount, account_code, traded_at')
        .eq('season', SEASON)
        .eq('status', 'classified')
        .eq('is_deposit_transfer', false)
        .not('account_code', 'in', '(999,998)')
        .order('traded_at', { ascending: false }),
      supabase
        .from('posts')
        .select('id, title, content, channel, is_anonymous, created_at, profiles(name), comments(id)')
        .order('created_at', { ascending: false })
        .limit(3),
    ])

    setUpcomingCamp(campData)

    if (txData && txData.length > 0) {
      const rows = txData as { amount: number; account_code: string | null; traded_at: string }[]
      const totalIncome = rows
        .filter(r => r.account_code && getTransactionType(r.account_code, r.amount) === 'income')
        .reduce((s, r) => s + r.amount, 0)
      const totalExpense = rows
        .filter(r => r.account_code && getTransactionType(r.account_code, r.amount) === 'expense')
        .reduce((s, r) => s + Math.abs(r.amount), 0)
      setFinance({
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        lastUpdatedAt: rows[0].traded_at,
      })
    } else {
      setFinance(null)
    }

    setRecentPosts((postsData ?? []).map((p: any) => ({
      id: p.id, title: p.title, content: p.content, channel: p.channel,
      is_anonymous: p.is_anonymous, created_at: p.created_at, profiles: p.profiles,
      comment_count: p.comments?.length ?? 0,
    })))
    setPublicLoading(false)
  }, [supabase])

  const fetchPersonalData = useCallback(async () => {
    if (!profile) return
    const today = new Date().toISOString().split('T')[0]
    const [{ data: noticeData }, { data: readData }, { data: settlementData }, { data: myParticipations }] =
      await Promise.all([
        supabase.from('notices').select('id'),
        supabase.from('notice_reads').select('notice_id').eq('user_id', profile.id),
        supabase.from('settlement_items').select('id').eq('user_id', profile.id).in('status', ['unpaid', 'pending']),
        supabase.from('camp_participants')
          .select('join_date, camps(start_date)')
          .eq('user_id', profile.id)
          .gte('join_date', today)
          .order('join_date', { ascending: true })
          .limit(1),
      ])

    const readSet = new Set(readData?.map(r => r.notice_id) ?? [])
    setUnreadCount((noticeData ?? []).filter(n => !readSet.has(n.id)).length)
    setUnpaidCount(settlementData?.length ?? 0)

    if (myParticipations && myParticipations.length > 0) {
      const diff = Math.ceil(
        (new Date(myParticipations[0].join_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      setMyCampDday(diff)
    } else {
      setMyCampDday(null)
    }
  }, [profile, supabase])

  useEffect(() => { fetchPublicData() }, [fetchPublicData])
  useEffect(() => { if (profile) fetchPersonalData() }, [profile, fetchPersonalData])
  usePageVisibilityRefetch(fetchPublicData)
  usePageVisibilityRefetch(fetchPersonalData, { enabled: !!profile })

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
    const diffMin = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60))
    if (diffMin < 1) return '방금'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}시간 전`
    const diffD = Math.floor(diffH / 24)
    if (diffD < 7) return `${diffD}일 전`
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
  }

  const formatLastUpdated = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }) + ' 기준'

  const getAuthorName = (post: Post) => {
    if (!post.is_anonymous) return post.profiles?.name ?? '알 수 없음'
    if (profile?.role === 'admin') return `${post.profiles?.name} (익명)`
    return '익명'
  }

  if (profileLoading || publicLoading) return (
    <div className="max-w-lg mx-auto pt-4"><SkeletonHome /></div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">

      {/* 인사 카드 */}
      <a href="/profile"
        className="fade-slide-up delay-1 block rounded-2xl px-6 py-5 mb-4 relative overflow-hidden card-hover btn-press"
        style={{
          background: 'linear-gradient(135deg, var(--dku-blue-primary) 0%, var(--dku-blue) 100%)',
          boxShadow: 'var(--shadow-blue)',
        }}>
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', transform: 'translate(30%, -30%)' }} />
        <div className="flex items-center justify-between relative">
          <div>
            <p className="text-xs mb-1 font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
              안녕하세요
            </p>
            <p className="text-2xl font-black mb-0.5" style={{ color: '#fff' }}>
              {profile?.name}
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {profile?.generation}기 · {roleLabel[profile?.role ?? 'pending']}
            </p>
          </div>
          {myCampDday !== null && (
            <div className="text-center flex-shrink-0 rounded-xl px-4 py-2.5"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              <p className="text-xl font-black" style={{ color: '#fff', lineHeight: 1 }}>
                {myCampDday === 0 ? 'D-DAY' : myCampDday > 0 ? `D-${myCampDday}` : '진행중'}
              </p>
              <p className="text-[10px] mt-1 whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.5)' }}>
                신청한 합숙
              </p>
            </div>
          )}
        </div>
      </a>

      {/* 다음 합숙 카드 */}
      {upcomingCamp && (
        <a href={`/camp/${upcomingCamp.id}`}
          className="fade-slide-up delay-2 block rounded-2xl p-5 mb-4 card-hover btn-press"
          style={{
            background: '#fff',
            border: '1px solid var(--border-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--dku-blue)' }}>다음 합숙</span>
            {upcomingCamp.deadline && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(202,138,10,0.1)', color: 'var(--accent-yellow)' }}>
                신청 {daysLeft(upcomingCamp.deadline)}
              </span>
            )}
          </div>
          <p className="text-lg font-black mb-1.5" style={{ color: 'var(--text-primary)' }}>
            {upcomingCamp.title}
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
            {upcomingCamp.start_date} — {upcomingCamp.end_date}
            {upcomingCamp.location && ` · ${upcomingCamp.location}`}
            {getNights(upcomingCamp.start_date, upcomingCamp.end_date) > 0 &&
              ` · ${getNights(upcomingCamp.start_date, upcomingCamp.end_date)}박`}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{
                background: upcomingCamp.is_open ? 'rgba(22,163,74,0.1)' : 'var(--surface-low)',
                color: upcomingCamp.is_open ? 'var(--accent-green)' : 'var(--text-hint)',
              }}>
              {upcomingCamp.is_open ? '신청 중' : '신청 마감'}
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--dku-blue)' }}>자세히 →</span>
          </div>
        </a>
      )}

      {/* 재무 요약 카드 */}
      {finance && (
        <a href="/finance"
          className="fade-slide-up delay-3 block rounded-2xl p-5 mb-5 card-hover btn-press"
          style={{
            background: '#fff',
            border: '1px solid var(--border-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-black tracking-widest uppercase"
                style={{ color: 'var(--text-tertiary)' }}>{SEASON} 재무 현황</p>
              {finance.lastUpdatedAt && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                  {formatLastUpdated(finance.lastUpdatedAt)}
                </p>
              )}
            </div>
            <span className="text-xs font-bold" style={{ color: 'var(--text-hint)' }}>자세히 →</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: '수입', value: finance.totalIncome, color: 'var(--dku-blue)' },
              { label: '지출', value: finance.totalExpense, color: 'var(--accent-red)' },
              {
                label: '잔액',
                value: finance.balance,
                color: finance.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
              },
            ].map(item => (
              <div key={item.label}>
                <p className="text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>{item.label}</p>
                <p className="text-base font-black" style={{ color: item.color }}>
                  {(Math.abs(item.value) / 10000).toFixed(0)}만
                </p>
              </div>
            ))}
          </div>
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-low)' }}>
            <div className="h-full rounded-full"
              style={{
                width: `${Math.min(finance.totalIncome > 0
                  ? (finance.totalExpense / finance.totalIncome) * 100 : 0, 100)}%`,
                background: 'var(--dku-blue-primary)',
              }} />
          </div>
        </a>
      )}

      {/* 메뉴 그리드 */}
      <div className="fade-slide-up delay-4 grid grid-cols-4 gap-2 mb-5">
        {[
          {
            label: '공지', href: '/notices', badge: unreadCount,
            bg: 'rgba(0,60,117,0.08)', stroke: 'var(--dku-blue)',
            icon: <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />,
          },
          {
            label: '행사', href: '/events', badge: 0,
            bg: 'rgba(22,163,74,0.08)', stroke: 'var(--accent-green)',
            icon: <path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M12 14l1.5 1.5L16 13" />,
          },
          {
            label: '동문', href: '/members', badge: 0,
            bg: 'rgba(217,119,6,0.08)', stroke: 'var(--accent-orange)',
            icon: <><circle cx="9" cy="7" r="3.2" /><path d="M3.5 20c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6" /><circle cx="17.5" cy="8" r="2.4" /><path d="M15.3 13.2c2.4.3 4.2 2.4 4.2 5.3" /></>,
          },
          {
            label: '정산', href: '/settlement', badge: unpaidCount,
            bg: 'rgba(220,38,38,0.08)', stroke: 'var(--accent-red)',
            icon: <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18" /><circle cx="12" cy="14.5" r="2" /></>,
          },
        ].map(item => (
          <a key={item.label} href={item.href}
            className="relative flex flex-col items-center gap-2 py-3.5 rounded-2xl card-hover btn-press"
            style={{
              background: '#fff',
              border: `1px solid ${item.badge > 0 ? 'rgba(220,38,38,0.2)' : 'var(--border-primary)'}`,
              boxShadow: 'var(--shadow-sm)',
            }}>
            {item.badge > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: 'var(--accent-red)' }}>
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
            <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
              {item.label}
            </span>
          </a>
        ))}
      </div>

      {/* 커뮤니티 미리보기 */}
      <div className="fade-slide-up delay-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-black tracking-widest uppercase"
            style={{ color: 'var(--text-hint)' }}>커뮤니티</p>
          <a href="/community" className="text-xs font-bold"
            style={{ color: 'var(--dku-blue)' }}>전체보기 →</a>
        </div>

        {recentPosts.length === 0 ? (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: '#fff', border: '1px solid var(--border-primary)' }}>
            <p className="text-sm" style={{ color: 'var(--text-hint)' }}>아직 게시글이 없어요</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden"
            style={{
              background: '#fff',
              border: '1px solid var(--border-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}>
            {recentPosts.map((post, i) => (
              <a key={post.id} href={`/community/${post.id}`}
                className="block px-5 py-4 card-hover"
                style={{
                  borderBottom: i !== recentPosts.length - 1
                    ? '1px solid var(--border-primary)' : 'none',
                }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
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
                    <span className="text-xs font-bold ml-2 flex-shrink-0"
                      style={{ color: 'var(--text-hint)' }}>
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
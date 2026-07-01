'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

const NAV_ITEMS = [
  { href: '/home',       label: '홈' },
  { href: '/notices',    label: '공지사항' },
  { href: '/camp',       label: '합숙' },
  { href: '/events',     label: '행사' },
  { href: '/settlement', label: '정산' },
  { href: '/members',    label: '동문 찾기' },
  { href: '/community',  label: '커뮤니티' },
  { href: '/finance',    label: '재무 공시' },
]

type DrawerProps = {
  open: boolean
  onClose: () => void
}

export default function Drawer({ open, onClose }: DrawerProps) {
  const [unreadNotices, setUnreadNotices] = useState(0)
  const [unpaidSettlements, setUnpaidSettlements] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useProfile()
  const supabase = createClient()

  const fetchBadges = useCallback(async () => {
    if (!profile) return
    const [{ data: noticeData }, { data: readData }, { data: settlementData }] =
      await Promise.all([
        supabase.from('notices').select('id'),
        supabase.from('notice_reads').select('notice_id').eq('user_id', profile.id),
        supabase.from('settlement_items')
          .select('id')
          .eq('user_id', profile.id)
          .in('status', ['unpaid', 'pending']),
      ])

    const readSet = new Set(readData?.map(r => r.notice_id) ?? [])
    setUnreadNotices((noticeData ?? []).filter(n => !readSet.has(n.id)).length)
    setUnpaidSettlements(settlementData?.length ?? 0)
  }, [profile, supabase])

  useEffect(() => { fetchBadges() }, [fetchBadges])

  useEffect(() => {
    if (!profile) return
    const channel = supabase
      .channel('drawer-badge-changes')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'settlement_items',
        filter: `user_id=eq.${profile.id}`,
      }, () => fetchBadges())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notices',
      }, () => fetchBadges())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [profile, fetchBadges, supabase])

  usePageVisibilityRefetch(fetchBadges, { enabled: !!profile, debounceMs: 2000 })
  useEffect(() => { if (open) fetchBadges() }, [open, fetchBadges])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getBadge = (href: string) => {
    if (href === '/notices') return unreadNotices
    if (href === '/settlement') return unpaidSettlements
    return 0
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{
            background: 'rgba(0,30,60,0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <div
        className="fixed top-0 left-0 h-full z-50 flex flex-col"
        style={{
          width: 260,
          background: '#FFFFFF',
          borderRight: '1px solid var(--border-primary)',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.08)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* 프로필 헤더 */}
        <div
          className="px-5 pt-14 pb-5"
          style={{
            background: 'linear-gradient(135deg, var(--dku-blue-primary) 0%, var(--dku-blue) 100%)',
          }}>
          <div className="flex items-center justify-between">
            {profile && (
              <div>
                <p className="text-base font-black" style={{ color: '#fff' }}>
                  {profile.name}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {profile.generation}기 · {
                    profile.role === 'admin' ? '운영진'
                    : profile.role === 'ob' ? 'OB'
                    : '부원'
                  }
                </p>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full btn-press"
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: 14,
              }}>
              ✕
            </button>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = pathname.startsWith(item.href)
            const badge = getBadge(item.href)
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl mb-0.5 transition-colors"
                style={{
                  background: isActive ? 'var(--ski-blue-50)' : 'transparent',
                  color: isActive ? 'var(--dku-blue-primary)' : 'var(--text-secondary)',
                }}
              >
                <span className="text-sm font-bold">{item.label}</span>
                {badge > 0 && (
                  <span
                    className="min-w-5 h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: 'var(--accent-red)' }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </a>
            )
          })}

          {/* 운영진 섹션 */}
          {profile?.role === 'admin' && (
            <>
              <div className="mx-4 my-3 h-px"
                style={{ background: 'var(--border-primary)' }} />
              <p className="px-4 mb-1.5 text-xs font-black tracking-widest uppercase"
                style={{ color: 'var(--text-hint)' }}>운영진</p>
              {[
                { href: '/admin/members',   label: '회원 관리' },
                { href: '/camp/new',         label: '합숙 등록' },
                { href: '/admin/events/new', label: '행사 등록' },
                { href: '/admin/finance',    label: '재무 관리' },
                { href: '/admin/settings',   label: '스키부 운영 설정' },
              ].map(item => (
                <a key={item.href} href={item.href}
                  onClick={onClose}
                  className="flex items-center px-4 py-2.5 rounded-xl mb-0.5 text-sm font-bold transition-colors"
                  style={{
                    background: pathname === item.href
                      ? 'rgba(217,119,6,0.08)' : 'transparent',
                    color: pathname === item.href
                      ? 'var(--accent-orange)' : 'var(--text-tertiary)',
                  }}>
                  {item.label}
                </a>
              ))}
            </>
          )}
        </nav>

        {/* 하단 */}
        <div className="px-3 pb-8 pt-3"
          style={{ borderTop: '1px solid var(--border-primary)' }}>
          <a href="/profile" onClick={onClose}
            className="flex items-center px-4 py-2.5 rounded-xl mb-0.5 transition-colors"
            style={{
              background: pathname === '/profile' ? 'var(--ski-blue-50)' : 'transparent',
              color: pathname === '/profile'
                ? 'var(--dku-blue-primary)' : 'var(--text-secondary)',
            }}>
            <span className="text-sm font-bold">내 프로필</span>
          </a>
          <button onClick={handleLogout}
            className="w-full flex items-center px-4 py-2.5 rounded-xl text-sm font-bold btn-press"
            style={{ color: 'var(--accent-red)' }}>
            로그아웃
          </button>
        </div>
      </div>
    </>
  )
}
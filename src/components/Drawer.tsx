'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

type Profile = {
  name: string
  generation: number
  role: string
  avatar_url: string | null
}

const NAV_ITEMS = [
  { href: '/home', label: '홈' },
  { href: '/notices', label: '공지사항' },
  { href: '/camp', label: '합숙' },
  { href: '/events', label: '행사' },
  { href: '/settlement', label: '정산하기' },
  { href: '/members', label: '동문 디렉토리' },
  { href: '/community', label: '커뮤니티' },
]

const ADMIN_ITEMS = [
  { href: '/admin/members', label: '회원 관리' },
  { href: '/notices/new', label: '공지 작성' },
  { href: '/camp/new', label: '합숙 등록' },
  { href: '/admin/events/new', label: '행사 등록' },
]

export default function Drawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('name, generation, role, avatar_url')
        .eq('id', user.id)
        .single()
      setProfile(data)
    }
    if (open) fetchProfile()
  }, [open])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    onClose()
  }

  const handleNav = (href: string) => {
    router.push(href)
    onClose()
  }

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '승인 대기'
  }

  return (
    <>
      {/* 오버레이 */}
      <div
        className={`fixed inset-0 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{
          background: 'rgba(0,0,0,0.7)',
          opacity: open ? 1 : 0,
          transition: mounted ? 'opacity 0.3s ease-out' : 'none',
        }}
        onClick={onClose}
      />

      {/* 드로어 */}
      <div
        className="fixed top-0 left-0 h-full w-72 z-50 flex flex-col"
        style={{
          background: '#16161E',
          borderRight: '0.5px solid rgba(255,255,255,0.08)',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: mounted
            ? open
              ? 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)'
              : 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)'
            : 'none',
          willChange: mounted ? 'transform' : 'auto',
        }}
      >
        {/* 헤더 */}
        <div className="px-6 pt-12 pb-6"
          style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3 mb-4">
            <img src="/icon-192x192.png" alt="로고" className="w-10 h-10 rounded-xl opacity-90" />
            <div>
              <p className="font-black text-base" style={{ color: 'var(--text-primary)' }}>
                단국대 스키부
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>40주년 기념</p>
            </div>
          </div>

          {profile && (
            <div className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)' }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: 'var(--ski-blue)' }}>
                  {profile.name[0]}
                </div>
              )}
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {profile.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {profile.generation}기 · {roleLabel[profile.role]}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                className="w-full flex items-center px-4 py-3 rounded-xl mb-1 text-left text-sm font-semibold transition-colors"
                style={{
                  background: isActive ? 'rgba(27,63,171,0.3)' : 'transparent',
                  color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: isActive ? '0.5px solid rgba(27,63,171,0.4)' : '0.5px solid transparent',
                }}
              >
                {item.label}
              </button>
            )
          })}

          {profile?.role === 'admin' && (
            <>
              <div className="px-4 pt-5 pb-2">
                <p className="text-xs font-black tracking-widest uppercase"
                  style={{ color: 'var(--text-hint)' }}>
                  운영진
                </p>
              </div>
              {ADMIN_ITEMS.map(item => (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  className="w-full flex items-center px-4 py-3 rounded-xl mb-1 text-left text-sm font-semibold transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {item.label}
                </button>
              ))}
            </>
          )}
        </nav>

        {/* 하단 */}
        <div className="px-3 py-4" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => handleNav('/profile')}
            className="w-full flex items-center px-4 py-3 rounded-xl text-left text-sm font-semibold mb-1 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            내 프로필
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 rounded-xl text-left text-sm font-semibold transition-colors"
            style={{ color: '#F09595' }}
          >
            로그아웃
          </button>
        </div>
      </div>
    </>
  )
}
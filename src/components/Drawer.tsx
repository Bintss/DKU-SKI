'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

type Profile = {
  name: string
  generation: number
  role: string
}

const NAV_ITEMS = [
  { href: '/home', icon: '🏠', label: '홈' },
  { href: '/camp', icon: '🏔', label: '합숙' },
  { href: '/events', icon: '📅', label: '행사' },
  { href: '/finance', icon: '💰', label: '재무 공시' },
  { href: '/members', icon: '👥', label: '동문 디렉토리' },
  { href: '/community', icon: '💬', label: '커뮤니티' },
]

const ADMIN_ITEMS = [
  { href: '/admin/members', icon: '⚙️', label: '회원 관리' },
]

export default function Drawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('name, generation, role')
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
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={onClose}
      />

      {/* 드로어 */}
      <div className={`fixed top-0 left-0 h-full w-72 z-50 flex flex-col transition-transform duration-300 ease-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
        style={{ background: 'white' }}
      >
        {/* 헤더 */}
        <div className="px-6 pt-12 pb-6" style={{ background: 'var(--ski-blue)' }}>
          <div className="flex items-center gap-3 mb-4">
            <img src="/icon-192x192.png" alt="로고" className="w-10 h-10 rounded-xl" />
            <div>
              <p className="text-white font-bold text-base leading-tight">단국대 스키부</p>
              <p className="text-blue-200 text-xs">40주년 기념</p>
            </div>
          </div>
          {profile && (
            <div className="bg-white/10 rounded-xl px-4 py-3">
              <p className="text-white font-medium text-sm">{profile.name}</p>
              <p className="text-blue-200 text-xs mt-0.5">
                {profile.generation}기 · {roleLabel[profile.role]}
              </p>
            </div>
          )}
        </div>

        {/* 메뉴 */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href ||
              pathname.startsWith(item.href + '/')
            return (
              <button
                key={item.href}
                onClick={() => handleNav(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-left transition-colors ${
                  isActive
                    ? 'text-white font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
                style={isActive ? { background: 'var(--ski-blue)' } : {}}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm">{item.label}</span>
              </button>
            )
          })}

          {/* 운영진 메뉴 */}
          {profile?.role === 'admin' && (
            <>
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">운영진</p>
              </div>
              {ADMIN_ITEMS.map(item => (
                <button
                  key={item.href}
                  onClick={() => handleNav(item.href)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-left text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        {/* 하단 */}
        <div className="px-3 py-4 border-t">
          <button
            onClick={() => handleNav('/profile')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-gray-600 hover:bg-gray-50 transition-colors mb-1"
          >
            <span className="text-lg">👤</span>
            <span className="text-sm">내 프로필</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-400 hover:bg-red-50 transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span className="text-sm">로그아웃</span>
          </button>
        </div>
      </div>
    </>
  )
}
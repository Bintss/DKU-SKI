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

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('name, generation, role, join_type')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">불러오는 중...</p>
    </div>
  )

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '승인 대기'
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold">🎿 단국대학교 스키부</h1>
          <p className="text-sm text-gray-400 mt-0.5">40주년 기념</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          로그아웃
        </button>
      </div>

      {/* 프로필 카드 */}
      <div className="bg-blue-600 text-white rounded-2xl px-6 py-5 mb-6">
        <p className="text-sm opacity-70 mb-1">안녕하세요</p>
        <p className="text-xl font-semibold">{profile?.name} 님</p>
        <p className="text-sm opacity-70 mt-1">
          {profile?.generation}기 · {roleLabel[profile?.role ?? 'pending']}
        </p>
      </div>

      {/* 빠른 메뉴 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: '📢', label: '공지사항', href: '/community' },
          { icon: '💰', label: '재무 공시', href: '/finance' },
          { icon: '📅', label: '행사·합숙', href: '/events' },
          { icon: '👥', label: '동문 디렉토리', href: '/members' },
        ].map(item => (
            <a
            key={item.label}
            href={item.href}
            className="border rounded-xl px-4 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </a>
        ))}
      </div>

      {/* 운영진 전용 메뉴 */}
      {profile?.role === 'admin' && (
        <div className="border border-orange-200 bg-orange-50 rounded-xl px-4 py-4">
          <p className="text-xs font-medium text-orange-600 mb-3">운영진 메뉴</p>
          <div className="flex gap-2">
            <a
              href="/admin/members"
              className="text-xs bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600"
            >
              회원 관리
            </a>
            <a
              href="/admin/finance"
              className="text-xs bg-orange-500 text-white px-3 py-2 rounded-lg hover:bg-orange-600"
            >
              재무 관리
            </a>
          </div>
        </div>
      )}
    </main>
  )
}
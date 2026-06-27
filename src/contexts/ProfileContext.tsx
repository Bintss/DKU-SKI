'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = {
  id: string
  name: string
  generation: number
  role: string
  join_type: string
  student_id: string | null
  bio: string | null
  avatar_url: string | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  phone: string | null
}

type ProfileContextType = {
  profile: Profile | null
  loading: boolean
  refetch: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextType>({
  profile: null,
  loading: true,
  refetch: async () => {},
})

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // 동시 중복 호출 방지 플래그
  const fetchingRef = useRef(false)
  const lastFetchTimeRef = useRef(0)

  const fetchProfile = async (force = false) => {
  if (fetchingRef.current) return

  const now = Date.now()
  if (!force && now - lastFetchTimeRef.current < 3000) return

  fetchingRef.current = true
  lastFetchTimeRef.current = now

  try {
    // 1. 먼저 현재 세션 상태 확인
    const { data: sessionData } = await supabase.auth.getSession()

    if (!sessionData.session) {
      // 세션이 전혀 없으면 로그인 필요
      setProfile(null)
      setLoading(false)
      router.push('/login')
      return
    }

    // 2. 만료 시간 확인 — 만료됐거나 곧 만료되면 명시적으로 갱신
    const expiresAt = sessionData.session.expires_at // unix timestamp (초)
    const nowSeconds = Math.floor(Date.now() / 1000)

    if (expiresAt && expiresAt < nowSeconds + 60) {
      // 만료됨 또는 1분 이내 만료 예정 → 명시적으로 refresh 시도
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError || !refreshData.session) {
        // refresh마저 실패하면 진짜 만료된 것 — 로그인 페이지로
        console.error('Session refresh failed:', refreshError)
        setProfile(null)
        setLoading(false)
        router.push('/login')
        return
      }
    }

    // 3. 갱신된(또는 유효한) 세션으로 사용자 정보 조회
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setProfile(null)
      setLoading(false)
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(data)
    setLoading(false)
  } catch (err) {
    console.error('fetchProfile error:', err)
    setLoading(false)
  } finally {
    fetchingRef.current = false
  }
}

  useEffect(() => {
    fetchProfile(true)

    // 앱이 다시 보일 때 — 디바운스 적용된 fetchProfile 호출
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchProfile()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
    window.addEventListener('pageshow', handleVisibility)

    // Supabase의 onAuthStateChange로 토큰 갱신/로그아웃을 직접 감지
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        router.push('/login')
      }
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        // 토큰이 갱신되면 프로필도 최신화 (디바운스 적용)
        fetchProfile()
      }
    })

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      window.removeEventListener('pageshow', handleVisibility)
      authListener.subscription.unsubscribe()
    }
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, loading, refetch: () => fetchProfile(true) }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
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

// 디바운스 윈도우 — 짧은 시간 내 중복 재조회 방지
const REFETCH_DEBOUNCE_MS = 3000
// 세션 만료 임박 기준 — 이 시간 안에 만료되면 미리 갱신
const REFRESH_THRESHOLD_SEC = 60

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  const fetchingRef = useRef(false)
  const lastFetchTimeRef = useRef(0)

  const fetchProfile = useCallback(async (force = false) => {
    if (fetchingRef.current) return

    const now = Date.now()
    if (!force && now - lastFetchTimeRef.current < REFETCH_DEBOUNCE_MS) return

    fetchingRef.current = true
    lastFetchTimeRef.current = now

    try {
      // 1. 세션 확인 — 로컬 스토리지 기반이라 빠름 (네트워크 요청 아님)
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        setProfile(null)
        setLoading(false)
        router.push('/login')
        return
      }

      let activeUser = sessionData.session.user

      // 2. 만료 임박 시에만 명시적 갱신 (네트워크 요청 1회)
      const expiresAt = sessionData.session.expires_at
      const nowSeconds = Math.floor(Date.now() / 1000)

      if (expiresAt && expiresAt < nowSeconds + REFRESH_THRESHOLD_SEC) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError || !refreshData.session) {
          console.error('Session refresh failed:', refreshError)
          setProfile(null)
          setLoading(false)
          router.push('/login')
          return
        }
        activeUser = refreshData.session.user
      }

      // 3. getUser() 재검증 생략 — session.user를 그대로 사용 (불필요한 서버 왕복 제거)
      //    profiles 조회만 수행 (네트워크 요청 1회)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUser.id)
        .single()

      if (error) {
        console.error('Profile fetch failed:', error)
      }

      setProfile(data)
      setLoading(false)
    } catch (err) {
      console.error('fetchProfile error:', err)
      setLoading(false)
    } finally {
      fetchingRef.current = false
    }
  }, [router, supabase])

  useEffect(() => {
    fetchProfile(true)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchProfile()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
    window.addEventListener('pageshow', handleVisibility)

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        router.push('/login')
      }
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        fetchProfile()
      }
    })

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      window.removeEventListener('pageshow', handleVisibility)
      authListener.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, loading, refetch: () => fetchProfile(true) }}>
      {children}
    </ProfileContext.Provider>
  )
}

export const useProfile = () => useContext(ProfileContext)
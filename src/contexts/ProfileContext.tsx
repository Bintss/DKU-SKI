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
  join_year: number | null
  student_id: string | null
  student_id_status: string | null
  bio: string | null
  avatar_url: string | null
  phone: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  affiliation: string | null
  ski_level: string | null
  equipment: string[] | null
  camp_intent: string | null
  membership_type: string | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  refund_bank_name: string | null
  refund_account_number: string | null
  refund_account_holder: string | null
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

const REFETCH_DEBOUNCE_MS = 3000
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
      const { data: sessionData } = await supabase.auth.getSession()

      if (!sessionData.session) {
        setProfile(null)
        setLoading(false)
        router.push('/login')
        return
      }

      let activeUser = sessionData.session.user
      const expiresAt = sessionData.session.expires_at
      const nowSeconds = Math.floor(Date.now() / 1000)

      if (expiresAt && expiresAt < nowSeconds + REFRESH_THRESHOLD_SEC) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError || !refreshData.session) {
          setProfile(null)
          setLoading(false)
          router.push('/login')
          return
        }
        activeUser = refreshData.session.user
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUser.id)
        .single()

      if (error) console.error('Profile fetch failed:', error)

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
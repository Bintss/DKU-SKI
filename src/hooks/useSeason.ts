import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export function useSeason() {
  const [season, setSeason] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchSeason = async () => {
      const { data } = await supabase
        .from('club_settings')
        .select('current_season')
        .eq('id', 1)
        .single()
      setSeason(data?.current_season ?? '2026-27')
      setLoading(false)
    }
    fetchSeason()
  }, [])

  return { season, loading }
}
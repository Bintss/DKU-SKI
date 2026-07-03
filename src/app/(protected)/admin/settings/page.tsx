'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

export default function AdminSettingsPage() {
  const { profile, loading: profileLoading } = useProfile()
  const router = useRouter()
  const supabase = createClient()

  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [patrolPhone, setPatrolPhone] = useState('')
  const [captainName, setCaptainName] = useState('')
  const [captainPhone, setCaptainPhone] = useState('')
  const [coachName, setCoachName] = useState('')
  const [coachPhone, setCoachPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)

  const inputStyle = {
    background: '#fff',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  }

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'admin') { router.push('/home'); return }
    const fetchSettings = async () => {
      const { data } = await supabase.from('club_settings').select('*').eq('id', 1).single()
      if (data) {
        setBankName(data.bank_name ?? '')
        setAccountNumber(data.account_number ?? '')
        setAccountHolder(data.account_holder ?? '')
        setPatrolPhone(data.patrol_phone ?? '')
        setCaptainName(data.captain_name ?? '')
        setCaptainPhone(data.captain_phone ?? '')
        setCoachName(data.coach_name ?? '')
        setCoachPhone(data.coach_phone ?? '')
      }
      setLoading(false)
    }
    fetchSettings()
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await supabase.from('club_settings').upsert({
      id: 1,
      bank_name: bankName || null,
      account_number: accountNumber || null,
      account_holder: accountHolder || null,
      patrol_phone: patrolPhone || null,
      captain_name: captainName || null,
      captain_phone: captainPhone || null,
      coach_name: coachName || null,
      coach_phone: coachPhone || null,
      updated_by: profile?.id,
      updated_at: new Date().toISOString(),
    })
    setSubmitting(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  const Section = ({ title }: { title: string }) => (
    <p className="text-xs font-black tracking-widest uppercase mt-5 mb-2"
      style={{ color: 'var(--text-hint)' }}>{title}</p>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Admin</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>운영 설정</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Section title="스키부 계좌 (정산 수신)" />
        <input type="text" placeholder="은행명 (예: 토스뱅크)"
          value={bankName} onChange={e => setBankName(e.target.value)}
          style={inputStyle} />
        <input type="text" placeholder="계좌번호"
          value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
          style={inputStyle} />
        <input type="text" placeholder="예금주"
          value={accountHolder} onChange={e => setAccountHolder(e.target.value)}
          style={inputStyle} />

        <Section title="비상 연락처" />
        <input type="tel" placeholder="스키 패트롤 번호"
          value={patrolPhone} onChange={e => setPatrolPhone(e.target.value)}
          style={inputStyle} />
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="주장 이름"
            value={captainName} onChange={e => setCaptainName(e.target.value)}
            style={inputStyle} />
          <input type="tel" placeholder="주장 번호"
            value={captainPhone} onChange={e => setCaptainPhone(e.target.value)}
            style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="훈련팀장 이름"
            value={coachName} onChange={e => setCoachName(e.target.value)}
            style={inputStyle} />
          <input type="tel" placeholder="훈련팀장 번호"
            value={coachPhone} onChange={e => setCoachPhone(e.target.value)}
            style={inputStyle} />
        </div>

        <button type="submit" disabled={submitting}
          className="w-full rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press mt-3"
          style={{
            background: saved ? 'var(--accent-green)' : 'var(--dku-blue-primary)',
            color: '#fff',
          }}>
          {saved ? '저장 완료 ✓' : submitting ? '저장 중...' : '저장하기'}
        </button>
      </form>
    </main>
  )
}
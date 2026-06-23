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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)

  const [patrolPhone, setPatrolPhone] = useState('')
  const [captainName, setCaptainName] = useState('')
  const [captainPhone, setCaptainPhone] = useState('')
  const [coachName, setCoachName] = useState('')
  const [coachPhone, setCoachPhone] = useState('')

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-primary)',
    color: 'var(--text-primary)',
  }

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'admin') { router.push('/home'); return }

    const fetchSettings = async () => {
      const { data } = await supabase
        .from('club_settings')
        .select('*')
        .eq('id', 1)
        .single()

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSubmitting(true)
    setSaved(false)

    await supabase.from('club_settings').update({
  bank_name: bankName || null,
  account_number: accountNumber || null,
  account_holder: accountHolder || null,
  patrol_phone: patrolPhone || null,
  captain_name: captainName || null,
  captain_phone: captainPhone || null,
  coach_name: coachName || null,
  coach_phone: coachPhone || null,
  updated_at: new Date().toISOString(),
  updated_by: profile.id,
}).eq('id', 1)

    setSubmitting(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Admin</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
          스키부 계좌 설정
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>
          정산 요청 시 부원들에게 안내되는 공식 입금 계좌예요
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>은행명</label>
          <input type="text" placeholder="예: 토스뱅크, 카카오뱅크"
            value={bankName} onChange={e => setBankName(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>계좌번호</label>
          <input type="text" placeholder="000-0000-0000"
            value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>예금주</label>
          <input type="text" placeholder="예: 단국대학교 스키부"
            value={accountHolder} onChange={e => setAccountHolder(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
        </div>

        <div className="mt-8 mb-2">
  <p className="text-xs font-black tracking-widest uppercase mb-1"
    style={{ color: 'var(--text-hint)' }}>비상연락처</p>
  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
    비상 상황 시 부원들이 바로 연락할 수 있는 번호예요
  </p>
</div>

<div>
  <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
    style={{ color: 'var(--text-hint)' }}>패트롤 본부</label>
  <input type="tel" placeholder="033-330-7362"
    value={patrolPhone} onChange={e => setPatrolPhone(e.target.value)}
    className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
</div>

<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
      style={{ color: 'var(--text-hint)' }}>주장 이름</label>
    <input type="text" placeholder="이름"
      value={captainName} onChange={e => setCaptainName(e.target.value)}
      className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
  </div>
  <div>
    <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
      style={{ color: 'var(--text-hint)' }}>주장 연락처</label>
    <input type="tel" placeholder="000-0000-0000"
      value={captainPhone} onChange={e => setCaptainPhone(e.target.value)}
      className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
  </div>
</div>

<div className="grid grid-cols-2 gap-3">
  <div>
    <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
      style={{ color: 'var(--text-hint)' }}>훈련팀장 이름</label>
    <input type="text" placeholder="이름"
      value={coachName} onChange={e => setCoachName(e.target.value)}
      className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
  </div>
  <div>
    <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
      style={{ color: 'var(--text-hint)' }}>훈련팀장 연락처</label>
    <input type="tel" placeholder="000-0000-0000"
      value={coachPhone} onChange={e => setCoachPhone(e.target.value)}
      className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
  </div>
</div>

        <button type="submit" disabled={submitting}
          className="w-full text-white rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: saved ? 'var(--accent-green)' : 'var(--ski-blue)' }}>
          {submitting ? '저장 중...' : saved ? '저장됨 ✓' : '저장하기'}
        </button>
      </form>

      {bankName && accountNumber && (
        <div className="rounded-2xl p-5 mt-6"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <p className="text-xs font-black tracking-widest uppercase mb-2"
            style={{ color: 'var(--text-hint)' }}>현재 등록된 계좌</p>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {bankName} {accountNumber}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            {accountHolder}
          </p>
        </div>
      )}
    </main>
  )
}
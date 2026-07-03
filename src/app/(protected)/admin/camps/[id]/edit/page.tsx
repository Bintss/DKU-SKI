'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

export default function EditCampPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [season, setSeason] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [deadline, setDeadline] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [guestFee, setGuestFee] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
    if (profile.role !== 'admin') { router.push('/camp'); return }
    const fetchCamp = async () => {
      const { data } = await supabase.from('camps').select('*').eq('id', id).single()
      if (data) {
        setTitle(data.title)
        setSeason(data.season ?? '')
        setStartDate(data.start_date)
        setEndDate(data.end_date)
        setLocation(data.location ?? '')
        setDescription(data.description ?? '')
        setIsOpen(data.is_open)
        setDeadline(data.deadline ?? '')
        setMaxParticipants(String(data.max_participants ?? ''))
        setGuestFee(String(data.guest_fee ?? ''))
      }
      setLoading(false)
    }
    fetchCamp()
  }, [profile, id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    const { error } = await supabase.from('camps').update({
      title, season: season || null,
      start_date: startDate, end_date: endDate,
      location: location || null, description: description || null,
      is_open: isOpen,
      deadline: deadline || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      guest_fee: guestFee ? parseInt(guestFee) : null,
    }).eq('id', id as string)
    if (error) { setError(error.message); setSubmitting(false); return }
    router.push(`/camp/${id}`)
  }

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  const Label = ({ text }: { text: string }) => (
    <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
      style={{ color: 'var(--text-hint)' }}>{text}</label>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Admin</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>합숙 수정</h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <Label text="합숙명" />
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            style={inputStyle} required />
        </div>

        <div>
          <Label text="시즌" />
          <input type="text" placeholder="예: 2026-27"
            value={season} onChange={e => setSeason(e.target.value)} style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label text="시작일" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={inputStyle} required />
          </div>
          <div>
            <Label text="종료일" />
            <input type="date" value={endDate} min={startDate}
              onChange={e => setEndDate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div>
          <Label text="장소" />
          <input type="text" placeholder="예: 용평리조트"
            value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <Label text="설명" />
          <textarea placeholder="합숙 일정, 주의사항 등" rows={4}
            value={description} onChange={e => setDescription(e.target.value)}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label text="신청 마감일" />
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              style={inputStyle} />
          </div>
          <div>
            <Label text="최대 인원" />
            <input type="number" placeholder="제한 없음" value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <Label text="게스트 참가비 (원)" />
          <input type="number" placeholder="0" value={guestFee}
            onChange={e => setGuestFee(e.target.value)} style={inputStyle} />
        </div>

        {/* 신청 오픈 토글 */}
        <div className="flex items-center justify-between rounded-xl px-4 py-3.5"
          style={{ background: '#fff', border: '1px solid var(--border-primary)' }}>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>신청 오픈</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {isOpen ? '부원이 신청할 수 있어요' : '신청이 비공개예요'}
            </p>
          </div>
          <button type="button" onClick={() => setIsOpen(!isOpen)}
            className="relative w-12 h-6 rounded-full transition-all duration-200"
            style={{ background: isOpen ? 'var(--dku-blue-primary)' : 'var(--border-secondary)' }}>
            <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: isOpen ? '28px' : '4px' }} />
          </button>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)' }}>
            <p className="text-xs font-bold" style={{ color: 'var(--accent-red)' }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full text-white rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: 'var(--dku-blue-primary)' }}>
          {submitting ? '저장 중...' : '저장하기'}
        </button>
      </form>
    </main>
  )
}
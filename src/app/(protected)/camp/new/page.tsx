'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

export default function NewCampPage() {
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [deadline, setDeadline] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [guestFee, setGuestFee] = useState('')
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
    if (profile.role !== 'admin') router.push('/camp')
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSubmitting(true); setError('')
    const { data, error } = await supabase.from('camps').insert({
      title, start_date: startDate, end_date: endDate,
      location: location || null,
      description: description || null,
      is_open: isOpen,
      deadline: deadline || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      guest_fee: guestFee ? parseInt(guestFee) : null,
      created_by: profile.id,
    }).select().single()
    if (error) { setError(error.message); setSubmitting(false); return }
    router.push(`/camp/${data.id}`)
  }

  if (profileLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Camp</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>합숙 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>합숙명</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="예: 2627 시즌 합숙" style={inputStyle} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>시작일</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={inputStyle} required />
          </div>
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>종료일</label>
            <input type="date" value={endDate} min={startDate}
              onChange={e => setEndDate(e.target.value)} style={inputStyle} required />
          </div>
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>장소</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            placeholder="예: 용평리조트" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>설명</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="합숙 일정, 주의사항 등을 입력해주세요" rows={4}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>신청 마감일</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)}
              style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>최대 인원</label>
            <input type="number" value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
              placeholder="제한 없음" style={inputStyle} />
          </div>
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>게스트 참가비 (원)</label>
          <input type="number" value={guestFee} onChange={e => setGuestFee(e.target.value)}
            placeholder="0" style={inputStyle} />
        </div>

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
          className="w-full rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
          {submitting ? '등록 중...' : '합숙 등록'}
        </button>
      </form>
    </main>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function EditCampPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [season, setSeason] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [guestFee, setGuestFee] = useState('')
  const [deadline, setDeadline] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-primary)',
    color: 'var(--text-primary)',
  }

  useEffect(() => {
    const fetchCamp = async () => {
      const { data } = await supabase.from('camps').select('*').eq('id', id).single()
      if (data) {
        setTitle(data.title); setSeason(data.season)
        setStartDate(data.start_date); setEndDate(data.end_date)
        setLocation(data.location ?? ''); setDescription(data.description ?? '')
        setMaxParticipants(data.max_participants ? String(data.max_participants) : '')
        setGuestFee(String(data.guest_fee))
        setDeadline(data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : '')
        setIsOpen(data.is_open)
      }
      setLoading(false)
    }
    fetchCamp()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')

    const { error } = await supabase.from('camps').update({
      title, season, start_date: startDate, end_date: endDate,
      location: location || null, description: description || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      guest_fee: parseInt(guestFee),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      is_open: isOpen,
    }).eq('id', id as string)

    if (error) { setError(error.message); setSubmitting(false); return }
    router.push('/camp')
  }

  const handleDelete = async () => {
    if (!confirm('합숙을 삭제할까요? 참여 신청 내역과 게스트 정보도 모두 삭제됩니다.')) return
    await supabase.from('camps').delete().eq('id', id as string)
    router.push('/camp')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Ski Camp</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>합숙 수정</h1>
        </div>
        <button onClick={handleDelete}
          className="text-xs font-black btn-press" style={{ color: '#FF6B6B' }}>
          삭제
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {[
          { label: '시즌', value: season, onChange: setSeason, type: 'text' },
          { label: '합숙명', value: title, onChange: setTitle, type: 'text' },
          { label: '장소', value: location, onChange: setLocation, type: 'text', required: false },
        ].map(field => (
          <div key={field.label}>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>{field.label}</label>
            <input type={field.type} value={field.value}
              onChange={e => field.onChange(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle}
              required={field.required !== false} />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>시작일</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
          </div>
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>종료일</label>
            <input type="date" value={endDate} min={startDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
          </div>
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>설명</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>신청 마감일</label>
          <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>최대 인원</label>
            <input type="number" placeholder="없으면 비워두세요" value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>게스트비 (원)</label>
            <input type="number" value={guestFee} onChange={e => setGuestFee(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>신청 받기</p>
          <button type="button" onClick={() => setIsOpen(!isOpen)}
            className="relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0"
            style={{ background: isOpen ? 'var(--ski-blue)' : 'rgba(255,255,255,0.1)' }}>
            <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: isOpen ? '28px' : '4px' }} />
          </button>
        </div>

        {error && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>}

        <button type="submit" disabled={submitting}
          className="w-full text-white rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: 'var(--ski-blue)' }}>
          {submitting ? '저장 중...' : '저장하기'}
        </button>
      </form>
    </main>
  )
}
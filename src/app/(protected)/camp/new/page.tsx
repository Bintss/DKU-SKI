'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NewCampPage() {
  const [title, setTitle] = useState('')
  const [season, setSeason] = useState('2026-27')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [guestFee, setGuestFee] = useState('30000')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-primary)',
    color: 'var(--text-primary)',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('camps').insert({
      title, season,
      start_date: startDate, end_date: endDate,
      location: location || null, description: description || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      guest_fee: parseInt(guestFee),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      is_open: true, created_by: user.id,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.push('/camp')
  }

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Ski Camp</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>합숙 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {[
          { label: '시즌', value: season, onChange: setSeason, placeholder: '예: 2026-27', type: 'text' },
          { label: '합숙명', value: title, onChange: setTitle, placeholder: '예: 2026-27 동계 전지훈련', type: 'text' },
          { label: '장소', value: location, onChange: setLocation, placeholder: '예: 하이원 리조트', type: 'text' },
        ].map(field => (
          <div key={field.label}>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>{field.label}</label>
            <input type={field.type} placeholder={field.placeholder} value={field.value}
              onChange={e => field.onChange(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle}
              required={field.label !== '장소'} />
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
          <textarea placeholder="합숙에 대한 간단한 설명" value={description}
            onChange={e => setDescription(e.target.value)} rows={3}
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

        {error && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full text-white rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: 'var(--ski-blue)' }}>
          {loading ? '등록 중...' : '합숙 등록'}
        </button>
      </form>
    </main>
  )
}
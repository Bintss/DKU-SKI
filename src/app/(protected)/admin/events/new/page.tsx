'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import ImageUpload from '@/components/ImageUpload'

export default function NewEventPage() {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('daytrip')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [detail, setDetail] = useState('')
  const [imageUrl, setImageUrl] = useState('')
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

  const EVENT_TYPES = [
    { value: 'daytrip', label: '당일 행사' },
    { value: 'training', label: '정기 훈련' },
    { value: 'ob_invite', label: 'OB 초청' },
    { value: 'etc', label: '기타' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('events').insert({
      title, type, start_date: startDate, end_date: endDate,
      location: location || null, description: description || null,
      detail: detail || null, image_url: imageUrl || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      guest_fee: parseInt(guestFee),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      is_open: true, created_by: user.id,
    })

    if (error) { setError(error.message); setLoading(false); return }
    router.push('/events')
  }

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Schedule</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>행사 등록</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 행사 유형 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-2 block"
            style={{ color: 'var(--text-hint)' }}>행사 유형</label>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map(opt => (
              <button key={opt.value} type="button" onClick={() => setType(opt.value)}
                className="py-2.5 rounded-xl text-sm font-black btn-press"
                style={{
                  background: type === opt.value ? 'var(--ski-blue)' : 'var(--bg-card)',
                  border: `0.5px solid ${type === opt.value ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
                  color: type === opt.value ? '#fff' : 'var(--text-tertiary)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>행사명</label>
          <input type="text" placeholder="예: 2026 춘계 대회" value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>시작일</label>
            <input type="date" value={startDate}
              onChange={e => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }}
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
            style={{ color: 'var(--text-hint)' }}>장소</label>
          <input type="text" placeholder="예: 하이원 리조트" value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>간단 설명</label>
          <input type="text" placeholder="목록에서 보이는 한 줄 설명" value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>세부 내용</label>
          <textarea placeholder="행사 상세 안내, 준비물, 일정표 등" value={detail}
            onChange={e => setDetail(e.target.value)} rows={5}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>이미지</label>
          <ImageUpload bucket="events" value={imageUrl} onChange={setImageUrl} />
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
          {loading ? '등록 중...' : '행사 등록'}
        </button>
      </form>
    </main>
  )
}
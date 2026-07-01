'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import ImageUpload from '@/components/ImageUpload'

export default function EditEventPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [type, setType] = useState('daytrip')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [detail, setDetail] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [guestFee, setGuestFee] = useState('')
  const [participationFee, setParticipationFee] = useState('')
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

  const EVENT_TYPES = [
    { value: 'daytrip', label: '당일 행사' },
    { value: 'training', label: '정기 훈련' },
    { value: 'ob_invite', label: 'OB 초청' },
    { value: 'etc', label: '기타' },
  ]

  useEffect(() => {
    if (!profile) return
    if (profile.role !== 'admin') { router.push('/events'); return }

    const fetchEvent = async () => {
      const { data } = await supabase.from('events').select('*').eq('id', id).single()
      if (data) {
        setTitle(data.title)
        setType(data.type)
        setStartDate(data.start_date)
        setEndDate(data.end_date)
        setLocation(data.location ?? '')
        setDescription(data.description ?? '')
        setDetail(data.detail ?? '')
        setImageUrl(data.image_url ?? '')
        setMaxParticipants(data.max_participants ? String(data.max_participants) : '')
        setGuestFee(String(data.guest_fee))
        setParticipationFee(String(data.participation_fee ?? ''))
        setDeadline(data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : '')
        setIsOpen(data.is_open)
      }
      setLoading(false)
    }
    fetchEvent()
  }, [profile, id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error } = await supabase.from('events').update({
      title, type,
      start_date: startDate,
      end_date: endDate,
      location: location || null,
      description: description || null,
      detail: detail || null,
      image_url: imageUrl || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      guest_fee: parseInt(guestFee),
      participation_fee: participationFee ? parseInt(participationFee) : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      is_open: isOpen,
    }).eq('id', id as string)

    if (error) { setError(error.message); setSubmitting(false); return }
    router.push(`/events/${id}`)
  }

  const handleDelete = async () => {
    if (!confirm('행사를 삭제할까요?')) return
    await supabase.from('events').delete().eq('id', id as string)
    router.push('/events')
  }

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Schedule</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>행사 수정</h1>
        </div>
        <button onClick={handleDelete}
          className="text-xs font-black btn-press" style={{ color: '#FF6B6B' }}>
          삭제
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
        </div>

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
            style={{ color: 'var(--text-hint)' }}>장소</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>간단 설명</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>세부 내용</label>
          <textarea value={detail} onChange={e => setDetail(e.target.value)} rows={5}
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
          <input type="datetime-local" value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>최대 인원</label>
            <input type="number" value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
              style={{ color: 'var(--text-hint)' }}>게스트비 (원)</label>
            <input type="number" value={guestFee} onChange={e => setGuestFee(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
          </div>
          <div>
  <label className="text-xs font-semibold block mb-1.5"
    style={{ color: 'var(--text-tertiary)' }}>
    참가비 (원)
  </label>
  <input type="number" value={participationFee}
    onChange={e => setParticipationFee(e.target.value)}
    placeholder="0"
    className="w-full rounded-xl px-4 py-3 text-sm"
    style={{
      background: 'var(--bg-secondary)',
      border: '0.5px solid var(--border-primary)',
      color: 'var(--text-primary)',
    }} />
  <p className="text-xs mt-1" style={{ color: 'var(--text-hint)' }}>
    행사 참가자 전원에게 정산 요청할 금액이에요
  </p>
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
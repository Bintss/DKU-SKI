'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import ImageUpload from '@/components/ImageUpload'

const EVENT_TYPES = [
  { value: 'daytrip', label: '당일 행사' },
  { value: 'training', label: '정기 훈련' },
  { value: 'ob_invite', label: 'OB 초청' },
  { value: 'etc', label: '기타' },
]

export default function EditEventPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [eventType, setEventType] = useState('daytrip')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [detailContent, setDetailContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [deadline, setDeadline] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [guestFee, setGuestFee] = useState('')
  const [participationFee, setParticipationFee] = useState('')
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
    if (profile.role !== 'admin') { router.push('/events'); return }
    const fetchEvent = async () => {
      const { data } = await supabase.from('events').select('*').eq('id', id).single()
      if (data) {
        setTitle(data.title)
        setEventType(data.event_type)
        setStartDate(data.start_date)
        setEndDate(data.end_date ?? '')
        setLocation(data.location ?? '')
        setDescription(data.description ?? '')
        setDetailContent(data.detail_content ?? '')
        setImageUrl(data.image_url ?? '')
        setDeadline(data.deadline ?? '')
        setMaxParticipants(String(data.max_participants ?? ''))
        setGuestFee(String(data.guest_fee ?? ''))
        setParticipationFee(String(data.participation_fee ?? ''))
      }
      setLoading(false)
    }
    fetchEvent()
  }, [profile, id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    const { error } = await supabase.from('events').update({
      title, event_type: eventType,
      start_date: startDate, end_date: endDate || startDate,
      location: location || null, description: description || null,
      detail_content: detailContent || null,
      image_url: imageUrl || null,
      deadline: deadline || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      guest_fee: guestFee ? parseInt(guestFee) : null,
      participation_fee: participationFee ? parseInt(participationFee) : null,
    }).eq('id', id as string)
    if (error) { setError(error.message); setSubmitting(false); return }
    router.push(`/events/${id}`)
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
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>행사 수정</h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <Label text="행사 유형" />
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map(t => (
              <button key={t.value} type="button"
                onClick={() => setEventType(t.value)}
                className="py-2.5 rounded-xl text-xs font-black btn-press"
                style={{
                  background: eventType === t.value ? 'var(--dku-blue-primary)' : '#fff',
                  border: `1px solid ${eventType === t.value ? 'var(--dku-blue-primary)' : 'var(--border-primary)'}`,
                  color: eventType === t.value ? '#fff' : 'var(--text-tertiary)',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label text="행사명" />
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            style={inputStyle} required />
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
              onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div>
          <Label text="장소" />
          <input type="text" placeholder="행사 장소"
            value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <Label text="간단 설명" />
          <input type="text" placeholder="한 줄 설명"
            value={description} onChange={e => setDescription(e.target.value)} style={inputStyle} />
        </div>

        <div>
          <Label text="상세 내용" />
          <textarea placeholder="상세 일정, 준비물 등" rows={4}
            value={detailContent} onChange={e => setDetailContent(e.target.value)}
            style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }} />
        </div>

        <div>
          <Label text="대표 이미지" />
          <ImageUpload bucket="events" value={imageUrl} onChange={setImageUrl} />
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label text="참가비 (원)" />
            <input type="number" placeholder="0" value={participationFee}
              onChange={e => setParticipationFee(e.target.value)} style={inputStyle} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-hint)' }}>정산 생성에 사용돼요</p>
          </div>
          <div>
            <Label text="게스트비 (원)" />
            <input type="number" placeholder="0" value={guestFee}
              onChange={e => setGuestFee(e.target.value)} style={inputStyle} />
          </div>
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
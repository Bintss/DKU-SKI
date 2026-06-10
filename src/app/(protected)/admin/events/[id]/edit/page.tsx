'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function EditEventPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [type, setType] = useState('camp')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [detail, setDetail] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('')
  const [guestFee, setGuestFee] = useState('30000')
  const [deadline, setDeadline] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEvent = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

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
        setDeadline(data.deadline ? new Date(data.deadline).toISOString().slice(0, 16) : '')
        setIsOpen(data.is_open)
      }
      setLoading(false)
    }
    fetchEvent()
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error } = await supabase.from('events').update({
      title,
      type,
      start_date: startDate,
      end_date: endDate,
      location: location || null,
      description: description || null,
      detail: detail || null,
      image_url: imageUrl || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      guest_fee: parseInt(guestFee),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      is_open: isOpen,
    }).eq('id', id as string)

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    router.push(`/events/${id}`)
  }

  const handleDelete = async () => {
    if (!confirm('행사를 삭제할까요? 참여 신청 내역도 모두 삭제됩니다.')) return

    await supabase.from('events').delete().eq('id', id as string)
    router.push('/events')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">행사 수정</h1>
        <button
          onClick={handleDelete}
          className="text-xs text-red-400 hover:text-red-500 hover:underline"
        >
          행사 삭제
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 행사 유형 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">행사 유형</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'camp', label: '합숙 · MT' },
              { value: 'daytrip', label: '당일 행사' },
              { value: 'training', label: '정기 훈련' },
              { value: 'ob_invite', label: 'OB 초청' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                  type === opt.value
                    ? 'text-white border-transparent'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
                style={type === opt.value ? { background: 'var(--ski-blue)' } : {}}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">행사명</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
            required
          />
        </div>

        {/* 날짜 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
              required
            />
          </div>
        </div>

        {/* 장소 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">장소</label>
          <input
            type="text"
            placeholder="예: 하이원 리조트"
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
          />
        </div>

        {/* 간단 설명 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">간단 설명</label>
          <input
            type="text"
            placeholder="목록에서 보이는 한 줄 설명"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
          />
        </div>

        {/* 세부 내용 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">세부 내용</label>
          <textarea
            placeholder="행사 상세 안내, 준비물, 일정표 등"
            value={detail}
            onChange={e => setDetail(e.target.value)}
            rows={5}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none"
          />
        </div>

        {/* 이미지 URL */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">이미지 URL (선택)</label>
          <input
            type="url"
            placeholder="https://..."
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="미리보기"
              className="mt-2 w-full h-40 object-cover rounded-xl"
            />
          )}
        </div>

        {/* 신청 마감일 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">신청 마감일</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
          />
        </div>

        {/* 최대 인원 · 게스트비 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">최대 인원</label>
            <input
              type="number"
              placeholder="없으면 비워두세요"
              value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
              className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">게스트비 (원)</label>
            <input
              type="number"
              value={guestFee}
              onChange={e => setGuestFee(e.target.value)}
              className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* 신청 상태 */}
        <div className="flex items-center justify-between bg-white border rounded-xl px-4 py-3">
          <span className="text-sm text-gray-700">신청 받기</span>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              isOpen ? 'bg-blue-500' : 'bg-gray-200'
            }`}
            style={isOpen ? { background: 'var(--ski-blue)' } : {}}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              isOpen ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50 mt-2"
          style={{ background: 'var(--ski-blue)' }}
        >
          {submitting ? '저장 중...' : '저장하기'}
        </button>
      </form>
    </main>
  )
}
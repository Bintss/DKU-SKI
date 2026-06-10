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

  useEffect(() => {
    const fetchCamp = async () => {
      const { data } = await supabase
        .from('camps')
        .select('*')
        .eq('id', id)
        .single()

      if (data) {
        setTitle(data.title)
        setSeason(data.season)
        setStartDate(data.start_date)
        setEndDate(data.end_date)
        setLocation(data.location ?? '')
        setDescription(data.description ?? '')
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
    setSubmitting(true)
    setError('')

    const { error } = await supabase.from('camps').update({
      title,
      season,
      start_date: startDate,
      end_date: endDate,
      location: location || null,
      description: description || null,
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

    router.push('/camp')
  }

  const handleDelete = async () => {
    if (!confirm('합숙을 삭제할까요? 참여 신청 내역과 게스트 정보도 모두 삭제됩니다.')) return

    await supabase.from('camps').delete().eq('id', id as string)
    router.push('/camp')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">합숙 수정</h1>
        <button
          onClick={handleDelete}
          className="text-xs text-red-400 hover:text-red-500 hover:underline"
        >
          합숙 삭제
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 시즌 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">시즌</label>
          <input
            type="text"
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400"
            required
          />
        </div>

        {/* 제목 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">합숙명</label>
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
              min={startDate}
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

        {/* 설명 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">설명</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-white border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none"
          />
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
            className="relative w-12 h-6 rounded-full transition-all duration-200 flex-shrink-0"
            style={{ background: isOpen ? 'var(--ski-blue)' : 'var(--gray-200)' }}
          >
            <span
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
              style={{ left: isOpen ? '28px' : '4px' }}
            />
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
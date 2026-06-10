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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('camps').insert({
      title,
      season,
      start_date: startDate,
      end_date: endDate,
      location: location || null,
      description: description || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      guest_fee: parseInt(guestFee),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      is_open: true,
      created_by: user.id,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/camp')
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">합숙 등록</h1>
        <a href="/camp" className="text-xs text-gray-400 hover:text-gray-600">← 취소</a>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 시즌 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">시즌</label>
          <input
            type="text"
            placeholder="예: 2026-27"
            value={season}
            onChange={e => setSeason(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* 제목 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">합숙명</label>
          <input
            type="text"
            placeholder="예: 2026-27 동계 전지훈련"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 설명 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">설명</label>
          <textarea
            placeholder="합숙에 대한 간단한 설명"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* 신청 마감일 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1.5 block">신청 마감일</label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">게스트비 (원)</label>
            <input
              type="number"
              value={guestFee}
              onChange={e => setGuestFee(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-xs">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded-xl py-3.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 mt-2"
        >
          {loading ? '등록 중...' : '합숙 등록'}
        </button>
      </form>
    </main>
  )
}
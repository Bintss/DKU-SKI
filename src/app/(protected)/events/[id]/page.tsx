'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

type Event = {
  id: string
  title: string
  type: string
  start_date: string
  end_date: string
  location: string | null
  description: string | null
  max_participants: number | null
  guest_fee: number
  is_open: boolean
  deadline: string | null
  created_by: string
}

type Participant = {
  id: string
  user_id: string | null
  participant_type: string
  join_date: string
  leave_date: string
  memo: string | null
  profiles: { name: string; generation: number } | null
}

const TYPE_LABEL: Record<string, string> = {
  daytrip: '당일 행사',
  camp: '합숙 · MT',
  training: '정기 훈련',
  ob_invite: 'OB 초청',
}

export default function EventDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [profile, setProfile] = useState<{ role: string; id: string } | null>(null)
  const [myParticipation, setMyParticipation] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)

  // 합숙 날짜 선택
  const [joinDate, setJoinDate] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: eventData }, { data: profileData }, { data: participantData }] =
        await Promise.all([
          supabase.from('events').select('*').eq('id', id).single(),
          supabase.from('profiles').select('id, role').eq('id', user.id).single(),
          supabase.from('event_participants')
            .select('*, profiles(name, generation)')
            .eq('event_id', id)
        ])

      setEvent(eventData)
      setProfile(profileData)
      setParticipants(participantData ?? [])

      const mine = participantData?.find(p => p.user_id === user.id)
      setMyParticipation(mine ?? null)
      if (mine) {
        setJoinDate(mine.join_date)
        setLeaveDate(mine.leave_date)
        setMemo(mine.memo ?? '')
      } else if (eventData) {
        setJoinDate(eventData.start_date)
        setLeaveDate(eventData.end_date)
      }

      setLoading(false)
    }
    fetch()
  }, [id])

  const handleApply = async () => {
    if (!joinDate || !leaveDate || !event || !profile) return
    setSubmitting(true)
    setError('')

    if (myParticipation) {
      // 수정
      await supabase
        .from('event_participants')
        .update({ join_date: joinDate, leave_date: leaveDate, memo })
        .eq('id', myParticipation.id)
    } else {
      // 신규 신청
      await supabase.from('event_participants').insert({
        event_id: event.id,
        user_id: profile.id,
        participant_type: profile.role === 'ob' ? 'ob' : 'member',
        join_date: joinDate,
        leave_date: leaveDate,
        memo,
        status: 'confirmed',
      })
    }

    router.refresh()
    setSubmitting(false)
    window.location.reload()
  }

  const handleCancel = async () => {
    if (!myParticipation) return
    await supabase
      .from('event_participants')
      .delete()
      .eq('id', myParticipation.id)
    window.location.reload()
  }

  const getDatesInRange = (start: string, end: string) => {
    const dates = []
    const current = new Date(start)
    const last = new Date(end)
    while (current <= last) {
      dates.push(current.toISOString().split('T')[0])
      current.setDate(current.getDate() + 1)
    }
    return dates
  }

  const getParticipantCountByDate = (date: string) =>
    participants.filter(
      p => p.join_date <= date && p.leave_date >= date
    ).length

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">불러오는 중...</p>
    </div>
  )

  if (!event) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">행사를 찾을 수 없어요</p>
    </div>
  )

  const eventDates = getDatesInRange(event.start_date, event.end_date)
  const isDeadlinePassed = event.deadline
    ? new Date(event.deadline) < new Date() : false
  const canApply = event.is_open && !isDeadlinePassed

  const nights = Math.ceil(
    (new Date(leaveDate).getTime() - new Date(joinDate).getTime())
    / (1000 * 60 * 60 * 24)
  )

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <a href="/events" className="text-xs text-gray-400 hover:text-gray-600">← 목록</a>
        {profile?.role === 'admin' && (
          <span className="text-xs text-orange-500">운영진 모드</span>
        )}
      </div>

      {/* 행사 정보 */}
      <div className="mb-6">
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
          {TYPE_LABEL[event.type] ?? event.type}
        </span>
        <h1 className="text-xl font-semibold mt-3 mb-2">{event.title}</h1>
        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-500">📅 {event.start_date} ~ {event.end_date}</p>
          {event.location && <p className="text-sm text-gray-500">📍 {event.location}</p>}
          {event.deadline && (
            <p className="text-sm text-gray-500">
              ⏰ 신청 마감: {new Date(event.deadline).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>
        {event.description && (
          <p className="text-sm text-gray-600 mt-3 leading-relaxed">{event.description}</p>
        )}
      </div>

      {/* 날짜별 참여 현황 */}
      {event.type === 'camp' && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 mb-3">날짜별 참여 인원</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {eventDates.map(date => {
              const count = getParticipantCountByDate(date)
              const isMyDate = joinDate && leaveDate && joinDate <= date && leaveDate >= date
              return (
                <div
                  key={date}
                  className={`flex-shrink-0 text-center rounded-xl px-3 py-2 min-w-[56px] ${
                    isMyDate ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <p className="text-xs mb-1">
                    {new Date(date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                  </p>
                  <p className="text-sm font-semibold">{count}명</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 신청 폼 */}
      {canApply && (
        <div className="border rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-medium mb-4">
            {myParticipation ? '신청 수정' : '참여 신청'}
          </h2>

          {event.type === 'camp' ? (
            <>
              <p className="text-xs text-gray-500 mb-3">참여 기간을 선택해주세요</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">도착일</label>
                  <input
                    type="date"
                    value={joinDate}
                    min={event.start_date}
                    max={event.end_date}
                    onChange={e => setJoinDate(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">출발일</label>
                  <input
                    type="date"
                    value={leaveDate}
                    min={joinDate || event.start_date}
                    max={event.end_date}
                    onChange={e => setLeaveDate(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              {joinDate && leaveDate && (
                <p className="text-xs text-blue-600 mb-3">
                  {joinDate} ~ {leaveDate} ({nights > 0 ? `${nights}박 ${nights + 1}일` : '당일'})
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-600 mb-3">
              {event.start_date} 행사에 참여 신청합니다.
            </p>
          )}

          <input
            type="text"
            placeholder="메모 (늦게 도착, 일찍 출발 등)"
            value={memo}
            onChange={e => setMemo(e.target.value)}
            className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-3"
          />

          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleApply}
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '처리 중...' : myParticipation ? '수정하기' : '신청하기'}
            </button>
            {myParticipation && (
              <button
                onClick={handleCancel}
                className="px-4 bg-gray-100 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-200"
              >
                취소
              </button>
            )}
          </div>
        </div>
      )}

      {!canApply && (
        <div className="bg-gray-50 rounded-2xl px-5 py-4 mb-6 text-center">
          <p className="text-sm text-gray-400">
            {!event.is_open ? '신청이 마감됐어요' : '신청 기간이 아니에요'}
          </p>
        </div>
      )}

      {/* 참여자 목록 */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          참여자 <span className="text-gray-900 ml-1">{participants.length}명</span>
        </h2>
        <div className="flex flex-col gap-2">
          {participants.map(p => (
            <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl">
              <div>
                <span className="text-sm font-medium">{p.profiles?.name ?? '알 수 없음'}</span>
                <span className="text-xs text-gray-400 ml-2">{p.profiles?.generation}기</span>
                {p.memo && <p className="text-xs text-gray-400 mt-0.5">{p.memo}</p>}
              </div>
              {event.type === 'camp' && (
                <span className="text-xs text-gray-500">
                  {p.join_date === p.leave_date ? p.join_date : `${p.join_date} ~ ${p.leave_date}`}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
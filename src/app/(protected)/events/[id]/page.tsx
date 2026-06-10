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
  detail: string | null
  image_url: string | null
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
  etc: '기타',
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
  const [detailOpen, setDetailOpen] = useState(false)

  // 신청 폼
  const [joinDate, setJoinDate] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [memo, setMemo] = useState('')
  const [applyMode, setApplyMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

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
            .eq('event_id', id),
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

    if (myParticipation) {
      await supabase.from('event_participants')
        .update({ join_date: joinDate, leave_date: leaveDate, memo })
        .eq('id', myParticipation.id)
    } else {
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

    setApplyMode(false)
    setSubmitting(false)
    window.location.reload()
  }

  const handleCancel = async () => {
    if (!myParticipation) return
    await supabase.from('event_participants').delete().eq('id', myParticipation.id)
    window.location.reload()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  if (!event) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">행사를 찾을 수 없어요</p>
    </div>
  )

  const isDeadlinePassed = event.deadline
    ? new Date(event.deadline) < new Date() : false
  const canApply = event.is_open && !isDeadlinePassed

  const nights = Math.ceil(
    (new Date(leaveDate).getTime() - new Date(joinDate).getTime())
    / (1000 * 60 * 60 * 24)
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {/* 운영진 수정 버튼 */}
      {profile?.role === 'admin' && (
        <div className="flex justify-end mb-3">
          <a
            href={`/admin/events/${id}/edit`}
            className="text-xs text-white px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--ski-blue)' }}
          >
            행사 수정
          </a>
        </div>
      )}

      {/* 이미지 */}
      {event.image_url && (
        <img
          src={event.image_url}
          alt={event.title}
          className="w-full h-48 object-cover rounded-2xl mb-4"
        />
      )}

      {/* 행사 정보 */}
      <div className="bg-white border rounded-2xl p-5 mb-4">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: 'var(--ski-blue-50)', color: 'var(--ski-blue)' }}
        >
          {TYPE_LABEL[event.type] ?? event.type}
        </span>
        <h1 className="text-xl font-semibold mt-3 mb-3">{event.title}</h1>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-gray-500">
            📅 {event.start_date === event.end_date
              ? event.start_date
              : `${event.start_date} ~ ${event.end_date}`}
          </p>
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

        {/* 세부 내용 토글 */}
        {event.detail && (
          <div className="mt-3 border-t pt-3">
            <button
              onClick={() => setDetailOpen(!detailOpen)}
              className="flex items-center justify-between w-full text-sm font-medium text-gray-700"
            >
              <span>세부 내용</span>
              <span className="text-gray-400 text-xs">{detailOpen ? '접기 ▲' : '펼치기 ▼'}</span>
            </button>
            {detailOpen && (
              <p className="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">
                {event.detail}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 신청 폼 */}
      {canApply && (
        <div className="bg-white border rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">
              {myParticipation ? '내 신청 현황' : '참여 신청'}
            </h2>
            {myParticipation && !applyMode && (
              <button
                onClick={() => setApplyMode(true)}
                className="text-xs hover:underline"
                style={{ color: 'var(--ski-blue)' }}
              >
                수정
              </button>
            )}
          </div>

          {event.type === 'camp' ? (
            myParticipation && !applyMode ? (
              <div>
                <p className="text-sm text-gray-700 font-medium">
                  {joinDate} ~ {leaveDate}
                  {nights > 0 && <span className="text-gray-400 font-normal ml-1">({nights}박 {nights + 1}일)</span>}
                </p>
                {memo && <p className="text-xs text-gray-400 mt-1">{memo}</p>}
                <div className="flex gap-3 mt-3">
                  <button onClick={() => setApplyMode(true)}
                    className="text-xs hover:underline" style={{ color: 'var(--ski-blue)' }}>
                    일정 변경
                  </button>
                  <button onClick={handleCancel} className="text-xs text-red-400 hover:text-red-500">
                    신청 취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">도착일</label>
                    <input type="date" value={joinDate}
                      min={event.start_date} max={event.end_date}
                      onChange={e => setJoinDate(e.target.value)}
                      className="w-full bg-white border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">출발일</label>
                    <input type="date" value={leaveDate}
                      min={joinDate || event.start_date} max={event.end_date}
                      onChange={e => setLeaveDate(e.target.value)}
                      className="w-full bg-white border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
                <input type="text" placeholder="메모"
                  value={memo} onChange={e => setMemo(e.target.value)}
                  className="bg-white border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <div className="flex gap-2">
                  <button onClick={handleApply} disabled={submitting}
                    className="flex-1 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
                    style={{ background: 'var(--ski-blue)' }}>
                    {submitting ? '처리 중...' : myParticipation ? '수정하기' : '신청하기'}
                  </button>
                  {applyMode && (
                    <button onClick={() => setApplyMode(false)}
                      className="px-4 bg-gray-100 text-gray-600 rounded-xl py-3 text-sm hover:bg-gray-200">
                      취소
                    </button>
                  )}
                </div>
              </div>
            )
          ) : (
            // 당일 행사
            myParticipation ? (
              <div>
                <p className="text-sm text-green-600 font-medium">✓ 참여 신청 완료</p>
                {memo && <p className="text-xs text-gray-400 mt-1">{memo}</p>}
                <button onClick={handleCancel}
                  className="text-xs text-red-400 hover:text-red-500 mt-2 block">
                  신청 취소
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input type="text" placeholder="메모 (선택)"
                  value={memo} onChange={e => setMemo(e.target.value)}
                  className="bg-white border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                />
                <button onClick={handleApply} disabled={submitting}
                  className="w-full text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
                  style={{ background: 'var(--ski-blue)' }}>
                  {submitting ? '처리 중...' : '참여 신청'}
                </button>
              </div>
            )
          )}
        </div>
      )}

      {!canApply && (
        <div className="bg-gray-50 rounded-2xl px-5 py-4 mb-4 text-center">
          <p className="text-sm text-gray-400">
            {!event.is_open ? '신청이 마감됐어요' : '신청 기간이 아니에요'}
          </p>
        </div>
      )}

      {/* 참여자 목록 */}
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          참여자 <span className="text-gray-900 ml-1">{participants.length}명</span>
        </h2>
        {participants.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">아직 신청자가 없어요</p>
        ) : (
          <div className="flex flex-col gap-2">
            {participants.map(p => (
              <div key={p.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'var(--gray-50)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full text-white text-xs font-medium flex items-center justify-center"
                    style={{ background: 'var(--ski-blue)' }}>
                    {p.profiles?.name?.[0] ?? '?'}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{p.profiles?.name ?? '알 수 없음'}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{p.profiles?.generation}기</span>
                  </div>
                </div>
                {event.type === 'camp' && (
                  <span className="text-xs text-gray-400">
                    {p.join_date === p.leave_date ? p.join_date : `${p.join_date}~${p.leave_date}`}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
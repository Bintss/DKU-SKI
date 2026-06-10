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
  guest_fee: number
  is_open: boolean
  deadline: string | null
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

type Guest = {
  id: string
  name: string
  phone: string | null
  join_date: string
  fee: number
  fee_paid: boolean
}

export default function CampCalendarPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [profile, setProfile] = useState<{ id: string; role: string } | null>(null)
  const [myParticipation, setMyParticipation] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)

  // 선택된 날짜 (상세 패널)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // 내 신청 구간
  const [joinDate, setJoinDate] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [memo, setMemo] = useState('')
  const [applyMode, setApplyMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 게스트 추가 폼
  const [guestMode, setGuestMode] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestFee, setGuestFee] = useState('')

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: eventData }, { data: profileData }, { data: participantData }, { data: guestData }] =
      await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.from('profiles').select('id, role').eq('id', user.id).single(),
        supabase.from('event_participants')
          .select('*, profiles(name, generation)')
          .eq('event_id', id),
        supabase.from('guests').select('*').eq('event_id', id),
      ])

    setEvent(eventData)
    setProfile(profileData)
    setParticipants(participantData ?? [])
    setGuests(guestData ?? [])

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
    if (eventData) setGuestFee(String(eventData.guest_fee))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  // 행사 기간 날짜 배열
  const getEventDates = () => {
    if (!event) return []
    const dates: string[] = []
    const cur = new Date(event.start_date)
    const end = new Date(event.end_date)
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }
    return dates
  }

  const isInRange = (date: string, start: string, end: string) =>
    date >= start && date <= end

  // 날짜별 참여자
  const getMembersByDate = (date: string) =>
    participants.filter(p => isInRange(date, p.join_date, p.leave_date))

  const getGuestsByDate = (date: string) =>
    guests.filter(g => g.join_date === date)

  // 내 신청
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
    fetchData()
  }

  const handleCancel = async () => {
    if (!myParticipation) return
    await supabase.from('event_participants').delete().eq('id', myParticipation.id)
    setMyParticipation(null)
    fetchData()
  }

  // 게스트 추가
  const handleAddGuest = async () => {
    if (!guestName || !selectedDate || !event || !profile) return
    setSubmitting(true)

    const { data: newGuest } = await supabase.from('guests').insert({
      event_id: event.id,
      name: guestName,
      phone: guestPhone || null,
      join_date: selectedDate,
      fee: parseInt(guestFee),
      fee_paid: false,
      registered_by: profile.id,
    }).select().single()

    setGuestName('')
    setGuestPhone('')
    setGuestMode(false)
    setSubmitting(false)
    fetchData()
  }

  // 게스트비 수납
  const toggleFeePaid = async (guestId: string, current: boolean, guest: Guest) => {
    await supabase.from('guests').update({ fee_paid: !current }).eq('id', guestId)

    if (!current && event) {
      await supabase.from('finance').insert({
        season: '2026-27',
        date: guest.join_date,
        category: '게스트비',
        description: `게스트비 - ${guest.name} (${event.title})`,
        amount: guest.fee,
        type: 'income',
        source: 'auto',
      })
    }
    fetchData()
  }

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

  const eventDates = getEventDates()
  const canApply = event.is_open &&
    (!event.deadline || new Date(event.deadline) > new Date())

  const selectedMembers = selectedDate ? getMembersByDate(selectedDate) : []
  const selectedGuests = selectedDate ? getGuestsByDate(selectedDate) : []

  const nights = joinDate && leaveDate
    ? Math.ceil((new Date(leaveDate).getTime() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <a href={`/events`} className="text-xs text-gray-400 hover:text-gray-600">← 행사 목록</a>
        {profile?.role === 'admin' && (
          <span className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
            운영진
          </span>
        )}
      </div>

      <h1 className="text-xl font-semibold mb-1">{event.title}</h1>
      <p className="text-sm text-gray-400 mb-6">
        {event.start_date} ~ {event.end_date}
        {event.location && ` · ${event.location}`}
      </p>

      {/* 범례 */}
      <div className="flex gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>부원
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>OB
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-400 inline-block"></span>게스트
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>나
        </span>
      </div>

      {/* 달력 */}
      <div className="border rounded-2xl overflow-hidden mb-6">
        {eventDates.map((date, idx) => {
          const members = getMembersByDate(date)
          const dayGuests = getGuestsByDate(date)
          const memberCount = members.filter(p => p.participant_type === 'member').length
          const obCount = members.filter(p => p.participant_type === 'ob').length
          const guestCount = dayGuests.length
          const isMyDate = joinDate && leaveDate && isInRange(date, joinDate, leaveDate)
          const isSelected = selectedDate === date
          const isFirst = idx === 0
          const isLast = idx === eventDates.length - 1

          return (
            <button
              key={date}
              onClick={() => setSelectedDate(isSelected ? null : date)}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors
                ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                ${!isLast ? 'border-b' : ''}
              `}
            >
              {/* 날짜 */}
              <div className={`flex-shrink-0 w-12 text-center rounded-xl py-2
                ${isMyDate ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-700'}
              `}>
                <p className="text-xs">
                  {new Date(date + 'T00:00:00').toLocaleDateString('ko-KR', { weekday: 'short' })}
                </p>
                <p className="text-base font-semibold">
                  {new Date(date + 'T00:00:00').getDate()}
                </p>
              </div>

              {/* 인원 현황 */}
              <div className="flex-1">
                <div className="flex gap-3">
                  {memberCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                      부원 {memberCount}
                    </span>
                  )}
                  {obCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-purple-600">
                      <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                      OB {obCount}
                    </span>
                  )}
                  {guestCount > 0 && (
                    <span className="flex items-center gap-1 text-xs text-orange-500">
                      <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
                      게스트 {guestCount}
                    </span>
                  )}
                  {memberCount + obCount + guestCount === 0 && (
                    <span className="text-xs text-gray-300">신청 없음</span>
                  )}
                </div>
                <div className="flex gap-1 mt-1.5">
                  {members.slice(0, 8).map(p => (
                    <div
                      key={p.id}
                      className={`w-5 h-5 rounded-full text-white text-[9px] flex items-center justify-center flex-shrink-0
                        ${p.user_id === profile?.id ? 'bg-green-500' :
                          p.participant_type === 'ob' ? 'bg-purple-400' : 'bg-blue-400'}
                      `}
                      title={p.profiles?.name ?? ''}
                    >
                      {p.profiles?.name?.[0] ?? '?'}
                    </div>
                  ))}
                  {dayGuests.slice(0, 4).map(g => (
                    <div
                      key={g.id}
                      className="w-5 h-5 rounded-full bg-orange-300 text-white text-[9px] flex items-center justify-center flex-shrink-0"
                      title={g.name}
                    >
                      {g.name[0]}
                    </div>
                  ))}
                  {members.length + dayGuests.length > 12 && (
                    <div className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-[9px] flex items-center justify-center">
                      +{members.length + dayGuests.length - 12}
                    </div>
                  )}
                </div>
              </div>

              {/* 총 인원 */}
              <div className="flex-shrink-0 text-right">
                <p className="text-lg font-semibold text-gray-700">
                  {memberCount + obCount + guestCount}
                </p>
                <p className="text-xs text-gray-400">명</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* 날짜 상세 패널 */}
      {selectedDate && (
        <div className="border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
                month: 'long', day: 'numeric', weekday: 'long'
              })}
            </h2>
            <span className="text-xs text-gray-400">
              총 {selectedMembers.length + selectedGuests.length}명
            </span>
          </div>

          {/* 부원·OB 목록 */}
          {selectedMembers.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">부원 · OB</p>
              <div className="flex flex-col gap-1.5">
                {selectedMembers.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center flex-shrink-0
                      ${p.user_id === profile?.id ? 'bg-green-500' :
                        p.participant_type === 'ob' ? 'bg-purple-400' : 'bg-blue-400'}
                    `}>
                      {p.profiles?.name?.[0] ?? '?'}
                    </div>
                    <span className="text-sm">{p.profiles?.name}</span>
                    <span className="text-xs text-gray-400">{p.profiles?.generation}기</span>
                    {p.participant_type === 'ob' && (
                      <span className="text-xs text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full">OB</span>
                    )}
                    {p.memo && (
                      <span className="text-xs text-gray-400 ml-auto">{p.memo}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 게스트 목록 */}
          {selectedGuests.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">게스트</p>
              <div className="flex flex-col gap-1.5">
                {selectedGuests.map(g => (
                  <div key={g.id} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-orange-300 text-white text-xs flex items-center justify-center flex-shrink-0">
                      {g.name[0]}
                    </div>
                    <span className="text-sm">{g.name}</span>
                    <span className="text-xs text-gray-400">{g.fee.toLocaleString()}원</span>
                    {profile?.role === 'admin' && (
                      <button
                        onClick={() => toggleFeePaid(g.id, g.fee_paid, g)}
                        className={`ml-auto text-xs px-2 py-1 rounded-lg transition-colors ${
                          g.fee_paid
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
                        }`}
                      >
                        {g.fee_paid ? '수납완료' : '미수납'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedMembers.length === 0 && selectedGuests.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">이 날 참여자가 없어요</p>
          )}

          {/* 운영진 게스트 추가 */}
          {profile?.role === 'admin' && (
            <div className="border-t pt-4 mt-2">
              {!guestMode ? (
                <button
                  onClick={() => setGuestMode(true)}
                  className="w-full text-sm text-blue-600 border border-blue-200 rounded-xl py-2.5 hover:bg-blue-50 transition-colors"
                >
                  + 게스트 추가
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-gray-500">게스트 추가</p>
                  <input
                    type="text"
                    placeholder="이름"
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className="border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="연락처 (선택)"
                    value={guestPhone}
                    onChange={e => setGuestPhone(e.target.value)}
                    className="border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="게스트비"
                    value={guestFee}
                    onChange={e => setGuestFee(e.target.value)}
                    className="border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddGuest}
                      disabled={submitting || !guestName}
                      className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      추가
                    </button>
                    <button
                      onClick={() => { setGuestMode(false); setGuestName(''); setGuestPhone('') }}
                      className="px-4 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-200"
                    >
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 내 참여 신청 */}
      {canApply && (
        <div className="border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">
              {myParticipation ? '내 신청 현황' : '참여 신청'}
            </h2>
            {myParticipation && !applyMode && (
              <button
                onClick={() => setApplyMode(true)}
                className="text-xs text-blue-500 hover:underline"
              >
                수정
              </button>
            )}
          </div>

          {myParticipation && !applyMode ? (
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {joinDate} ~ {leaveDate}
                {nights > 0 && <span className="text-gray-400 ml-1">({nights}박 {nights + 1}일)</span>}
              </p>
              {memo && <p className="text-xs text-gray-400">{memo}</p>}
              <button
                onClick={handleCancel}
                className="mt-3 text-xs text-red-400 hover:text-red-500"
              >
                신청 취소
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
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
                <p className="text-xs text-blue-600">
                  {nights > 0 ? `${nights}박 ${nights + 1}일` : '당일'}
                </p>
              )}
              <input
                type="text"
                placeholder="메모 (늦게 도착, 일찍 출발 등)"
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className="border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleApply}
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? '처리 중...' : myParticipation ? '수정하기' : '신청하기'}
                </button>
                {applyMode && (
                  <button
                    onClick={() => setApplyMode(false)}
                    className="px-4 bg-gray-100 text-gray-600 rounded-xl py-3 text-sm hover:bg-gray-200"
                  >
                    취소
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
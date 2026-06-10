'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

type Camp = {
  id: string
  title: string
  season: string
  start_date: string
  end_date: string
  location: string | null
  description: string | null
  guest_fee: number
  is_open: boolean
  deadline: string | null
}

type Participant = {
  id: string
  user_id: string
  participant_type: string
  join_date: string
  leave_date: string
  label: string | null
  memo: string | null
  profiles: { name: string; generation: number } | null
}

type Guest = {
  id: string
  name: string
  phone: string | null
  join_date: string
  leave_date: string
  fee: number
  fee_paid: boolean
}

export default function CampDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [camp, setCamp] = useState<Camp | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [profile, setProfile] = useState<{ id: string; role: string } | null>(null)
  const [myParticipations, setMyParticipations] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number } | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)

  const [newJoinDate, setNewJoinDate] = useState('')
  const [newLeaveDate, setNewLeaveDate] = useState('')
  const [newMemo, setNewMemo] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [addMode, setAddMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [guestMode, setGuestMode] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestJoinDate, setGuestJoinDate] = useState('')
  const [guestLeaveDate, setGuestLeaveDate] = useState('')
  const [guestFee, setGuestFee] = useState('')

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: campData }, { data: profileData }, { data: participantData }, { data: guestData }] =
      await Promise.all([
        supabase.from('camps').select('*').eq('id', id).single(),
        supabase.from('profiles').select('id, role').eq('id', user.id).single(),
        supabase.from('camp_participants')
          .select('*, profiles(name, generation)')
          .eq('camp_id', id),
        supabase.from('camp_guests').select('*').eq('camp_id', id),
      ])

    setCamp(campData)
    setProfile(profileData)
    setParticipants(participantData ?? [])
    setGuests(guestData ?? [])

    const mine = participantData?.filter(p => p.user_id === user.id) ?? []
    setMyParticipations(mine)

    if (campData) {
      const start = new Date(campData.start_date)
      setCurrentMonth({ year: start.getFullYear(), month: start.getMonth() })
      setNewJoinDate(campData.start_date)
      setNewLeaveDate(campData.end_date)
      setGuestFee(String(campData.guest_fee))
      setGuestJoinDate(campData.start_date)
      setGuestLeaveDate(campData.end_date)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const isInRange = (date: string, start: string, end: string) =>
    date >= start && date <= end

  const getMembersByDate = (date: string) =>
    participants.filter(p => isInRange(date, p.join_date, p.leave_date))

  const getGuestsByDate = (date: string) =>
    guests.filter(g => isInRange(date, g.join_date, g.leave_date))

  const getCalendarMonths = () => {
    if (!camp) return []
    const months: { year: number; month: number }[] = []
    const cur = new Date(new Date(camp.start_date).getFullYear(), new Date(camp.start_date).getMonth(), 1)
    const end = new Date(camp.end_date)
    while (cur <= end) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth() })
      cur.setMonth(cur.getMonth() + 1)
    }
    return months
  }

  const getDaysInMonth = (year: number, month: number) => {
    const days: (string | null)[] = []
    const firstDay = new Date(year, month, 1).getDay()
    const lastDate = new Date(year, month + 1, 0).getDate()
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= lastDate; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    return days
  }

  const handleDateClick = (date: string) => {
    if (!camp) return
    if (date < camp.start_date || date > camp.end_date) return
    setSelectedDate(date)
    setGuestJoinDate(date)
    setGuestLeaveDate(date)
    setGuestMode(false)
    setShowPanel(true)
  }

  const handleAddParticipation = async () => {
    if (!newJoinDate || !newLeaveDate || !camp || !profile) return
    setSubmitting(true)

    const label = newLabel || `${myParticipations.length + 1}차`

    await supabase.from('camp_participants').insert({
      camp_id: camp.id,
      user_id: profile.id,
      participant_type: profile.role === 'ob' ? 'ob' : 'member',
      join_date: newJoinDate,
      leave_date: newLeaveDate,
      label,
      memo: newMemo || null,
      status: 'confirmed',
    })

    setAddMode(false)
    setNewMemo('')
    setNewLabel('')
    setSubmitting(false)
    fetchData()
  }

  const handleDeleteParticipation = async (participationId: string) => {
    await supabase.from('camp_participants').delete().eq('id', participationId)
    fetchData()
  }

  const handleAddGuest = async () => {
    if (!guestName || !camp || !profile) return
    setSubmitting(true)

    await supabase.from('camp_guests').insert({
      camp_id: camp.id,
      name: guestName,
      phone: guestPhone || null,
      join_date: guestJoinDate,
      leave_date: guestLeaveDate,
      fee: parseInt(guestFee),
      fee_paid: false,
      registered_by: profile.id,
    })

    setGuestName('')
    setGuestPhone('')
    setGuestMode(false)
    setSubmitting(false)
    fetchData()
  }

  const toggleFeePaid = async (guestId: string, current: boolean) => {
    await supabase.from('camp_guests')
      .update({ fee_paid: !current })
      .eq('id', guestId)
    fetchData()
  }

  const handleDeleteGuest = async (guestId: string) => {
    await supabase.from('camp_guests').delete().eq('id', guestId)
    fetchData()
  }

  const getNights = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  if (!camp) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">합숙을 찾을 수 없어요</p>
    </div>
  )

  const calendarMonths = getCalendarMonths()
  const canApply = camp.is_open &&
    (!camp.deadline || new Date(camp.deadline) > new Date())
  const selectedMembers = selectedDate ? getMembersByDate(selectedDate) : []
  const selectedGuests = selectedDate ? getGuestsByDate(selectedDate) : []

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <a href="/camp" className="text-xs text-gray-400 hover:text-gray-600">← 합숙 목록</a>
        {profile?.role === 'admin' && (
          <div className="flex items-center gap-2">
            <a
              href={`/admin/camps/${id}/edit`}
              className="text-xs text-white px-3 py-1 rounded-lg"
              style={{ background: 'var(--ski-blue)' }}
            >
              수정
            </a>
            <span className="text-xs font-medium text-orange-500 bg-orange-50 px-2 py-1 rounded-full">
              운영진
            </span>
          </div>
        )}
      </div>

      <h1 className="text-xl font-semibold mb-1">{camp.title}</h1>
      <div className="flex flex-wrap gap-x-3 text-sm text-gray-400 mb-2">
        <span>📅 {camp.start_date} ~ {camp.end_date}</span>
        {camp.location && <span>📍 {camp.location}</span>}
      </div>
      {camp.description && (
        <p className="text-sm text-gray-500 mb-4">{camp.description}</p>
      )}

      {/* 참여 현황 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-blue-50 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-blue-400 mb-1">부원</p>
          <p className="text-2xl font-semibold text-blue-600">
            {[...new Set(participants.filter(p => p.participant_type === 'member').map(p => p.user_id))].length}
          </p>
        </div>
        <div className="bg-purple-50 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-purple-400 mb-1">OB</p>
          <p className="text-2xl font-semibold text-purple-600">
            {[...new Set(participants.filter(p => p.participant_type === 'ob').map(p => p.user_id))].length}
          </p>
        </div>
        <div className="bg-orange-50 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-orange-400 mb-1">게스트</p>
          <p className="text-2xl font-semibold text-orange-500">{guests.length}</p>
        </div>
      </div>

      {/* 달력 */}
      {currentMonth && (() => {
        const { year, month } = currentMonth
        const days = getDaysInMonth(year, month)
        const monthName = new Date(year, month, 1)
          .toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
        const currentIdx = calendarMonths.findIndex(m => m.year === year && m.month === month)
        const hasPrev = currentIdx > 0
        const hasNext = currentIdx < calendarMonths.length - 1

        return (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => hasPrev && setCurrentMonth(calendarMonths[currentIdx - 1])}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors ${
                  hasPrev ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-200 cursor-default'
                }`}
              >
                ‹
              </button>
              <p className="text-sm font-semibold text-gray-800">{monthName}</p>
              <button
                onClick={() => hasNext && setCurrentMonth(calendarMonths[currentIdx + 1])}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-lg transition-colors ${
                  hasNext ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-200 cursor-default'
                }`}
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                <div key={d} className={`text-center text-xs py-1 font-medium
                  ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}
                `}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />

                const isCampDate = date >= camp.start_date && date <= camp.end_date
                const members = getMembersByDate(date)
                const dayGuests = getGuestsByDate(date)
                const total = members.length + dayGuests.length
                const isMyDate = myParticipations.some(p => isInRange(date, p.join_date, p.leave_date))
                const isSelected = selectedDate === date
                const dayOfWeek = new Date(date + 'T00:00:00').getDay()
                const dayNum = parseInt(date.split('-')[2])

                return (
                  <button
                    key={date}
                    onClick={() => isCampDate && handleDateClick(date)}
                    className={`
                      relative flex flex-col items-center py-2 rounded-xl transition-all
                      ${!isCampDate ? 'opacity-25 cursor-default' : 'cursor-pointer'}
                      ${isSelected ? 'shadow-md scale-105' :
                        isMyDate && isCampDate ? 'bg-green-100' :
                        isCampDate ? 'hover:bg-gray-100' : ''}
                    `}
                    style={isSelected ? { background: 'var(--ski-blue)' } : {}}
                  >
                    <span className={`text-sm font-medium
                      ${isSelected ? 'text-white' :
                        dayOfWeek === 0 ? 'text-red-400' :
                        dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-700'}
                    `}>
                      {dayNum}
                    </span>

                    {isCampDate && total > 0 && (
                      <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[36px]">
                        {members.slice(0, 3).map(p => (
                          <div key={p.id} className={`w-1.5 h-1.5 rounded-full
                            ${isSelected ? 'bg-white opacity-80' :
                              p.user_id === profile?.id ? 'bg-green-500' :
                              p.participant_type === 'ob' ? 'bg-purple-400' : 'bg-blue-400'}
                          `} />
                        ))}
                        {dayGuests.slice(0, 2).map(g => (
                          <div key={g.id} className={`w-1.5 h-1.5 rounded-full
                            ${isSelected ? 'bg-white opacity-80' : 'bg-orange-400'}
                          `} />
                        ))}
                      </div>
                    )}

                    {isCampDate && total > 0 && (
                      <span className={`text-[10px] mt-0.5 font-medium
                        ${isSelected ? 'text-white opacity-90' : 'text-gray-400'}
                      `}>
                        {total}명
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {calendarMonths.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {calendarMonths.map((m, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentMonth(m)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === currentIdx ? 'bg-blue-600' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* 범례 */}
      <div className="flex gap-4 mb-6 text-xs text-gray-400 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>부원</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400 inline-block"></span>OB</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>게스트</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>나</span>
        <span className="flex items-center gap-1"><span className="w-4 h-4 rounded bg-green-100 inline-block"></span>내 참여기간</span>
      </div>

      {/* 날짜 상세 패널 */}
      {showPanel && selectedDate && (
        <div className="border rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
                month: 'long', day: 'numeric', weekday: 'long'
              })}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                총 {selectedMembers.length + selectedGuests.length}명
              </span>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-300 hover:text-gray-500 text-lg leading-none"
              >
                ✕
              </button>
            </div>
          </div>

          {selectedMembers.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">부원 · OB</p>
              <div className="flex flex-col gap-2">
                {selectedMembers.map(p => (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full text-white text-xs font-medium flex items-center justify-center flex-shrink-0
                      ${p.user_id === profile?.id ? 'bg-green-500' :
                        p.participant_type === 'ob' ? 'bg-purple-400' : 'bg-blue-400'}
                    `}>
                      {p.profiles?.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{p.profiles?.name}</span>
                      <span className="text-xs text-gray-400 ml-1.5">{p.profiles?.generation}기</span>
                      {p.participant_type === 'ob' && (
                        <span className="text-xs text-purple-500 bg-purple-50 px-1.5 py-0.5 rounded-full ml-1.5">OB</span>
                      )}
                      {p.label && (
                        <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full ml-1.5">{p.label}</span>
                      )}
                      {p.memo && <p className="text-xs text-gray-400 mt-0.5">{p.memo}</p>}
                    </div>
                    <span className="text-xs text-gray-300 flex-shrink-0">
                      ~{p.leave_date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedGuests.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-400 mb-2">게스트</p>
              <div className="flex flex-col gap-2">
                {selectedGuests.map(g => (
                  <div key={g.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-orange-300 text-white text-xs font-medium flex items-center justify-center flex-shrink-0">
                      {g.name[0]}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{g.name}</span>
                      <span className="text-xs text-gray-400 ml-1.5">{g.fee.toLocaleString()}원</span>
                    </div>
                    {profile?.role === 'admin' && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => toggleFeePaid(g.id, g.fee_paid)}
                          className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                            g.fee_paid
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
                          }`}
                        >
                          {g.fee_paid ? '수납완료' : '미수납'}
                        </button>
                        <button
                          onClick={() => handleDeleteGuest(g.id)}
                          className="text-gray-300 hover:text-red-400 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedMembers.length === 0 && selectedGuests.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">이 날 참여자가 없어요</p>
          )}

          {profile?.role === 'admin' && (
            <div className="border-t pt-4 mt-2">
              {!guestMode ? (
                <button
                  onClick={() => setGuestMode(true)}
                  className="w-full text-sm border border-blue-200 rounded-xl py-2.5 hover:bg-blue-50 transition-colors"
                  style={{ color: 'var(--ski-blue)' }}
                >
                  + 게스트 추가
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">게스트 추가</p>
                  <input type="text" placeholder="이름" value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className="border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  <input type="tel" placeholder="연락처 (선택)" value={guestPhone}
                    onChange={e => setGuestPhone(e.target.value)}
                    className="border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">도착일</label>
                      <input type="date" value={guestJoinDate}
                        min={camp.start_date} max={camp.end_date}
                        onChange={e => setGuestJoinDate(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">출발일</label>
                      <input type="date" value={guestLeaveDate}
                        min={guestJoinDate} max={camp.end_date}
                        onChange={e => setGuestLeaveDate(e.target.value)}
                        className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
                    </div>
                  </div>
                  <input type="number" placeholder="게스트비" value={guestFee}
                    onChange={e => setGuestFee(e.target.value)}
                    className="border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                  <div className="flex gap-2">
                    <button onClick={handleAddGuest} disabled={submitting || !guestName}
                      className="flex-1 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
                      style={{ background: 'var(--ski-blue)' }}>
                      {submitting ? '추가 중...' : '추가'}
                    </button>
                    <button onClick={() => { setGuestMode(false); setGuestName(''); setGuestPhone('') }}
                      className="px-4 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-sm hover:bg-gray-200">
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 내 참여 일정 */}
      {canApply && (
        <div className="border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">내 참여 일정</h2>
            {!addMode && (
              <button
                onClick={() => setAddMode(true)}
                className="text-xs hover:underline"
                style={{ color: 'var(--ski-blue)' }}
              >
                + 일정 추가
              </button>
            )}
          </div>

          {myParticipations.length === 0 && !addMode && (
            <p className="text-sm text-gray-400 text-center py-4">
              아직 신청한 일정이 없어요
            </p>
          )}

          {myParticipations.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {myParticipations.map(p => {
                const n = getNights(p.join_date, p.leave_date)
                return (
                  <div key={p.id} className="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          {p.label ?? '1차'}
                        </span>
                        <span className="text-sm text-gray-700">
                          {p.join_date} ~ {p.leave_date}
                        </span>
                        <span className="text-xs text-gray-400">
                          {n > 0 ? `${n}박 ${n + 1}일` : '당일'}
                        </span>
                      </div>
                      {p.memo && (
                        <p className="text-xs text-gray-400 mt-0.5">{p.memo}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteParticipation(p.id)}
                      className="text-gray-300 hover:text-red-400 text-sm flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {addMode && (
            <div className="flex flex-col gap-3 border-t pt-4">
              <p className="text-xs text-gray-400">추가할 참여 구간을 선택해주세요</p>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">구간 이름 (선택)</label>
                <input type="text"
                  placeholder={`${myParticipations.length + 1}차 (자동 입력)`}
                  value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">도착일</label>
                  <input type="date" value={newJoinDate}
                    min={camp.start_date} max={camp.end_date}
                    onChange={e => setNewJoinDate(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">출발일</label>
                  <input type="date" value={newLeaveDate}
                    min={newJoinDate || camp.start_date} max={camp.end_date}
                    onChange={e => setNewLeaveDate(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
                </div>
              </div>
              {newJoinDate && newLeaveDate && (
                <p className="text-xs" style={{ color: 'var(--ski-blue)' }}>
                  {getNights(newJoinDate, newLeaveDate) > 0
                    ? `${getNights(newJoinDate, newLeaveDate)}박 ${getNights(newJoinDate, newLeaveDate) + 1}일`
                    : '당일 참여'}
                </p>
              )}
              <input type="text" placeholder="메모 (늦게 도착, 일찍 출발 등)"
                value={newMemo} onChange={e => setNewMemo(e.target.value)}
                className="border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400" />
              <div className="flex gap-2">
                <button onClick={handleAddParticipation}
                  disabled={submitting || !newJoinDate || !newLeaveDate}
                  className="flex-1 text-white rounded-xl py-3 text-sm font-medium disabled:opacity-50"
                  style={{ background: 'var(--ski-blue)' }}>
                  {submitting ? '추가 중...' : '일정 추가'}
                </button>
                <button onClick={() => { setAddMode(false); setNewLabel(''); setNewMemo('') }}
                  className="px-4 bg-gray-100 text-gray-600 rounded-xl py-3 text-sm hover:bg-gray-200">
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!canApply && (
        <div className="bg-gray-50 rounded-2xl px-5 py-4 text-center">
          <p className="text-sm text-gray-400">신청이 마감됐어요</p>
        </div>
      )}
    </main>
  )
}
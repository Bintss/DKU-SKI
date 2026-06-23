'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import Link from 'next/link'

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
  profiles: { name: string; generation: number; avatar_url: string | null } | null
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
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [camp, setCamp] = useState<Camp | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [myParticipations, setMyParticipations] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState<{ year: number; month: number } | null>(null)

  // 날짜 상세 패널
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(false)

  // 신청 모드 (탭 선택 방식)
  const [applyMode, setApplyMode] = useState(false)
  const [selectStep, setSelectStep] = useState<'start' | 'end'>('start')
  const [selectedStart, setSelectedStart] = useState<string | null>(null)
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 게스트 추가
  const [guestMode, setGuestMode] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [guestJoinDate, setGuestJoinDate] = useState('')
  const [guestLeaveDate, setGuestLeaveDate] = useState('')
  const [guestFee, setGuestFee] = useState('')

  const fetchData = async () => {
    if (!profile) return

    const [{ data: campData }, { data: participantData }, { data: guestData }] =
      await Promise.all([
        supabase.from('camps').select('*').eq('id', id).single(),
        supabase.from('camp_participants')
          .select('*, profiles(name, generation, avatar_url)')
          .eq('camp_id', id),
        supabase.from('camp_guests').select('*').eq('camp_id', id),
      ])

    setCamp(campData)
    setParticipants(participantData ?? [])
    setGuests(guestData ?? [])

    const mine = participantData?.filter(p => p.user_id === profile.id) ?? []
    setMyParticipations(mine)

    if (campData) {
      const start = new Date(campData.start_date)
      setCurrentMonth({ year: start.getFullYear(), month: start.getMonth() })
      setGuestFee(String(campData.guest_fee))
      setGuestJoinDate(campData.start_date)
      setGuestLeaveDate(campData.end_date)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (profile) fetchData()
  }, [profile, id])

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

  const handleDateTap = (date: string) => {
    if (!camp) return
    if (date < camp.start_date || date > camp.end_date) return

    if (!applyMode) {
      if (selectedDate === date) {
        setSelectedDate(null)
        setShowPanel(false)
      } else {
        setSelectedDate(date)
        setShowPanel(true)
        setGuestJoinDate(date)
        setGuestLeaveDate(date)
        setGuestMode(false)
      }
      return
    }

    // 신청 모드 — 탭 선택
    if (selectStep === 'start') {
      setSelectedStart(date)
      setSelectedEnd(null)
      setSelectStep('end')
    } else {
      if (date < selectedStart!) {
        setSelectedStart(date)
        setSelectedEnd(null)
        setSelectStep('end')
      } else {
        setSelectedEnd(date)
      }
    }
  }

  const handleConfirmApply = async () => {
    if (!camp || !profile || !selectedStart || !selectedEnd) return
    setSubmitting(true)

    const label = `${myParticipations.length + 1}차`

    await supabase.from('camp_participants').insert({
      camp_id: camp.id,
      user_id: profile.id,
      participant_type: profile.role === 'ob' ? 'ob' : 'member',
      join_date: selectedStart,
      leave_date: selectedEnd,
      label,
      status: 'confirmed',
    })

    setApplyMode(false)
    setSelectedStart(null)
    setSelectedEnd(null)
    setSelectStep('start')
    setSubmitting(false)
    fetchData()
  }

  const handleDeleteParticipation = async (pid: string) => {
    await supabase.from('camp_participants').delete().eq('id', pid)
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
    await supabase.from('camp_guests').update({ fee_paid: !current }).eq('id', guestId)
    fetchData()
  }

  const handleDeleteGuest = async (guestId: string) => {
    await supabase.from('camp_guests').delete().eq('id', guestId)
    fetchData()
  }

  const getNights = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  if (!camp) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>합숙을 찾을 수 없어요</p>
    </div>
  )

  const calendarMonths = getCalendarMonths()
  const canApply = camp.is_open && (!camp.deadline || new Date(camp.deadline) > new Date())
  const selectedMembers = selectedDate ? getMembersByDate(selectedDate) : []
  const selectedGuests = selectedDate ? getGuestsByDate(selectedDate) : []

  return (
    <main className="max-w-lg mx-auto px-4 pb-40">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/camp" className="text-xs font-semibold"
  style={{ color: 'var(--text-tertiary)' }}>← 합숙</Link>
        {profile?.role === 'admin' && (
          <div className="flex items-center gap-2">
            <a href={`/admin/camps/${id}/edit`}
              className="text-xs font-black text-white px-3 py-1 rounded-lg btn-press"
              style={{ background: 'var(--ski-blue)' }}>
              수정
            </a>
            <span className="text-xs font-black px-2 py-1 rounded-full"
              style={{ background: 'rgba(230,126,34,0.2)', color: 'var(--accent-orange)' }}>
              운영진
            </span>
          </div>
        )}
      </div>

      {/* 캠프 정보 */}
      <div className="mb-5">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>
          {camp.season} · Ski Camp
        </p>
        <h1 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
          {camp.title}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {camp.start_date} — {camp.end_date}
          {camp.location && ` · ${camp.location}`}
        </p>
        {camp.description && (
          <p className="text-sm mt-2" style={{ color: 'var(--text-tertiary)' }}>
            {camp.description}
          </p>
        )}
      </div>

      {/* 참여 현황 요약 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: '부원', count: [...new Set(participants.filter(p => p.participant_type === 'member').map(p => p.user_id))].length, color: 'var(--accent-blue)', bg: 'rgba(27,63,171,0.15)' },
          { label: 'OB', count: [...new Set(participants.filter(p => p.participant_type === 'ob').map(p => p.user_id))].length, color: 'var(--accent-purple)', bg: 'rgba(155,89,182,0.15)' },
          { label: '게스트', count: guests.length, color: 'var(--accent-orange)', bg: 'rgba(230,126,34,0.15)' },
        ].map(item => (
          <div key={item.label} className="rounded-xl px-4 py-3 text-center"
            style={{ background: item.bg, border: `0.5px solid ${item.color}30` }}>
            <p className="text-2xl font-black" style={{ color: item.color }}>{item.count}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>{item.label}</p>
          </div>
        ))}
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
          <div className="mb-2">
            {/* 월 네비게이션 */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => hasPrev && setCurrentMonth(calendarMonths[currentIdx - 1])}
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                style={{
                  color: hasPrev ? 'var(--text-secondary)' : 'var(--text-hint)',
                  background: hasPrev ? 'var(--bg-card)' : 'transparent',
                  cursor: hasPrev ? 'pointer' : 'default',
                }}>‹</button>
              <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                {monthName}
              </p>
              <button onClick={() => hasNext && setCurrentMonth(calendarMonths[currentIdx + 1])}
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                style={{
                  color: hasNext ? 'var(--text-secondary)' : 'var(--text-hint)',
                  background: hasNext ? 'var(--bg-card)' : 'transparent',
                  cursor: hasNext ? 'pointer' : 'default',
                }}>›</button>
            </div>

            {/* 요일 */}
            <div className="grid grid-cols-7 mb-1">
              {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                <div key={d} className="text-center text-xs py-1 font-black"
                  style={{
                    color: i === 0 ? 'rgba(255,80,80,0.4)' :
                      i === 6 ? 'rgba(100,150,255,0.4)' : 'var(--text-hint)'
                  }}>{d}</div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((date, idx) => {
                if (!date) return <div key={`empty-${idx}`} />

                const isCampDate = date >= camp.start_date && date <= camp.end_date
                const members = getMembersByDate(date)
                const dayGuests = getGuestsByDate(date)
                const total = members.length + dayGuests.length
                const isMyDate = myParticipations.some(p => isInRange(date, p.join_date, p.leave_date))
                const dayNum = parseInt(date.split('-')[2])
                const dayOfWeek = new Date(date + 'T00:00:00').getDay()

                // 탭 선택 범위
                const isStart = applyMode && selectedStart === date && isCampDate
                const isEnd = applyMode && selectedEnd === date && isCampDate
                const isInApplyRange = applyMode && selectedStart && selectedEnd &&
                  date >= selectedStart && date <= selectedEnd && isCampDate
                const isSelected = selectedDate === date && !applyMode

                let bg = 'transparent'
                let borderRadius = '8px'
                let scale = 1
                let shadow = 'none'

                if (applyMode) {
                  if (isStart && isEnd) {
                    bg = '#1B3FAB'; borderRadius = '8px'; scale = 1.08
                    shadow = '0 4px 12px rgba(27,63,171,0.5)'
                  } else if (isStart) {
                    bg = '#1B3FAB'
                    borderRadius = selectedEnd ? '8px 0 0 8px' : '8px'
                    scale = 1.05; shadow = '0 4px 12px rgba(27,63,171,0.5)'
                  } else if (isEnd) {
                    bg = '#1B3FAB'; borderRadius = '0 8px 8px 0'
                    scale = 1.05; shadow = '0 4px 12px rgba(27,63,171,0.5)'
                  } else if (isInApplyRange) {
                    bg = 'rgba(27,63,171,0.2)'; borderRadius = '0'
                  }
                } else if (isSelected) {
                  bg = '#1B3FAB'; scale = 1.08
                  shadow = '0 4px 12px rgba(27,63,171,0.5)'
                } else if (isMyDate && isCampDate) {
                  bg = 'rgba(27,63,171,0.2)'
                }

                return (
                  <div
                    key={date}
                    className="relative flex flex-col items-center py-2 cursor-pointer"
                    style={{
                      borderRadius,
                      background: bg,
                      transform: `scale(${scale})`,
                      boxShadow: shadow,
                      transition: 'background 0.15s, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      opacity: isCampDate ? 1 : 0.15,
                      zIndex: scale > 1 ? 1 : 0,
                    }}
                    onClick={() => isCampDate && handleDateTap(date)}
                  >
                    <span className="text-xs font-black"
                      style={{
                        color: (isSelected || isStart || isEnd)
                          ? '#fff'
                          : dayOfWeek === 0 ? 'rgba(255,80,80,0.7)'
                          : dayOfWeek === 6 ? 'rgba(100,150,255,0.7)'
                          : 'var(--text-secondary)'
                      }}>
                      {dayNum}
                    </span>

                    {isCampDate && total > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center"
                        style={{ maxWidth: 28 }}>
                        {members.slice(0, 3).map(p => (
                          <div key={p.id} className="w-1 h-1 rounded-full"
                            style={{
                              background: (isSelected || isStart || isEnd || isInApplyRange)
                                ? 'rgba(255,255,255,0.6)'
                                : p.user_id === profile?.id ? 'var(--accent-green)'
                                : p.participant_type === 'ob' ? 'var(--accent-purple)'
                                : 'var(--accent-blue)'
                            }} />
                        ))}
                        {dayGuests.slice(0, 2).map(g => (
                          <div key={g.id} className="w-1 h-1 rounded-full"
                            style={{
                              background: (isSelected || isStart || isEnd)
                                ? 'rgba(255,255,255,0.6)' : 'var(--accent-orange)'
                            }} />
                        ))}
                      </div>
                    )}

                    {isCampDate && total > 0 && (
                      <span className="text-[9px] mt-0.5 font-black"
                        style={{
                          color: (isSelected || isStart || isEnd)
                            ? 'rgba(255,255,255,0.7)' : 'var(--text-hint)'
                        }}>
                        {total}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 인디케이터 */}
            {calendarMonths.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {calendarMonths.map((m, i) => (
                  <button key={i} onClick={() => setCurrentMonth(m)}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{ background: i === currentIdx ? 'var(--ski-blue)' : 'rgba(255,255,255,0.15)' }} />
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* 범례 */}
      <div className="flex gap-4 mt-4 mb-2 flex-wrap">
        {[
          { color: 'var(--accent-blue)', label: '부원' },
          { color: 'var(--accent-purple)', label: 'OB' },
          { color: 'var(--accent-orange)', label: '게스트' },
          { color: 'var(--accent-green)', label: '나' },
        ].map(item => (
          <span key={item.label} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: item.color }} />
            <span className="text-xs" style={{ color: 'var(--text-hint)' }}>{item.label}</span>
          </span>
        ))}
      </div>

      {/* 날짜 상세 패널 — 슬라이드업 */}
      {showPanel && selectedDate && !applyMode && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setShowPanel(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto"
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '20px 20px 0 0',
              borderTop: '0.5px solid var(--border-secondary)',
              animation: 'slideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
            }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-4"
              style={{ background: 'rgba(255,255,255,0.15)' }} />

            <div className="px-5 pb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', {
                    month: 'long', day: 'numeric', weekday: 'long'
                  })}
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                    총 {selectedMembers.length + selectedGuests.length}명
                  </span>
                  <button onClick={() => setShowPanel(false)}
                    className="text-lg leading-none" style={{ color: 'var(--text-hint)' }}>✕</button>
                </div>
              </div>

              {/* 부원·OB */}
              {selectedMembers.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-black tracking-widest uppercase mb-2"
                    style={{ color: 'var(--text-hint)' }}>부원 · OB</p>
                  <div className="flex flex-col gap-2">
                    {selectedMembers.map(p => (
                      <div key={p.id} className="flex items-center gap-2.5">
                        {p.profiles?.avatar_url ? (
                          <img src={p.profiles.avatar_url} alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                            style={{
                              background: p.user_id === profile?.id ? 'var(--accent-green)' :
                                p.participant_type === 'ob' ? 'rgba(155,89,182,0.5)' : 'var(--ski-blue)'
                            }}>
                            {p.profiles?.name?.[0] ?? '?'}
                          </div>
                        )}
                        <div className="flex-1">
                          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {p.profiles?.name}
                          </span>
                          <span className="text-xs ml-1.5" style={{ color: 'var(--text-hint)' }}>
                            {p.profiles?.generation}기
                          </span>
                          {p.participant_type === 'ob' && (
                            <span className="text-xs font-black ml-1.5 px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(155,89,182,0.2)', color: 'var(--accent-purple)' }}>
                              OB
                            </span>
                          )}
                          {p.label && (
                            <span className="text-xs font-black ml-1.5 px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(46,204,113,0.15)', color: 'var(--accent-green)' }}>
                              {p.label}
                            </span>
                          )}
                        </div>
                        <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-hint)' }}>
                          ~{p.leave_date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 게스트 */}
              {selectedGuests.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-black tracking-widest uppercase mb-2"
                    style={{ color: 'var(--text-hint)' }}>게스트</p>
                  <div className="flex flex-col gap-2">
                    {selectedGuests.map(g => (
                      <div key={g.id} className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{ background: 'rgba(230,126,34,0.4)' }}>
                          {g.name[0]}
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                            {g.name}
                          </span>
                          <span className="text-xs ml-1.5" style={{ color: 'var(--text-hint)' }}>
                            {g.fee.toLocaleString()}원
                          </span>
                        </div>
                        {profile?.role === 'admin' && (
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => toggleFeePaid(g.id, g.fee_paid)}
                              className="text-xs font-black px-2.5 py-1 rounded-lg btn-press"
                              style={{
                                background: g.fee_paid ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.06)',
                                color: g.fee_paid ? 'var(--accent-green)' : 'var(--text-tertiary)',
                              }}>
                              {g.fee_paid ? '수납완료' : '미수납'}
                            </button>
                            <button onClick={() => handleDeleteGuest(g.id)}
                              className="text-sm" style={{ color: 'rgba(255,107,107,0.4)' }}>✕</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedMembers.length === 0 && selectedGuests.length === 0 && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--text-hint)' }}>
                  이 날 참여자가 없어요
                </p>
              )}

              {/* 게스트 추가 (운영진) */}
              {profile?.role === 'admin' && (
                <div className="pt-4" style={{ borderTop: '0.5px solid var(--border-primary)' }}>
                  {!guestMode ? (
                    <button onClick={() => setGuestMode(true)}
                      className="w-full text-sm font-black py-2.5 rounded-xl btn-press"
                      style={{
                        background: 'rgba(27,63,171,0.15)',
                        border: '0.5px solid rgba(27,63,171,0.3)',
                        color: 'var(--accent-blue)',
                      }}>
                      + 게스트 추가
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-black tracking-widest uppercase mb-1"
                        style={{ color: 'var(--text-hint)' }}>게스트 추가</p>
                      {[
                        { placeholder: '이름', value: guestName, onChange: setGuestName, type: 'text' },
                        { placeholder: '연락처 (선택)', value: guestPhone, onChange: setGuestPhone, type: 'tel' },
                      ].map((field, i) => (
                        <input key={i} type={field.type} placeholder={field.placeholder}
                          value={field.value} onChange={e => field.onChange(e.target.value)}
                          className="rounded-xl px-3 py-2.5 text-sm"
                          style={{
                            background: 'var(--bg-tertiary)',
                            border: '0.5px solid var(--border-primary)',
                            color: 'var(--text-primary)',
                          }} />
                      ))}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: '도착일', value: guestJoinDate, onChange: setGuestJoinDate },
                          { label: '출발일', value: guestLeaveDate, onChange: setGuestLeaveDate },
                        ].map(field => (
                          <div key={field.label}>
                            <label className="text-xs mb-1 block" style={{ color: 'var(--text-hint)' }}>
                              {field.label}
                            </label>
                            <input type="date" value={field.value}
                              min={camp.start_date} max={camp.end_date}
                              onChange={e => field.onChange(e.target.value)}
                              className="w-full rounded-xl px-3 py-2 text-sm"
                              style={{
                                background: 'var(--bg-tertiary)',
                                border: '0.5px solid var(--border-primary)',
                                color: 'var(--text-primary)',
                              }} />
                          </div>
                        ))}
                      </div>
                      <input type="number" placeholder="게스트비" value={guestFee}
                        onChange={e => setGuestFee(e.target.value)}
                        className="rounded-xl px-3 py-2.5 text-sm"
                        style={{
                          background: 'var(--bg-tertiary)',
                          border: '0.5px solid var(--border-primary)',
                          color: 'var(--text-primary)',
                        }} />
                      <div className="flex gap-2">
                        <button onClick={handleAddGuest} disabled={submitting || !guestName}
                          className="flex-1 text-white rounded-xl py-2.5 text-sm font-black disabled:opacity-50 btn-press"
                          style={{ background: 'var(--ski-blue)' }}>
                          {submitting ? '추가 중...' : '추가'}
                        </button>
                        <button onClick={() => { setGuestMode(false); setGuestName(''); setGuestPhone('') }}
                          className="px-4 rounded-xl py-2.5 text-sm font-black btn-press"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }}>
                          취소
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 고정 하단 바 */}
      {canApply && (
        <div className="fixed bottom-0 left-0 right-0 z-30 max-w-lg mx-auto"
          style={{
            background: 'rgba(22,22,30,0.95)',
            backdropFilter: 'blur(12px)',
            borderTop: '0.5px solid var(--border-primary)',
            padding: '12px 20px 28px',
          }}>
          {!applyMode ? (
            <div>
              {myParticipations.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-black tracking-widest uppercase mb-2"
                    style={{ color: 'var(--text-hint)' }}>내 참여 일정</p>
                  <div className="flex flex-col gap-1.5">
                    {myParticipations.map(p => {
                      const n = getNights(p.join_date, p.leave_date)
                      return (
                        <div key={p.id} className="flex items-center gap-2 rounded-xl px-3 py-2"
                          style={{ background: 'rgba(27,63,171,0.15)', border: '0.5px solid rgba(27,63,171,0.3)' }}>
                          <span className="text-xs font-black px-1.5 py-0.5 rounded-full"
                            style={{ background: 'rgba(27,63,171,0.3)', color: 'var(--accent-blue)' }}>
                            {p.label ?? '1차'}
                          </span>
                          <span className="text-xs font-bold flex-1" style={{ color: 'var(--accent-blue)' }}>
                            {p.join_date.slice(5)} — {p.leave_date.slice(5)}
                            <span className="font-normal ml-1" style={{ color: 'var(--text-hint)' }}>
                              {n > 0 ? `${n}박` : '당일'}
                            </span>
                          </span>
                          <button onClick={() => handleDeleteParticipation(p.id)}
                            className="text-xs" style={{ color: 'rgba(255,107,107,0.5)' }}>✕</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <button onClick={() => {
                setApplyMode(true)
                setSelectedStart(null)
                setSelectedEnd(null)
                setSelectStep('start')
                setShowPanel(false)
              }}
                className="w-full text-white rounded-xl py-3 text-sm font-black btn-press"
                style={{ background: 'var(--ski-blue)' }}>
                + 일정 추가
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs font-black tracking-widest uppercase mb-3"
                style={{ color: 'var(--text-hint)' }}>
                {selectStep === 'start' ? '📍 달력에서 도착일을 탭하세요' : '📍 달력에서 출발일을 탭하세요'}
              </p>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 rounded-xl px-3 py-2.5 text-center"
                  style={{
                    background: selectStep === 'start' && !selectedStart
                      ? 'rgba(27,63,171,0.25)' : selectedStart
                      ? 'rgba(27,63,171,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${selectStep === 'start'
                      ? 'rgba(27,63,171,0.6)' : 'var(--border-primary)'}`,
                  }}>
                  <p className="text-xs font-black mb-0.5"
                    style={{ color: selectStep === 'start' ? 'var(--accent-blue)' : 'var(--text-hint)' }}>
                    {selectStep === 'start' && !selectedStart ? '탭하여 선택' : '도착일'}
                  </p>
                  <p className="text-sm font-black"
                    style={{ color: selectedStart ? 'var(--text-primary)' : 'var(--text-hint)' }}>
                    {selectedStart ? selectedStart.slice(5) : '—'}
                  </p>
                </div>

                <span style={{ color: 'var(--text-hint)' }}>→</span>

                <div className="flex-1 rounded-xl px-3 py-2.5 text-center"
                  style={{
                    background: selectStep === 'end' && !selectedEnd
                      ? 'rgba(27,63,171,0.25)' : selectedEnd
                      ? 'rgba(27,63,171,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${selectStep === 'end'
                      ? 'rgba(27,63,171,0.6)' : 'var(--border-primary)'}`,
                  }}>
                  <p className="text-xs font-black mb-0.5"
                    style={{ color: selectStep === 'end' ? 'var(--accent-blue)' : 'var(--text-hint)' }}>
                    {selectStep === 'end' && !selectedEnd ? '탭하여 선택' : '출발일'}
                  </p>
                  <p className="text-sm font-black"
                    style={{ color: selectedEnd ? 'var(--text-primary)' : 'var(--text-hint)' }}>
                    {selectedEnd ? selectedEnd.slice(5) : '—'}
                  </p>
                </div>
              </div>

              {selectedStart && selectedEnd && (
                <p className="text-xs text-center mb-3 font-black" style={{ color: 'var(--text-hint)' }}>
                  {getNights(selectedStart, selectedEnd) > 0
                    ? `${getNights(selectedStart, selectedEnd)}박 ${getNights(selectedStart, selectedEnd) + 1}일`
                    : '당일'}
                </p>
              )}

              <div className="flex gap-2">
                <button onClick={handleConfirmApply}
                  disabled={submitting || !selectedStart || !selectedEnd}
                  className="flex-1 text-white rounded-xl py-3 text-sm font-black disabled:opacity-40 btn-press"
                  style={{ background: 'var(--ski-blue)' }}>
                  {submitting ? '...' : '확정'}
                </button>
                <button onClick={() => {
                  setApplyMode(false)
                  setSelectedStart(null)
                  setSelectedEnd(null)
                  setSelectStep('start')
                }}
                  className="rounded-xl px-4 py-3 text-sm font-black btn-press"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }}>
                  취소
                </button>
              </div>

              {selectedStart && (
                <button
                  onClick={() => { setSelectedStart(null); setSelectedEnd(null); setSelectStep('start') }}
                  className="w-full text-xs text-center mt-2 font-black"
                  style={{ color: 'var(--text-hint)' }}>
                  다시 선택
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
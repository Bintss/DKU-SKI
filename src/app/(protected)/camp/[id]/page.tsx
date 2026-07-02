'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'
import Link from 'next/link'

type Camp = {
  id: string
  title: string
  start_date: string
  end_date: string
  location: string | null
  description: string | null
  is_open: boolean
  deadline: string | null
  max_participants: number | null
  guest_fee: number | null
  created_by: string
}

type Participant = {
  id: string
  user_id: string
  join_date: string
  leave_date: string
  participant_type: string
  profiles: { name: string; generation: number; avatar_url: string | null } | null
}

type Guest = {
  id: string
  name: string
  join_date: string
  leave_date: string
  fee_paid: boolean
  registered_by: string
}

type MyParticipation = {
  id: string
  join_date: string
  leave_date: string
}

function getDatesInRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start)
  const endDate = new Date(end)
  while (current <= endDate) {
    dates.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  return { firstDay, daysInMonth }
}

export default function CampDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [camp, setCamp] = useState<Camp | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [myParticipation, setMyParticipation] = useState<MyParticipation | null>(null)
  const [loading, setLoading] = useState(true)

  // 날짜 선택
  const [applyMode, setApplyMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear())
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth())
  const [applying, setApplying] = useState(false)

  // 게스트 관리
  const [showGuestPanel, setShowGuestPanel] = useState(false)
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestDates, setGuestDates] = useState<string[]>([])
  const [addingGuest, setAddingGuest] = useState(false)

  const fetchData = useCallback(async () => {
    if (!profile) return
    const [{ data: campData }, { data: participantData }, { data: guestData }] = await Promise.all([
      supabase.from('camps').select('*').eq('id', id).single(),
      supabase.from('camp_participants')
        .select('*, profiles(name, generation, avatar_url)')
        .eq('camp_id', id),
      supabase.from('camp_guests').select('*').eq('camp_id', id),
    ])

    setCamp(campData)
    setParticipants(participantData ?? [])
    setGuests(guestData ?? [])

    const mine = participantData?.find(p => p.user_id === profile.id)
    setMyParticipation(mine ?? null)

    if (campData) {
      setCalendarYear(new Date(campData.start_date).getFullYear())
      setCalendarMonth(new Date(campData.start_date).getMonth())
    }

    if (mine) {
      setSelectedDates(getDatesInRange(mine.join_date, mine.leave_date))
    }

    setLoading(false)
  }, [profile, id, supabase])

  useEffect(() => { if (profile) fetchData() }, [profile, fetchData])
  usePageVisibilityRefetch(fetchData, { enabled: !!profile && !applyMode, debounceMs: 2000 })

  const campDates = camp ? getDatesInRange(camp.start_date, camp.end_date) : []

  const handleDateToggle = (date: string) => {
    if (!campDates.includes(date)) return
    setSelectedDates(prev => {
      if (prev.includes(date)) {
        const next = prev.filter(d => d !== date).sort()
        if (next.length === 0) return []
        return getDatesInRange(next[0], next[next.length - 1])
      } else {
        const next = [...prev, date].sort()
        return getDatesInRange(next[0], next[next.length - 1])
      }
    })
  }

  const handleApply = async () => {
    if (!profile || !camp || selectedDates.length === 0) return
    setApplying(true)
    const sorted = [...selectedDates].sort()
    const joinDate = sorted[0]
    const leaveDate = sorted[sorted.length - 1]

    if (myParticipation) {
      await supabase.from('camp_participants')
        .update({ join_date: joinDate, leave_date: leaveDate })
        .eq('id', myParticipation.id)
    } else {
      await supabase.from('camp_participants').insert({
        camp_id: id, user_id: profile.id,
        join_date: joinDate, leave_date: leaveDate,
        participant_type: 'member',
      })
    }
    setApplyMode(false)
    setApplying(false)
    fetchData()
  }

  const handleCancelApply = async () => {
    if (!myParticipation) return
    if (!confirm('참가 신청을 취소할까요?')) return
    await supabase.from('camp_participants').delete().eq('id', myParticipation.id)
    setMyParticipation(null)
    setSelectedDates([])
    fetchData()
  }

  const handleAddGuest = async () => {
    if (!profile || !guestName || guestDates.length === 0) return
    setAddingGuest(true)
    const sorted = [...guestDates].sort()
    await supabase.from('camp_guests').insert({
      camp_id: id, name: guestName,
      join_date: sorted[0], leave_date: sorted[sorted.length - 1],
      fee_paid: false, registered_by: profile.id,
    })
    setGuestName('')
    setGuestDates([])
    setShowAddGuest(false)
    setAddingGuest(false)
    fetchData()
  }

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('게스트를 삭제할까요?')) return
    await supabase.from('camp_guests').delete().eq('id', guestId)
    fetchData()
  }

  const handleToggleFeePaid = async (guest: Guest) => {
    await supabase.from('camp_guests')
      .update({ fee_paid: !guest.fee_paid })
      .eq('id', guest.id)
    fetchData()
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short'
    })

  const getNights = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))

  const daysLeft = (deadline: string | null) => {
    if (!deadline) return null
    const diff = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return '마감'
    if (diff === 0) return '오늘 마감'
    return `D-${diff}`
  }

  // 달력 렌더링
  const renderCalendar = (forGuest = false) => {
    const { firstDay, daysInMonth } = getMonthDays(calendarYear, calendarMonth)
    const activeDates = forGuest ? guestDates : selectedDates
    const setActiveDates = forGuest ? setGuestDates : setSelectedDates

    const handleToggle = (date: string) => {
      if (!campDates.includes(date)) return
      setActiveDates((prev: string[]) => {
        if (prev.includes(date)) {
          const next = prev.filter(d => d !== date).sort()
          if (next.length === 0) return []
          return getDatesInRange(next[0], next[next.length - 1])
        } else {
          const next = [...prev, date].sort()
          return getDatesInRange(next[0], next[next.length - 1])
        }
      })
    }

    const monthName = new Date(calendarYear, calendarMonth).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long'
    })

    return (
      <div>
        {/* 달력 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => {
              if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1) }
              else setCalendarMonth(m => m - 1)
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg btn-press"
            style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>‹</span>
          </button>
          <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>{monthName}</p>
          <button
            onClick={() => {
              if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1) }
              else setCalendarMonth(m => m + 1)
            }}
            className="w-8 h-8 flex items-center justify-center rounded-lg btn-press"
            style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)' }}>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>›</span>
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div key={d} className="text-center py-1"
              style={{
                fontSize: 11, fontWeight: 700,
                color: i === 0 ? 'var(--accent-red)' : i === 6 ? 'var(--dku-blue)' : 'var(--text-hint)',
              }}>
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isCampDate = campDates.includes(dateStr)
            const isSelected = activeDates.includes(dateStr)
            const isStart = activeDates.length > 0 && dateStr === [...activeDates].sort()[0]
            const isEnd = activeDates.length > 0 && dateStr === [...activeDates].sort()[activeDates.length - 1]
            const isMiddle = isSelected && !isStart && !isEnd
            const dayOfWeek = new Date(dateStr).getDay()

            return (
              <button
                key={dateStr}
                onClick={() => handleToggle(dateStr)}
                disabled={!isCampDate}
                className="relative h-9 flex items-center justify-center text-sm font-bold transition-colors"
                style={{
                  borderRadius: isStart ? '8px 0 0 8px' : isEnd ? '0 8px 8px 0' : isMiddle ? '0' : '8px',
                  background: isSelected
                    ? (isStart || isEnd)
                      ? 'var(--dku-blue-primary)'
                      : 'var(--ski-blue-50)'
                    : isCampDate ? 'transparent' : 'transparent',
                  color: isSelected
                    ? (isStart || isEnd) ? '#fff' : 'var(--dku-blue-primary)'
                    : isCampDate
                      ? dayOfWeek === 0 ? 'var(--accent-red)'
                      : dayOfWeek === 6 ? 'var(--dku-blue)'
                      : 'var(--text-primary)'
                    : 'var(--text-hint)',
                  opacity: !isCampDate ? 0.3 : 1,
                  cursor: isCampDate ? 'pointer' : 'default',
                }}>
                {day}
              </button>
            )
          })}
        </div>

        {/* 선택된 날짜 요약 */}
        {activeDates.length > 0 && (
          <div className="mt-3 p-3 rounded-xl"
            style={{ background: 'var(--ski-blue-50)', border: '1px solid var(--dku-blue-light)' }}>
            <p className="text-xs font-black" style={{ color: 'var(--dku-blue-primary)' }}>
              선택된 기간
            </p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--dku-blue-primary)' }}>
              {formatDate([...activeDates].sort()[0])} ~{' '}
              {formatDate([...activeDates].sort()[activeDates.length - 1])}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--dku-blue)' }}>
              {getNights(
                [...activeDates].sort()[0],
                [...activeDates].sort()[activeDates.length - 1]
              )}박 {activeDates.length}일
            </p>
          </div>
        )}
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'
  const isPastDeadline = camp?.deadline ? new Date(camp.deadline) < new Date() : false

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

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <Link href="/camp" className="text-xs font-semibold"
          style={{ color: 'var(--text-tertiary)' }}>← 합숙</Link>
        {isAdmin && (
          <a href={`/admin/camps/${id}/edit`}
            className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            수정
          </a>
        )}
      </div>

      {/* 합숙 헤더 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{
                  background: camp.is_open ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.08)',
                  color: camp.is_open ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>
                {camp.is_open ? '신청 중' : '신청 마감'}
              </span>
              {camp.deadline && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(202,138,10,0.1)', color: 'var(--accent-yellow)' }}>
                  {daysLeft(camp.deadline)}
                </span>
              )}
            </div>
            <h1 className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              {camp.title}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {formatDate(camp.start_date)} ~ {formatDate(camp.end_date)}
              {' · '}{getNights(camp.start_date, camp.end_date)}박
            </p>
            {camp.location && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                📍 {camp.location}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-black" style={{ color: 'var(--dku-blue-primary)' }}>
              {getNights(camp.start_date, camp.end_date)}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-hint)' }}>박</p>
          </div>
        </div>

        {camp.description && (
          <p className="text-sm leading-relaxed pt-3 mt-3 whitespace-pre-wrap"
            style={{ borderTop: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
            {camp.description}
          </p>
        )}

        {camp.guest_fee && (
          <div className="flex items-center justify-between mt-3 pt-3"
            style={{ borderTop: '1px solid var(--border-primary)' }}>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>게스트 참가비</span>
            <span className="text-sm font-black" style={{ color: 'var(--dku-blue-primary)' }}>
              {camp.guest_fee.toLocaleString()}원
            </span>
          </div>
        )}
      </div>

      {/* 참가 신청 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>참가 신청</h2>

        {applyMode ? (
          <div className="flex flex-col gap-3">
            {renderCalendar()}
            <div className="flex gap-2 mt-1">
              <button onClick={handleApply}
                disabled={applying || selectedDates.length === 0}
                className="flex-1 rounded-xl py-3 text-sm font-black disabled:opacity-50 btn-press"
                style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                {applying ? '처리 중...' : myParticipation ? '수정 완료' : '신청 완료'}
              </button>
              <button onClick={() => {
                setApplyMode(false)
                if (myParticipation) {
                  setSelectedDates(getDatesInRange(myParticipation.join_date, myParticipation.leave_date))
                } else {
                  setSelectedDates([])
                }
              }}
                className="px-4 rounded-xl text-sm font-black btn-press"
                style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
                취소
              </button>
            </div>
          </div>
        ) : myParticipation ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--accent-green)' }}>
                신청 완료
              </span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {formatDate(myParticipation.join_date)} ~ {formatDate(myParticipation.leave_date)}
              </span>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--text-hint)' }}>
              {getNights(myParticipation.join_date, myParticipation.leave_date)}박{' '}
              {getDatesInRange(myParticipation.join_date, myParticipation.leave_date).length}일
            </p>
            <div className="flex gap-2">
              <button onClick={() => setApplyMode(true)}
                className="flex-1 rounded-xl py-2.5 text-sm font-black btn-press"
                style={{ background: 'var(--ski-blue-50)', border: '1px solid var(--dku-blue-light)', color: 'var(--dku-blue-primary)' }}>
                날짜 수정
              </button>
              <button onClick={handleCancelApply}
                className="flex-1 rounded-xl py-2.5 text-sm font-black btn-press"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--accent-red)' }}>
                신청 취소
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setApplyMode(true)}
            disabled={isPastDeadline || !camp.is_open}
            className="w-full rounded-xl py-3 text-sm font-black disabled:opacity-40 btn-press"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            {!camp.is_open ? '신청 마감' : isPastDeadline ? '신청 기간 종료' : '참가 신청하기'}
          </button>
        )}
      </div>

      {/* 참가 현황 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>
          참가 현황 {participants.length}명
          {camp.max_participants && (
            <span className="ml-1 font-normal" style={{ color: 'var(--text-hint)' }}>
              / {camp.max_participants}명
            </span>
          )}
        </h2>

        {participants.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-hint)' }}>
            아직 신청한 부원이 없어요
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {participants.map(p => {
              const nights = getNights(p.join_date, p.leave_date)
              const days = getDatesInRange(p.join_date, p.leave_date).length
              return (
                <div key={p.id} className="flex items-center gap-3 py-2"
                  style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  {p.profiles?.avatar_url ? (
                    <img src={p.profiles.avatar_url} alt={p.profiles.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                      style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                      {p.profiles?.name?.[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {p.profiles?.name}
                      <span className="ml-1 font-normal text-xs" style={{ color: 'var(--text-hint)' }}>
                        {p.profiles?.generation}기
                      </span>
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                      {formatDate(p.join_date)} ~ {formatDate(p.leave_date)} · {nights}박 {days}일
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 게스트 관리 (운영진) */}
      {isAdmin && (
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ background: 'rgba(0,60,117,0.04)', border: '1px solid var(--dku-blue-light)' }}>
          <button
            onClick={() => setShowGuestPanel(!showGuestPanel)}
            className="w-full flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-xs font-black tracking-widest uppercase text-left"
                style={{ color: 'var(--dku-blue)' }}>
                게스트 관리
              </p>
              <p className="text-xs mt-0.5 text-left" style={{ color: 'var(--text-tertiary)' }}>
                총 {guests.length}명
                {camp.guest_fee ? ` · 참가비 ${camp.guest_fee.toLocaleString()}원` : ''}
              </p>
            </div>
            <span className="text-xs font-black" style={{ color: 'var(--dku-blue)' }}>
              {showGuestPanel ? '접기 ▲' : '펼치기 ▼'}
            </span>
          </button>

          {showGuestPanel && (
            <div className="px-5 pb-5"
              style={{ borderTop: '1px solid var(--dku-blue-light)' }}>

              {/* 게스트 목록 */}
              {guests.length > 0 && (
                <div className="flex flex-col gap-2 mt-4 mb-4">
                  {guests.map(guest => (
                    <div key={guest.id} className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ background: '#fff', border: '1px solid var(--border-primary)' }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                        style={{ background: 'var(--muted-gold)', color: '#fff' }}>
                        {guest.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {guest.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                          {formatDate(guest.join_date)} ~ {formatDate(guest.leave_date)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {camp.guest_fee && (
                          <button
                            onClick={() => handleToggleFeePaid(guest)}
                            className="text-xs font-black px-2 py-1 rounded-lg btn-press"
                            style={{
                              background: guest.fee_paid ? 'rgba(22,163,74,0.1)' : 'var(--surface-low)',
                              color: guest.fee_paid ? 'var(--accent-green)' : 'var(--text-hint)',
                              border: `1px solid ${guest.fee_paid ? 'rgba(22,163,74,0.2)' : 'var(--border-primary)'}`,
                            }}>
                            {guest.fee_paid ? '납부완료' : '미납'}
                          </button>
                        )}
                        <button onClick={() => handleDeleteGuest(guest.id)}
                          className="text-xs font-black btn-press"
                          style={{ color: 'var(--accent-red)' }}>
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 게스트 추가 */}
              {showAddGuest ? (
                <div className="flex flex-col gap-3 p-4 rounded-xl"
                  style={{ background: '#fff', border: '1px solid var(--border-primary)' }}>
                  <input type="text" placeholder="게스트 이름" value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm"
                    style={{
                      background: 'var(--surface-low)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }} />
                  {renderCalendar(true)}
                  <div className="flex gap-2">
                    <button onClick={handleAddGuest}
                      disabled={addingGuest || !guestName || guestDates.length === 0}
                      className="flex-1 rounded-xl py-2.5 text-sm font-black disabled:opacity-50 btn-press"
                      style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                      {addingGuest ? '추가 중...' : '게스트 추가'}
                    </button>
                    <button onClick={() => { setShowAddGuest(false); setGuestName(''); setGuestDates([]) }}
                      className="px-4 rounded-xl text-sm font-black btn-press"
                      style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowAddGuest(true)}
                  className="w-full mt-2 rounded-xl py-2.5 text-sm font-black btn-press"
                  style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                  + 게스트 추가
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
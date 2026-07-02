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
  const [applyMode, setApplyMode] = useState(false)
  const [joinDate, setJoinDate] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [applying, setApplying] = useState(false)

  // 게스트 추가 모드
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [guestName, setGuestName] = useState('')
  const [guestJoin, setGuestJoin] = useState('')
  const [guestLeave, setGuestLeave] = useState('')
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
    if (mine) { setJoinDate(mine.join_date); setLeaveDate(mine.leave_date) }
    else if (campData) { setJoinDate(campData.start_date); setLeaveDate(campData.end_date) }
    setLoading(false)
  }, [profile, id, supabase])

  useEffect(() => { if (profile) fetchData() }, [profile, fetchData])
  usePageVisibilityRefetch(fetchData, { enabled: !!profile && !applyMode, debounceMs: 2000 })

  const handleApply = async () => {
    if (!profile || !camp || !joinDate || !leaveDate) return
    setApplying(true)
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
    setApplyMode(false); setApplying(false); fetchData()
  }

  const handleCancel = async () => {
    if (!myParticipation) return
    await supabase.from('camp_participants').delete().eq('id', myParticipation.id)
    setMyParticipation(null); fetchData()
  }

  const handleAddGuest = async () => {
    if (!profile || !guestName || !guestJoin || !guestLeave) return
    setAddingGuest(true)
    await supabase.from('camp_guests').insert({
      camp_id: id, name: guestName,
      join_date: guestJoin, leave_date: guestLeave,
      fee_paid: false, registered_by: profile.id,
    })
    setGuestName(''); setGuestJoin(''); setGuestLeave('')
    setShowAddGuest(false); setAddingGuest(false); fetchData()
  }

  const handleDeleteGuest = async (guestId: string) => {
    if (!confirm('게스트를 삭제할까요?')) return
    await supabase.from('camp_guests').delete().eq('id', guestId)
    fetchData()
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  const getNights = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))

  const daysLeft = (deadline: string | null) => {
    if (!deadline) return null
    const diff = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return '마감'
    if (diff === 0) return '오늘 마감'
    return `D-${diff}`
  }

  const isAdmin = profile?.role === 'admin'
  const isPastDeadline = camp?.deadline ? new Date(camp.deadline) < new Date() : false

  const inputStyle = {
    background: '#fff',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  }

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
        <Link href="/camp" className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
          ← 합숙
        </Link>
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
              {getNights(camp.start_date, camp.end_date) > 0 &&
                ` · ${getNights(camp.start_date, camp.end_date)}박`}
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>참가 시작일</label>
                <input type="date" value={joinDate}
                  min={camp.start_date} max={camp.end_date}
                  onChange={e => setJoinDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>참가 종료일</label>
                <input type="date" value={leaveDate}
                  min={joinDate || camp.start_date} max={camp.end_date}
                  onChange={e => setLeaveDate(e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleApply} disabled={applying || !joinDate || !leaveDate}
                className="flex-1 rounded-xl py-3 text-sm font-black disabled:opacity-50 btn-press"
                style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                {applying ? '처리 중...' : myParticipation ? '수정 완료' : '신청 완료'}
              </button>
              <button onClick={() => setApplyMode(false)}
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
            <div className="flex gap-2">
              <button onClick={() => setApplyMode(true)}
                className="flex-1 rounded-xl py-2.5 text-sm font-black btn-press"
                style={{ background: 'var(--ski-blue-50)', border: '1px solid var(--dku-blue-light)', color: 'var(--dku-blue-primary)' }}>
                수정
              </button>
              <button onClick={handleCancel}
                className="flex-1 rounded-xl py-2.5 text-sm font-black btn-press"
                style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--accent-red)' }}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setApplyMode(true)} disabled={isPastDeadline || !camp.is_open}
            className="w-full rounded-xl py-3 text-sm font-black disabled:opacity-40 btn-press"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            {!camp.is_open ? '신청 마감' : isPastDeadline ? '신청 기간 종료' : '참가 신청'}
          </button>
        )}
      </div>

      {/* 참가자 목록 */}
      {participants.length > 0 && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 className="text-xs font-black tracking-widest uppercase mb-3"
            style={{ color: 'var(--text-hint)' }}>
            참가자 {participants.length}명
          </h2>
          <div className="flex flex-col gap-2">
            {participants.map(p => (
              <div key={p.id} className="flex items-center gap-3">
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
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {p.profiles?.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-hint)' }}>
                    {p.profiles?.generation}기 · {formatDate(p.join_date)} ~ {formatDate(p.leave_date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 게스트 관리 (운영진) */}
      {isAdmin && (
        <div className="rounded-2xl p-5 mb-4"
          style={{
            background: 'rgba(0,60,117,0.04)',
            border: '1px solid var(--dku-blue-light)',
          }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--dku-blue)' }}>게스트 관리</h2>
            <button onClick={() => setShowAddGuest(!showAddGuest)}
              className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
              style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
              {showAddGuest ? '취소' : '+ 추가'}
            </button>
          </div>

          {showAddGuest && (
            <div className="flex flex-col gap-2 mb-3 p-3 rounded-xl"
              style={{ background: '#fff', border: '1px solid var(--border-primary)' }}>
              <input type="text" placeholder="게스트 이름" value={guestName}
                onChange={e => setGuestName(e.target.value)} style={inputStyle} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={guestJoin}
                  min={camp.start_date} max={camp.end_date}
                  onChange={e => setGuestJoin(e.target.value)} style={inputStyle} />
                <input type="date" value={guestLeave}
                  min={guestJoin || camp.start_date} max={camp.end_date}
                  onChange={e => setGuestLeave(e.target.value)} style={inputStyle} />
              </div>
              <button onClick={handleAddGuest} disabled={addingGuest || !guestName || !guestJoin || !guestLeave}
                className="w-full rounded-xl py-2.5 text-sm font-black disabled:opacity-50 btn-press"
                style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                {addingGuest ? '추가 중...' : '게스트 추가'}
              </button>
            </div>
          )}

          {guests.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-hint)' }}>
              등록된 게스트가 없어요
            </p>
          ) : (
            <div className="flex flex-col gap-2">
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
                  <button onClick={() => handleDeleteGuest(guest.id)}
                    className="text-xs font-black btn-press" style={{ color: 'var(--accent-red)' }}>
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
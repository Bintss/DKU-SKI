'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'
import Link from 'next/link'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

type Event = {
  id: string
  title: string
  event_type: string
  start_date: string
  end_date: string
  location: string | null
  description: string | null
  detail_content: string | null
  image_url: string | null
  deadline: string | null
  max_participants: number | null
  guest_fee: number | null
  participation_fee: number | null
  created_by: string
}

type Participant = {
  id: string
  user_id: string
  join_date: string
  leave_date: string
  profiles: { name: string; generation: number; avatar_url: string | null } | null
}

type MyParticipation = {
  id: string
  join_date: string
  leave_date: string
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  daytrip: '당일 행사',
  training: '정기 훈련',
  ob_invite: 'OB 초청',
  etc: '기타',
}

export default function EventDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [event, setEvent] = useState<Event | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [myParticipation, setMyParticipation] = useState<MyParticipation | null>(null)
  const [loading, setLoading] = useState(true)
  const [applyMode, setApplyMode] = useState(false)
  const [joinDate, setJoinDate] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [applying, setApplying] = useState(false)

  // 정산 생성 관련
  const [showSettlementPanel, setShowSettlementPanel] = useState(false)
  const [transferLabel, setTransferLabel] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [creatingSettlement, setCreatingSettlement] = useState(false)
  const [settlementCreated, setSettlementCreated] = useState(false)
  const [existingSettlementId, setExistingSettlementId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!profile) return

    const [{ data: eventData }, { data: participantData }, { data: settlementData }] =
      await Promise.all([
        supabase.from('events').select('*').eq('id', id).single(),
        supabase.from('event_participants')
          .select('*, profiles(name, generation, avatar_url)')
          .eq('event_id', id),
        supabase.from('settlements')
          .select('id')
          .eq('event_id', id)
          .limit(1)
          .maybeSingle(),
      ])

    setEvent(eventData)
    setParticipants(participantData ?? [])

    if (settlementData) {
      setExistingSettlementId(settlementData.id)
      setSettlementCreated(true)
    }

    const mine = participantData?.find(p => p.user_id === profile.id)
    setMyParticipation(mine ?? null)
    if (mine) {
      setJoinDate(mine.join_date)
      setLeaveDate(mine.leave_date)
    } else if (eventData) {
      setJoinDate(eventData.start_date)
      setLeaveDate(eventData.end_date)
    }
    setLoading(false)
  }, [profile, id, supabase])

  useEffect(() => {
    if (!profile) return
    fetchData()
  }, [profile, fetchData])

  usePageVisibilityRefetch(fetchData, { enabled: !!profile && !applyMode, debounceMs: 2000 })

  const handleApply = async () => {
    if (!profile || !event || !joinDate || !leaveDate) return
    setApplying(true)

    if (myParticipation) {
      await supabase.from('event_participants')
        .update({ join_date: joinDate, leave_date: leaveDate })
        .eq('id', myParticipation.id)
    } else {
      await supabase.from('event_participants').insert({
        event_id: id,
        user_id: profile.id,
        join_date: joinDate,
        leave_date: leaveDate,
      })
    }

    setApplyMode(false)
    setApplying(false)
    fetchData()
  }

  const handleCancel = async () => {
    if (!myParticipation) return
    await supabase.from('event_participants').delete().eq('id', myParticipation.id)
    setMyParticipation(null)
    fetchData()
  }

  const handleCreateSettlement = async () => {
    if (!event || !transferLabel.trim()) return
    setCreatingSettlement(true)

    // 참가자 목록 + 이름 조회
    const fee = event.participation_fee ?? 0
    if (fee <= 0) {
      alert('참가비가 설정되어 있지 않아요. 행사 수정에서 참가비를 먼저 설정해주세요.')
      setCreatingSettlement(false)
      return
    }

    const targets = participants.map(p => ({
      userId: p.user_id,
      amount: fee,
      name: p.profiles?.name ?? '',
    }))

    if (targets.length === 0) {
      alert('참가자가 없어요.')
      setCreatingSettlement(false)
      return
    }

    const res = await fetch('/api/settlement/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${event.title} ${transferLabel}`,
        description: `${event.title} 참가비`,
        totalAmount: fee * targets.length,
        dueDate: dueDate || null,
        splitEqual: false,
        targets,
        eventId: id,
        transferLabel: transferLabel.trim(),
      }),
    })

    const result = await res.json()
    setCreatingSettlement(false)

    if (!res.ok) {
      alert(result.error ?? '정산 생성에 실패했어요')
      return
    }

    setSettlementCreated(true)
    setExistingSettlementId(result.settlementId)
    setShowSettlementPanel(false)
    fetchData()
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  }

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
  const isPastDeadline = event?.deadline ? new Date(event.deadline) < new Date() : false

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  if (!event) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>행사를 찾을 수 없어요</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <Link href="/events" className="text-xs font-semibold"
          style={{ color: 'var(--text-tertiary)' }}>← 행사</Link>
        {isAdmin && (
          <Link href={`/admin/events/${id}/edit`}
            className="text-xs font-black text-white px-3 py-1.5 rounded-lg btn-press"
            style={{ background: 'var(--ski-blue)' }}>
            수정
          </Link>
        )}
      </div>

      {/* 행사 헤더 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(27,63,171,0.2)', color: 'var(--accent-blue)' }}>
                {EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}
              </span>
              {event.deadline && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,214,0,0.15)', color: '#FFD700' }}>
                  {daysLeft(event.deadline)}
                </span>
              )}
            </div>
            <h1 className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              {event.title}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {formatDate(event.start_date)}
              {event.start_date !== event.end_date && ` ~ ${formatDate(event.end_date)}`}
              {getNights(event.start_date, event.end_date) > 0 &&
                ` · ${getNights(event.start_date, event.end_date)}박`}
            </p>
            {event.location && (
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                📍 {event.location}
              </p>
            )}
          </div>
        </div>

        {event.image_url && (
          <img src={event.image_url} alt="행사 이미지"
            className="w-full rounded-xl mb-3 object-cover max-h-48" />
        )}

        {event.description && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {event.description}
          </p>
        )}

        {event.detail_content && (
          <div className="mt-3 pt-3" style={{ borderTop: '0.5px solid var(--border-primary)' }}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ color: 'var(--text-tertiary)' }}>
              {event.detail_content}
            </p>
          </div>
        )}

        {event.participation_fee && event.participation_fee > 0 && (
          <div className="mt-3 pt-3 flex items-center justify-between"
            style={{ borderTop: '0.5px solid var(--border-primary)' }}>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>참가비</span>
            <span className="text-sm font-black" style={{ color: 'var(--accent-blue)' }}>
              {event.participation_fee.toLocaleString()}원
            </span>
          </div>
        )}
      </div>

      {/* 참가 신청 / 내 신청 현황 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>참가 신청</h2>

        {applyMode ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                  참가 시작일
                </label>
                <input type="date" value={joinDate}
                  min={event.start_date} max={event.end_date}
                  onChange={e => setJoinDate(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '0.5px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                  }} />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                  참가 종료일
                </label>
                <input type="date" value={leaveDate}
                  min={joinDate || event.start_date} max={event.end_date}
                  onChange={e => setLeaveDate(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '0.5px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                  }} />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleApply} disabled={applying || !joinDate || !leaveDate}
                className="flex-1 text-white rounded-xl py-3 text-sm font-black disabled:opacity-50 btn-press"
                style={{ background: 'var(--ski-blue)' }}>
                {applying ? '신청 중...' : myParticipation ? '수정 완료' : '신청 완료'}
              </button>
              <button onClick={() => setApplyMode(false)}
                className="px-4 rounded-xl text-sm font-black btn-press"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }}>
                취소
              </button>
            </div>
          </div>
        ) : myParticipation ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(46,204,113,0.15)', color: 'var(--accent-green)' }}>
                신청 완료
              </span>
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {formatDate(myParticipation.join_date)} ~ {formatDate(myParticipation.leave_date)}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setApplyMode(true)}
                className="flex-1 rounded-xl py-2.5 text-sm font-black btn-press"
                style={{
                  background: 'rgba(27,63,171,0.15)',
                  border: '0.5px solid rgba(27,63,171,0.3)',
                  color: 'var(--accent-blue)',
                }}>
                수정
              </button>
              <button onClick={handleCancel}
                className="flex-1 rounded-xl py-2.5 text-sm font-black btn-press"
                style={{
                  background: 'rgba(255,107,107,0.1)',
                  border: '0.5px solid rgba(255,107,107,0.2)',
                  color: '#FF6B6B',
                }}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setApplyMode(true)}
            disabled={isPastDeadline}
            className="w-full rounded-xl py-3 text-sm font-black disabled:opacity-40 btn-press"
            style={{ background: 'var(--ski-blue)', color: '#fff' }}>
            {isPastDeadline ? '신청 마감' : '참가 신청'}
          </button>
        )}
      </div>

      {/* 참가자 목록 */}
      {participants.length > 0 && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
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
                    style={{ background: 'var(--ski-blue)', color: '#fff' }}>
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

      {/* 운영진 전용 — 정산 생성 */}
      {isAdmin && (
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{
            background: 'rgba(230,126,34,0.06)',
            border: '0.5px solid rgba(230,126,34,0.2)',
          }}>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-xs font-black tracking-widest uppercase"
                    style={{ color: 'var(--accent-orange)' }}>운영진 · 정산</h2>
                  {settlementCreated && (
                    <span className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(46,204,113,0.15)', color: 'var(--accent-green)' }}>
                      생성됨
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {settlementCreated
                    ? '이 행사의 정산이 이미 생성되어 있어요'
                    : `참가자 ${participants.length}명 · 참가비 ${event.participation_fee ? event.participation_fee.toLocaleString() + '원' : '미설정'}`}
                </p>
              </div>
              {settlementCreated ? (
                <button onClick={() => router.push(`/settlement/${existingSettlementId}`)}
                  className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
                  style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                  정산 보기
                </button>
              ) : (
                <button
                  onClick={() => setShowSettlementPanel(!showSettlementPanel)}
                  disabled={participants.length === 0}
                  className="text-xs font-black px-3 py-1.5 rounded-lg btn-press disabled:opacity-40"
                  style={{ background: 'rgba(230,126,34,0.2)', color: 'var(--accent-orange)' }}>
                  {showSettlementPanel ? '접기' : '정산 생성'}
                </button>
              )}
            </div>
          </div>

          {/* 정산 생성 패널 */}
          {showSettlementPanel && !settlementCreated && (
            <div className="px-5 pb-5 pt-1"
              style={{ borderTop: '0.5px solid rgba(230,126,34,0.2)' }}>

              {!event.participation_fee || event.participation_fee <= 0 ? (
                <div className="rounded-xl p-3 mb-3"
                  style={{ background: 'rgba(255,107,107,0.1)', border: '0.5px solid rgba(255,107,107,0.2)' }}>
                  <p className="text-xs font-bold" style={{ color: '#FF6B6B' }}>
                    ⚠️ 참가비가 설정되어 있지 않아요
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                    행사 수정에서 참가비를 먼저 설정해주세요
                  </p>
                  <button onClick={() => router.push(`/admin/events/${id}/edit`)}
                    className="text-xs font-black mt-2 px-3 py-1.5 rounded-lg btn-press"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
                    행사 수정으로 →
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-xl p-3 mb-3"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-tertiary)' }}>참가자 수</span>
                      <span className="font-black" style={{ color: 'var(--text-primary)' }}>
                        {participants.length}명
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-tertiary)' }}>1인 참가비</span>
                      <span className="font-black" style={{ color: 'var(--text-primary)' }}>
                        {event.participation_fee.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-1"
                      style={{ borderTop: '0.5px solid var(--border-primary)' }}>
                      <span className="font-black" style={{ color: 'var(--text-secondary)' }}>
                        총 정산 금액
                      </span>
                      <span className="font-black" style={{ color: 'var(--accent-blue)' }}>
                        {(event.participation_fee * participants.length).toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                        송금명 구분 (한글 기준, 이름 제외 최대 4자)
                      </label>
                      <input type="text"
                        placeholder="예: 합숙비, 티셔츠, 참가비"
                        value={transferLabel}
                        onChange={e => {
                          const v = e.target.value
                          // 최대 4자 (이름 3자 평균 + 구분 4자 = 7자 이내)
                          if (v.length <= 4) setTransferLabel(v)
                        }}
                        className="w-full rounded-xl px-3 py-2.5 text-sm"
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '0.5px solid var(--border-primary)',
                          color: 'var(--text-primary)',
                        }} />
                      {transferLabel && (
                        <p className="text-xs mt-1 px-1" style={{ color: 'var(--text-hint)' }}>
                          예시: {participants[0]?.profiles?.name ?? '이름'}{transferLabel}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs mb-1 block" style={{ color: 'var(--text-tertiary)' }}>
                        납부 마감일 (선택)
                      </label>
                      <input type="date" value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm"
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '0.5px solid var(--border-primary)',
                          color: 'var(--text-primary)',
                        }} />
                    </div>

                    <button
                      onClick={handleCreateSettlement}
                      disabled={creatingSettlement || !transferLabel.trim()}
                      className="w-full text-white rounded-xl py-3 text-sm font-black disabled:opacity-40 btn-press mt-1"
                      style={{ background: 'rgba(230,126,34,0.7)' }}>
                      {creatingSettlement
                        ? '생성 중...'
                        : `정산 생성 (${participants.length}명)`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
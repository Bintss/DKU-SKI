'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

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
  guest_fee: number | null
  participation_fee: number | null
  transfer_label: string | null
  is_open: boolean
  deadline: string | null
  created_by: string
}

type Participant = {
  id: string
  user_id: string
  participant_type: string
  status: string
  profiles: { name: string; generation: number; avatar_url: string | null } | null
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
  const [myParticipation, setMyParticipation] = useState<Participant | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [canceling, setCanceling] = useState(false)

  // 운영진 정산 생성
  const [showSettlementPanel, setShowSettlementPanel] = useState(false)
  const [settlementLabel, setSettlementLabel] = useState('')
  const [settlementDueDate, setSettlementDueDate] = useState('')
  const [creatingSettlement, setCreatingSettlement] = useState(false)
  const [settlementError, setSettlementError] = useState('')

  const fetchData = useCallback(async () => {
    if (!profile) return
    const [{ data: eventData }, { data: participantData }] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('event_participants')
        .select('*, profiles(name, generation, avatar_url)')
        .eq('event_id', id),
    ])
    setEvent(eventData)
    setParticipants(participantData ?? [])
    setMyParticipation(participantData?.find(p => p.user_id === profile.id) ?? null)
    setLoading(false)
  }, [profile, id, supabase])

  useEffect(() => { if (profile) fetchData() }, [profile, fetchData])
  usePageVisibilityRefetch(fetchData, { enabled: !!profile, debounceMs: 2000 })

  // 참가 신청
  const handleApply = async () => {
    if (!profile || !event) return
    setApplying(true)

    // 참가비 있는 경우
    if (event.participation_fee && event.participation_fee > 0) {
      // event_participants 생성 (pending_payment)
      const { error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          user_id: profile.id,
          participant_type: 'member',
          status: 'pending_payment',
        })

      if (participantError) {
        alert('참가 신청에 실패했어요')
        setApplying(false)
        return
      }

      // 정산 자동 생성
      const label = event.transfer_label || '참가비'
      const res = await fetch('/api/settlement/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${event.title} 참가비`,
          description: `${event.start_date} 행사 참가비`,
          totalAmount: event.participation_fee,
          transferLabel: label,
          dueDate: event.deadline
            ? new Date(event.deadline).toISOString().split('T')[0]
            : null,
          splitEqual: true,
          targets: [{ userId: profile.id, amount: event.participation_fee }],
          eventId: event.id,
          autoConfirmEventParticipants: true,
        }),
      })

      if (!res.ok) {
        alert('정산 생성에 실패했어요')
        setApplying(false)
        return
      }

    } else {
      // 참가비 없는 경우 — 즉시 confirmed
      await supabase.from('event_participants').insert({
        event_id: event.id,
        user_id: profile.id,
        participant_type: 'member',
        status: 'confirmed',
      })
    }

    setApplying(false)
    fetchData()
  }

  // 참가 취소
  const handleCancel = async () => {
    if (!myParticipation || !profile) return
    if (!confirm('참가를 취소할까요?')) return
    setCanceling(true)

    // pending_payment 상태면 안내
    if (myParticipation.status === 'pending_payment') {
      alert('참가비 정산이 생성되어 있어요. 정산 페이지에서 운영진에게 환불을 요청해주세요.')
    }

    await supabase.from('event_participants').delete().eq('id', myParticipation.id)
    setCanceling(false)
    fetchData()
  }

  // 운영진 정산 생성 (참가비 없는 행사에서 수동)
  const handleCreateSettlement = async () => {
    if (!event || !profile) return
    if (!settlementLabel.trim()) { setSettlementError('송금명을 입력해주세요'); return }

    const confirmedParticipants = participants.filter(p => p.status === 'confirmed')
    if (confirmedParticipants.length === 0) {
      setSettlementError('참가 확정된 부원이 없어요')
      return
    }
    if (!event.participation_fee) {
      setSettlementError('참가비가 설정되지 않았어요')
      return
    }

    setCreatingSettlement(true)
    setSettlementError('')

    const targets = confirmedParticipants.map(p => ({
      userId: p.user_id,
      amount: event.participation_fee!,
    }))

    const res = await fetch('/api/settlement/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `${event.title} 참가비`,
        description: null,
        totalAmount: event.participation_fee * confirmedParticipants.length,
        transferLabel: settlementLabel,
        dueDate: settlementDueDate || null,
        splitEqual: false,
        targets,
        eventId: event.id,
      }),
    })

    const result = await res.json()
    setCreatingSettlement(false)

    if (!res.ok) {
      setSettlementError(result.error ?? '정산 생성에 실패했어요')
      return
    }

    setShowSettlementPanel(false)
    router.push(`/settlement/${result.settlementId}`)
  }

  const isAdmin = profile?.role === 'admin'
  const isCreator = event?.created_by === profile?.id
  const canApply = event?.is_open &&
    (!event.deadline || new Date(event.deadline) > new Date()) &&
    (!event.max_participants || participants.length < event.max_participants)

  const confirmedCount = participants.filter(p => p.status === 'confirmed').length
  const pendingCount = participants.filter(p => p.status === 'pending_payment').length

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  const formatDeadline = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return '마감'
    if (diff === 0) return '오늘 마감'
    return `D-${diff}`
  }

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
        {(isAdmin || isCreator) && (
          <a href={`/admin/events/${id}/edit`}
            className="text-xs font-black text-white px-3 py-1.5 rounded-lg btn-press"
            style={{ background: 'var(--dku-blue-primary)' }}>
            수정
          </a>
        )}
      </div>

      {/* 행사 헤더 */}
      {event.image_url && (
        <div className="rounded-2xl overflow-hidden mb-4" style={{ height: 180 }}>
          <img src={event.image_url} alt={event.title}
            className="w-full h-full object-cover" />
        </div>
      )}

      <div className="rounded-2xl p-5 mb-4"
        style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
            {EVENT_TYPE_LABEL[event.type] ?? event.type}
          </span>
          {event.deadline && (
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(202,138,10,0.1)', color: 'var(--accent-yellow)' }}>
              {formatDeadline(event.deadline)}
            </span>
          )}
          {!event.is_open && (
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{ background: 'var(--surface-low)', color: 'var(--text-hint)' }}>
              신청 마감
            </span>
          )}
        </div>

        <h1 className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
          {event.title}
        </h1>
        <p className="text-sm mb-1" style={{ color: 'var(--text-tertiary)' }}>
          {formatDate(event.start_date)}
          {event.end_date !== event.start_date && ` — ${formatDate(event.end_date)}`}
        </p>
        {event.location && (
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>📍 {event.location}</p>
        )}

        {event.description && (
          <p className="text-sm mt-3 pt-3 leading-relaxed"
            style={{ borderTop: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
            {event.description}
          </p>
        )}

        {event.detail && (
          <p className="text-sm mt-2 leading-relaxed whitespace-pre-wrap"
            style={{ color: 'var(--text-secondary)' }}>
            {event.detail}
          </p>
        )}

        {/* 참가비 안내 */}
        {event.participation_fee && event.participation_fee > 0 && (
          <div className="mt-3 pt-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-primary)' }}>
            <div>
              <p className="text-xs font-black" style={{ color: 'var(--text-hint)' }}>참가비</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                신청 후 정산이 자동 생성돼요
              </p>
            </div>
            <p className="text-lg font-black" style={{ color: 'var(--dku-blue-primary)' }}>
              {event.participation_fee.toLocaleString()}원
            </p>
          </div>
        )}
      </div>

      {/* 참가 신청 버튼 */}
      <div className="mb-4">
        {!myParticipation ? (
          <button onClick={handleApply}
            disabled={applying || !canApply}
            className="w-full rounded-xl py-3.5 text-sm font-black disabled:opacity-40 btn-press"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            {applying ? '신청 중...' : !event.is_open ? '신청 마감' : '참가 신청'}
          </button>
        ) : (
          <div>
            {/* 내 신청 상태 */}
            <div className="rounded-xl p-4 mb-3"
              style={{
                background: myParticipation.status === 'confirmed'
                  ? 'rgba(22,163,74,0.06)' : 'rgba(202,138,10,0.06)',
                border: `1px solid ${myParticipation.status === 'confirmed'
                  ? 'rgba(22,163,74,0.2)' : 'rgba(202,138,10,0.2)'}`,
              }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-black"
                    style={{
                      color: myParticipation.status === 'confirmed'
                        ? 'var(--accent-green)' : 'var(--accent-yellow)'
                    }}>
                    {myParticipation.status === 'confirmed' ? '참가 확정 ✓' : '참가비 납부 대기 중'}
                  </p>
                  {myParticipation.status === 'pending_payment' && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                      정산 페이지에서 참가비를 납부해주세요
                    </p>
                  )}
                </div>
                {myParticipation.status === 'pending_payment' && (
                  <a href="/settlement"
                    className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
                    style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                    정산 보기
                  </a>
                )}
              </div>
            </div>
            <button onClick={handleCancel}
              disabled={canceling}
              className="w-full rounded-xl py-2.5 text-sm font-black disabled:opacity-40 btn-press"
              style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: 'var(--accent-red)' }}>
              {canceling ? '취소 중...' : '참가 취소'}
            </button>
          </div>
        )}
      </div>

      {/* 참가자 목록 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: '#fff', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-sm)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-black tracking-widest uppercase"
            style={{ color: 'var(--text-hint)' }}>
            참가자
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(22,163,74,0.1)', color: 'var(--accent-green)' }}>
              확정 {confirmedCount}명
            </span>
            {pendingCount > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(202,138,10,0.1)', color: 'var(--accent-yellow)' }}>
                미납 {pendingCount}명
              </span>
            )}
          </div>
        </div>

        {participants.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: 'var(--text-hint)' }}>
            아직 신청한 부원이 없어요
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {participants.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2"
                style={{ borderBottom: '1px solid var(--border-primary)' }}>
                {p.profiles?.avatar_url ? (
                  <img src={p.profiles.avatar_url} alt=""
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
                </div>
                {/* 납부 상태 표시 */}
                <span className="text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: p.status === 'confirmed'
                      ? 'rgba(22,163,74,0.1)' : 'rgba(202,138,10,0.1)',
                    color: p.status === 'confirmed'
                      ? 'var(--accent-green)' : 'var(--accent-yellow)',
                  }}>
                  {p.status === 'confirmed' ? '확정' : '미납'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 운영진 패널 */}
      {(isAdmin || isCreator) && (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(0,60,117,0.04)', border: '1px solid var(--dku-blue-light)' }}>
          <button
            onClick={() => setShowSettlementPanel(!showSettlementPanel)}
            className="w-full flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-xs font-black tracking-widest uppercase text-left"
                style={{ color: 'var(--dku-blue)' }}>운영진 · 정산</p>
              <p className="text-xs mt-0.5 text-left" style={{ color: 'var(--text-tertiary)' }}>
                {event.participation_fee
                  ? `참가비 ${event.participation_fee.toLocaleString()}원 · 확정 ${confirmedCount}명`
                  : '참가비 없음'}
              </p>
            </div>
            <span className="text-xs font-black" style={{ color: 'var(--dku-blue)' }}>
              {showSettlementPanel ? '접기 ▲' : '펼치기 ▼'}
            </span>
          </button>

          {showSettlementPanel && (
            <div className="px-5 pb-5"
              style={{ borderTop: '1px solid var(--dku-blue-light)' }}>

              {event.participation_fee && event.participation_fee > 0 ? (
                <div className="mt-4">
                  <div className="rounded-xl p-3 mb-3"
                    style={{ background: 'var(--ski-blue-50)', border: '1px solid var(--dku-blue-light)' }}>
                    <p className="text-xs font-black mb-1" style={{ color: 'var(--dku-blue-primary)' }}>
                      참가비 자동 정산 안내
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      참가 신청 시 개인별 정산이 자동 생성돼요.
                      미납 부원은 납부 후 자동으로 확정 처리돼요.
                    </p>
                  </div>
                  <a href="/settlement"
                    className="w-full block text-center rounded-xl py-2.5 text-sm font-black btn-press"
                    style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                    정산 목록 보기
                  </a>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    참가비가 없는 행사예요. 별도 정산이 필요하면 아래에서 생성하세요.
                  </p>
                  <div>
                    <label className="text-xs font-black mb-1.5 block"
                      style={{ color: 'var(--text-hint)' }}>송금명</label>
                    <input type="text" placeholder="예: 참가비 (최대 5자)"
                      value={settlementLabel}
                      onChange={e => setSettlementLabel(e.target.value.slice(0, 5))}
                      className="w-full rounded-xl px-3 py-2.5 text-sm"
                      style={{
                        background: '#fff',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }} />
                  </div>
                  <div>
                    <label className="text-xs font-black mb-1.5 block"
                      style={{ color: 'var(--text-hint)' }}>납부 마감일 (선택)</label>
                    <input type="date" value={settlementDueDate}
                      onChange={e => setSettlementDueDate(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm"
                      style={{
                        background: '#fff',
                        border: '1px solid var(--border-primary)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                      }} />
                  </div>
                  {settlementError && (
                    <p className="text-xs font-bold" style={{ color: 'var(--accent-red)' }}>
                      {settlementError}
                    </p>
                  )}
                  <button onClick={handleCreateSettlement}
                    disabled={creatingSettlement}
                    className="w-full rounded-xl py-2.5 text-sm font-black disabled:opacity-50 btn-press"
                    style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
                    {creatingSettlement ? '생성 중...' : `정산 생성 (확정 ${confirmedCount}명)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
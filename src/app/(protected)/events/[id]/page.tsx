'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

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
  profiles: { name: string; generation: number } | null
}

const TYPE_LABEL: Record<string, string> = {
  daytrip: '당일', training: '훈련', ob_invite: 'OB', etc: '기타',
}

const TYPE_COLOR: Record<string, string> = {
  daytrip: '#2ECC71', training: '#9B59B6', ob_invite: '#E67E22', etc: '#1B3FAB',
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
  const [detailOpen, setDetailOpen] = useState(false)
  const [joinDate, setJoinDate] = useState('')
  const [leaveDate, setLeaveDate] = useState('')
  const [applyMode, setApplyMode] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    if (!profile) return

    const [{ data: eventData }, { data: participantData }] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('event_participants')
        .select('*, profiles(name, generation)').eq('event_id', id),
    ])

    setEvent(eventData)
    setParticipants(participantData ?? [])

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
  }

  useEffect(() => {
    if (profile) fetchData()
  }, [profile, id])

  const handleApply = async () => {
    if (!event || !profile) return
    setSubmitting(true)

    if (myParticipation) {
      await supabase.from('event_participants')
        .update({ join_date: joinDate, leave_date: leaveDate })
        .eq('id', myParticipation.id)
    } else {
      await supabase.from('event_participants').insert({
        event_id: event.id,
        user_id: profile.id,
        participant_type: profile.role === 'ob' ? 'ob' : 'member',
        join_date: joinDate,
        leave_date: leaveDate,
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
    fetchData()
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short'
    })

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

  const typeColor = TYPE_COLOR[event.type] ?? '#1B3FAB'
  const typeLabel = TYPE_LABEL[event.type] ?? '기타'
  const isDeadlinePassed = event.deadline ? new Date(event.deadline) < new Date() : false
  const canApply = event.is_open && !isDeadlinePassed
  const nights = Math.ceil(
    (new Date(leaveDate).getTime() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24)
  )

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-primary)',
    color: 'var(--text-primary)',
  }

  return (
    <main className="max-w-lg mx-auto pb-10">
      {/* 히어로 */}
      <div className="relative px-4 pt-2 pb-8 mb-4"
        style={{ background: `linear-gradient(180deg, ${typeColor}15 0%, transparent 100%)` }}>
        {profile?.role === 'admin' && (
          <div className="flex justify-end mb-4">
            <a href={`/admin/events/${id}/edit`}
              className="text-xs font-black text-white px-3 py-1.5 rounded-lg btn-press"
              style={{ background: 'var(--ski-blue)' }}>
              수정
            </a>
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-black tracking-widest uppercase px-3 py-1.5 rounded-full"
            style={{ background: `${typeColor}20`, color: typeColor }}>
            {typeLabel}
          </span>
          {myParticipation && (
            <span className="text-xs font-black px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(46,204,113,0.15)', color: 'var(--accent-green)' }}>
              신청 완료
            </span>
          )}
        </div>

        <h1 className="text-3xl font-black leading-tight mb-5"
          style={{ color: 'var(--text-primary)' }}>
          {event.title}
        </h1>

        <div className="flex items-stretch gap-3">
          <div className="w-1 rounded-full flex-shrink-0" style={{ background: typeColor }} />
          <div className="flex flex-col gap-1.5">
            {[
              {
                label: '날짜', value: event.start_date === event.end_date
                  ? formatDate(event.start_date)
                  : `${formatDate(event.start_date)} — ${formatDate(event.end_date)}`
              },
              event.location ? { label: '장소', value: event.location } : null,
              event.deadline ? {
                label: '마감', value: new Date(event.deadline).toLocaleDateString('ko-KR', {
                  month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })
              } : null,
            ].filter(Boolean).map((item: any) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-xs font-black w-10" style={{ color: 'var(--text-hint)' }}>
                  {item.label}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4">
        {event.image_url && (
          <img src={event.image_url} alt={event.title}
            className="w-full h-52 object-cover rounded-2xl mb-4" />
        )}

        {event.description && (
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
            {event.description}
          </p>
        )}

        {event.detail && (
          <div className="rounded-2xl overflow-hidden mb-4"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
            <button onClick={() => setDetailOpen(!detailOpen)}
              className="w-full flex items-center justify-between px-5 py-4">
              <span className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                세부 내용
              </span>
              <span className="text-xs font-black" style={{ color: 'var(--text-hint)' }}>
                {detailOpen ? '접기' : '펼치기'}
              </span>
            </button>
            {detailOpen && (
              <div className="px-5 pb-5 pt-4"
                style={{ borderTop: '0.5px solid var(--border-primary)' }}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: 'var(--text-secondary)' }}>
                  {event.detail}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 참여 신청 */}
        {canApply && (
          <div className="rounded-2xl p-5 mb-4"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                {myParticipation ? '내 신청' : '참여 신청'}
              </h2>
              {myParticipation && !applyMode && (
                <button onClick={() => setApplyMode(true)}
                  className="text-xs font-black hover:underline"
                  style={{ color: 'var(--accent-blue)' }}>
                  수정
                </button>
              )}
            </div>

            {event.type === 'camp' ? (
              myParticipation && !applyMode ? (
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    {joinDate} — {leaveDate}
                    {nights > 0 && (
                      <span className="font-normal ml-1.5" style={{ color: 'var(--text-hint)' }}>
                        {nights}박 {nights + 1}일
                      </span>
                    )}
                  </p>
                  <div className="flex gap-3 mt-3">
                    <button onClick={() => setApplyMode(true)}
                      className="text-xs font-black hover:underline"
                      style={{ color: 'var(--accent-blue)' }}>
                      일정 변경
                    </button>
                    <button onClick={handleCancel}
                      className="text-xs font-black" style={{ color: '#FF6B6B' }}>
                      신청 취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-black mb-1 block"
                        style={{ color: 'var(--text-hint)' }}>도착일</label>
                      <input type="date" value={joinDate}
                        min={event.start_date} max={event.end_date}
                        onChange={e => setJoinDate(e.target.value)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-xs font-black mb-1 block"
                        style={{ color: 'var(--text-hint)' }}>출발일</label>
                      <input type="date" value={leaveDate}
                        min={joinDate || event.start_date} max={event.end_date}
                        onChange={e => setLeaveDate(e.target.value)}
                        className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleApply} disabled={submitting}
                      className="flex-1 text-white rounded-xl py-3 text-sm font-black disabled:opacity-50 btn-press"
                      style={{ background: 'var(--ski-blue)' }}>
                      {submitting ? '처리 중...' : myParticipation ? '수정하기' : '신청하기'}
                    </button>
                    {applyMode && (
                      <button onClick={() => setApplyMode(false)}
                        className="px-4 rounded-xl py-3 text-sm font-black btn-press"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }}>
                        취소
                      </button>
                    )}
                  </div>
                </div>
              )
            ) : (
              myParticipation ? (
                <div>
                  <p className="text-sm font-black mb-2" style={{ color: 'var(--accent-green)' }}>
                    참여 신청 완료
                  </p>
                  <button onClick={handleCancel}
                    className="text-xs font-black" style={{ color: '#FF6B6B' }}>
                    신청 취소
                  </button>
                </div>
              ) : (
                <button onClick={handleApply} disabled={submitting}
                  className="w-full text-white rounded-xl py-3 text-sm font-black disabled:opacity-50 btn-press"
                  style={{ background: 'var(--ski-blue)' }}>
                  {submitting ? '처리 중...' : '참여 신청'}
                </button>
              )
            )}
          </div>
        )}

        {!canApply && (
          <div className="rounded-2xl px-5 py-4 mb-4 text-center"
            style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
            <p className="text-sm font-black" style={{ color: 'var(--text-hint)' }}>
              {!event.is_open ? '신청이 마감됐어요' : '신청 기간이 아니에요'}
            </p>
          </div>
        )}

        {/* 참여자 목록 */}
        <div className="rounded-2xl p-5"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>참여자</h2>
            <span className="text-xl font-black" style={{ color: 'var(--accent-blue)' }}>
              {participants.length}
            </span>
          </div>

          {participants.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: 'var(--text-hint)' }}>
              아직 신청자가 없어요
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {participants.map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full text-white text-xs font-black flex items-center justify-center"
                      style={{ background: p.user_id === profile?.id ? 'var(--accent-green)' : 'var(--ski-blue)' }}>
                      {p.profiles?.name?.[0] ?? '?'}
                    </div>
                    <div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {p.profiles?.name ?? '알 수 없음'}
                      </span>
                      <span className="text-xs ml-1.5" style={{ color: 'var(--text-hint)' }}>
                        {p.profiles?.generation}기
                      </span>
                    </div>
                  </div>
                  {event.type === 'camp' && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--text-hint)' }}>
                      {p.join_date === p.leave_date
                        ? p.join_date : `${p.join_date.slice(5)}~${p.leave_date.slice(5)}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
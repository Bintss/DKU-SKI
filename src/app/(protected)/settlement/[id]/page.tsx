'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProfile } from '@/contexts/ProfileContext'
import { usePageVisibilityRefetch } from '@/hooks/usePageVisibilityRefetch'

type Settlement = {
  id: string
  title: string
  description: string | null
  total_amount: number
  amount_per_person: number
  due_date: string | null
  created_by: string
  created_at: string
  event_id: string | null
  transfer_label: string | null
  profiles: { name: string } | null
}

type SettlementItem = {
  id: string
  user_id: string
  amount: number
  status: 'unpaid' | 'pending' | 'paid' | 'rejected'
  is_paid: boolean
  paid_at: string | null
  transfer_name: string | null
  reject_reason: string | null
  profiles: { name: string; generation: number } | null
}

type ClubAccount = {
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
}

const STATUS_LABEL: Record<string, string> = {
  unpaid: '미납',
  pending: '확인 대기',
  paid: '납부완료',
  rejected: '반려',
}

const STATUS_COLOR: Record<string, string> = {
  unpaid: '#F09595',
  pending: '#FFD700',
  paid: '#2ECC71',
  rejected: '#FF6B6B',
}

const REJECT_REASONS = [
  { value: 'wrong_transfer_name', label: '송금명 오류' },
  { value: 'amount_mismatch', label: '금액 불일치' },
  { value: 'other', label: '기타' },
]

export default function SettlementDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [settlement, setSettlement] = useState<Settlement | null>(null)
  const [items, setItems] = useState<SettlementItem[]>([])
  const [clubAccount, setClubAccount] = useState<ClubAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('wrong_transfer_name')
  const [copied, setCopied] = useState(false)

  const fetchData = useCallback(async () => {
    if (!profile) return
    const [{ data: settlementData }, { data: itemData }, { data: settingsData }] = await Promise.all([
      supabase.from('settlements')
        .select('*, profiles(name)')
        .eq('id', id).single(),
      supabase.from('settlement_items')
        .select('*, profiles(name, generation)')
        .eq('settlement_id', id)
        .order('status'),
      supabase.from('club_settings').select('*').eq('id', 1).single(),
    ])
    setSettlement(settlementData)
    setItems(itemData ?? [])
    setClubAccount(settingsData ?? null)
    setLoading(false)
  }, [profile, id, supabase])

  useEffect(() => {
    if (!profile) return
    fetchData()

    const channel = supabase
      .channel(`settlement-detail-${id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'settlement_items',
        filter: `settlement_id=eq.${id}`,
      }, () => fetchData())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile, id, fetchData, supabase])

  usePageVisibilityRefetch(fetchData, { enabled: !!profile, debounceMs: 2000 })

  const callStatusApi = async (itemId: string, action: string) => {
    const res = await fetch('/api/settlement/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, action }),
    })
    if (res.ok) fetchData()
  }

  const handleReject = async (item: SettlementItem) => {
    if (!rejectReason) return

    await supabase.from('settlement_items').update({
      status: 'rejected',
      reject_reason: rejectReason,
    }).eq('id', item.id)

    // 환불 송금: 토스 딥링크로 운영진 기기에서 처리
    const p = item.profiles
    if (item.reject_reason === 'wrong_transfer_name' || rejectReason === 'wrong_transfer_name') {
      // 환불 계좌 조회
      const { data: memberProfile } = await supabase
        .from('profiles')
        .select('refund_bank_name, refund_account_number, refund_account_holder')
        .eq('id', item.user_id)
        .single()

      if (memberProfile?.refund_account_number) {
        // 토스 계좌이체 딥링크
        const tossUrl = `supertoss://send?amount=${item.amount}&bank=${encodeURIComponent(memberProfile.refund_bank_name ?? '')}&accountNo=${memberProfile.refund_account_number}&origin=qr`
        window.location.href = tossUrl
      } else {
        alert(`${p?.name ?? '해당 부원'}의 환급 계좌가 등록되어 있지 않아요. 직접 환불해주세요.`)
      }
    }

    setRejectingId(null)
    setRejectReason('wrong_transfer_name')
    fetchData()
  }

  const handleDelete = async () => {
    if (!confirm('이 정산을 삭제할까요? 되돌릴 수 없어요.')) return
    await supabase.from('settlement_items').delete().eq('settlement_id', id)
    await supabase.from('settlements').delete().eq('id', id)
    router.push('/settlement')
  }

  const handleCopyTransferName = async (transferName: string) => {
    await navigator.clipboard.writeText(transferName)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openToss = (account: ClubAccount, amount: number) => {
    const tossUrl = `supertoss://send?amount=${amount}&bank=${encodeURIComponent(account.bank_name ?? '')}&accountNo=${account.account_number}&origin=qr`
    window.location.href = tossUrl
    setTimeout(() => {
      const webUrl = `https://toss.me/${account.account_number}`
      window.open(webUrl, '_blank')
    }, 500)
  }

  const copyAccount = async (account: ClubAccount) => {
    await navigator.clipboard.writeText(account.account_number ?? '')
    alert('계좌번호가 복사됐어요')
  }

  const isAdmin = profile?.role === 'admin'
  const isCreator = settlement?.created_by === profile?.id

  const myItem = items.find(item => item.user_id === profile?.id)
  const paidCount = items.filter(i => i.status === 'paid').length
  const pendingCount = items.filter(i => i.status === 'pending').length
  const unpaidCount = items.filter(i => i.status === 'unpaid' || i.status === 'rejected').length

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric'
    })
  }

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  if (!settlement) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>정산을 찾을 수 없어요</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-4">
        <Link href="/settlement" className="text-xs font-semibold"
          style={{ color: 'var(--text-tertiary)' }}>← 정산</Link>
        {(isAdmin || isCreator) && (
          <button onClick={handleDelete}
            className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
            style={{ background: 'rgba(255,107,107,0.1)', color: '#FF6B6B' }}>
            삭제
          </button>
        )}
      </div>

      {/* 정산 헤더 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h1 className="text-xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
          {settlement.title}
        </h1>
        {settlement.description && (
          <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>
            {settlement.description}
          </p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm" style={{ color: 'var(--text-hint)' }}>
            {settlement.profiles?.name} · {formatDate(settlement.created_at)}
          </span>
          {settlement.due_date && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,214,0,0.15)', color: '#FFD700' }}>
              {formatDate(settlement.due_date)} 마감
            </span>
          )}
        </div>

        {/* 진행 요약 */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4"
          style={{ borderTop: '0.5px solid var(--border-primary)' }}>
          {[
            { label: '납부완료', count: paidCount, color: '#2ECC71' },
            { label: '확인대기', count: pendingCount, color: '#FFD700' },
            { label: '미납/반려', count: unpaidCount, color: '#F09595' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <p className="text-xl font-black" style={{ color: item.color }}>{item.count}</p>
              <p className="text-xs" style={{ color: 'var(--text-hint)' }}>{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 내 정산 카드 */}
      {myItem && (
        <div className="rounded-2xl p-5 mb-4"
          style={{
            background: myItem.status === 'paid' ? 'rgba(46,204,113,0.06)'
              : myItem.status === 'rejected' ? 'rgba(255,107,107,0.06)'
              : myItem.status === 'pending' ? 'rgba(255,214,0,0.06)'
              : 'rgba(27,63,171,0.08)',
            border: `0.5px solid ${myItem.status === 'paid' ? 'rgba(46,204,113,0.2)'
              : myItem.status === 'rejected' ? 'rgba(255,107,107,0.2)'
              : myItem.status === 'pending' ? 'rgba(255,214,0,0.2)'
              : 'rgba(27,63,171,0.25)'}`,
          }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--text-hint)' }}>내 정산</h2>
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{
                background: `${STATUS_COLOR[myItem.status]}22`,
                color: STATUS_COLOR[myItem.status],
              }}>
              {STATUS_LABEL[myItem.status]}
            </span>
          </div>

          <p className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
            {myItem.amount.toLocaleString()}원
          </p>

          {/* 반려 사유 */}
          {myItem.status === 'rejected' && myItem.reject_reason && (
            <div className="rounded-xl p-3 mb-3"
              style={{ background: 'rgba(255,107,107,0.1)', border: '0.5px solid rgba(255,107,107,0.2)' }}>
              <p className="text-xs font-bold" style={{ color: '#FF6B6B' }}>
                반려 사유: {REJECT_REASONS.find(r => r.value === myItem.reject_reason)?.label ?? myItem.reject_reason}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                아래 송금명을 확인하고 다시 송금해주세요
              </p>
            </div>
          )}

          {/* 송금명 복사 */}
          {myItem.transfer_name && (myItem.status === 'unpaid' || myItem.status === 'rejected') && (
            <div className="rounded-xl p-3 mb-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid var(--border-primary)' }}>
              <p className="text-xs mb-1.5" style={{ color: 'var(--text-hint)' }}>
                송금 시 이 이름으로 보내주세요
              </p>
              <div className="flex items-center gap-2">
                <p className="text-base font-black flex-1" style={{ color: 'var(--text-primary)' }}>
                  {myItem.transfer_name}
                </p>
                <button
                  onClick={() => handleCopyTransferName(myItem.transfer_name!)}
                  className="text-xs font-black px-3 py-1.5 rounded-lg btn-press flex-shrink-0"
                  style={{
                    background: copied ? 'rgba(46,204,113,0.2)' : 'rgba(27,63,171,0.2)',
                    color: copied ? 'var(--accent-green)' : 'var(--accent-blue)',
                  }}>
                  {copied ? '복사됨 ✓' : '복사'}
                </button>
              </div>
            </div>
          )}

          {/* 송금 액션 */}
          {(myItem.status === 'unpaid' || myItem.status === 'rejected') && clubAccount?.account_number && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (myItem.transfer_name) handleCopyTransferName(myItem.transfer_name)
                  openToss(clubAccount, myItem.amount)
                }}
                className="w-full rounded-xl py-3 text-sm font-black btn-press"
                style={{ background: '#FEE500', color: '#3A1D1D' }}>
                {myItem.transfer_name ? '송금명 복사 + 토스로 송금' : '토스로 간편 송금'}
              </button>
              <button onClick={() => copyAccount(clubAccount)}
                className="w-full rounded-xl py-2.5 text-xs font-bold btn-press"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }}>
                계좌번호 복사 ({clubAccount.bank_name} {clubAccount.account_number})
              </button>
            </div>
          )}

          {myItem.status === 'unpaid' || myItem.status === 'rejected' ? (
            <button onClick={() => callStatusApi(myItem.id, 'request_confirm')}
              className="w-full rounded-xl py-3 text-sm font-black btn-press mt-2"
              style={{ background: 'var(--ski-blue)', color: '#fff' }}>
              송금했어요
            </button>
          ) : myItem.status === 'pending' ? (
            <button onClick={() => callStatusApi(myItem.id, 'cancel_pending')}
              className="w-full rounded-xl py-2.5 text-xs font-bold btn-press mt-2"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-hint)' }}>
              취소 (잘못 눌렀어요)
            </button>
          ) : null}
        </div>
      )}

      {/* 운영진 전체 현황 */}
      {(isAdmin || isCreator) && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <h2 className="text-xs font-black tracking-widest uppercase mb-3"
            style={{ color: 'var(--text-hint)' }}>전체 현황</h2>

          <div className="flex flex-col gap-2">
            {items.map(item => {
              const isRejecting = rejectingId === item.id
              return (
                <div key={item.id}
                  className="rounded-xl p-3"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: `0.5px solid ${item.status === 'paid' ? 'rgba(46,204,113,0.2)'
                      : item.status === 'rejected' ? 'rgba(255,107,107,0.2)'
                      : 'var(--border-primary)'}`,
                  }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                          {item.profiles?.name}
                        </p>
                        <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                          {item.profiles?.generation}기
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold"
                          style={{ color: STATUS_COLOR[item.status] }}>
                          {STATUS_LABEL[item.status]}
                        </span>
                        {item.transfer_name && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(27,63,171,0.15)', color: 'var(--accent-blue)' }}>
                            {item.transfer_name}
                          </span>
                        )}
                        {item.reject_reason && (
                          <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                            {REJECT_REASONS.find(r => r.value === item.reject_reason)?.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <p className="text-sm font-black" style={{ color: 'var(--text-primary)' }}>
                        {item.amount.toLocaleString()}원
                      </p>
                      {item.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => callStatusApi(item.id, 'mark_paid')}
                            className="text-xs font-black px-2 py-1 rounded-lg btn-press"
                            style={{ background: 'rgba(46,204,113,0.2)', color: 'var(--accent-green)' }}>
                            확인
                          </button>
                          <button onClick={() => {
                            setRejectingId(isRejecting ? null : item.id)
                            setRejectReason('wrong_transfer_name')
                          }}
                            className="text-xs font-black px-2 py-1 rounded-lg btn-press"
                            style={{ background: 'rgba(255,107,107,0.15)', color: '#FF6B6B' }}>
                            반려
                          </button>
                        </div>
                      )}
                      {item.status === 'paid' && (
                        <button onClick={() => {
                          if (confirm('납부 확인을 취소할까요?')) callStatusApi(item.id, 'revert_unpaid')
                        }}
                          className="text-xs font-bold px-2 py-1 rounded-lg btn-press"
                          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-hint)' }}>
                          되돌리기
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 반려 처리 패널 */}
                  {isRejecting && (
                    <div className="mt-3 pt-3 flex flex-col gap-2"
                      style={{ borderTop: '0.5px solid var(--border-primary)' }}>
                      <p className="text-xs font-black" style={{ color: 'var(--text-hint)' }}>
                        반려 사유
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {REJECT_REASONS.map(r => (
                          <button key={r.value} type="button"
                            onClick={() => setRejectReason(r.value)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold btn-press"
                            style={{
                              background: rejectReason === r.value
                                ? 'rgba(255,107,107,0.3)' : 'var(--bg-secondary)',
                              border: `0.5px solid ${rejectReason === r.value
                                ? 'rgba(255,107,107,0.5)' : 'var(--border-primary)'}`,
                              color: rejectReason === r.value ? '#FF6B6B' : 'var(--text-tertiary)',
                            }}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => handleReject(item)}
                        className="w-full rounded-xl py-2.5 text-xs font-black btn-press"
                        style={{ background: 'rgba(255,107,107,0.2)', color: '#FF6B6B' }}>
                        반려 처리
                        {rejectReason === 'wrong_transfer_name' && ' + 환불 송금'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
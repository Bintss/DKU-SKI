'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

type Member = {
  id: string
  name: string
  generation: number
  role: string
}

export default function NewSettlementPage() {
  const { profile } = useProfile()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [splitEqual, setSplitEqual] = useState(true)
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-primary)',
    color: 'var(--text-primary)',
  }

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, generation, role')
        .neq('role', 'pending')
        .order('generation', { ascending: false })
      setMembers(data ?? [])
      setLoading(false)
    }
    fetchMembers()
  }, [])

  const toggleMember = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const isAllSelected = members.length > 0 && selectedIds.length === members.length

  const toggleAll = () => {
    setSelectedIds(isAllSelected ? [] : members.map(m => m.id))
  }

  const total = parseInt(totalAmount) || 0
  const amountPerPerson = selectedIds.length > 0 && total
    ? Math.floor(total / selectedIds.length)
    : 0
  const remainder = selectedIds.length > 0 && total
    ? total % selectedIds.length
    : 0

  // 개별 금액 합계
  const customTotal = Object.values(customAmounts)
    .filter(v => v !== '')
    .reduce((sum, v) => sum + (parseInt(v) || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (selectedIds.length === 0) { setError('정산 대상을 선택해주세요'); return }
    if (!total) { setError('총 금액을 입력해주세요'); return }

    if (!splitEqual) {
      if (customTotal !== total) {
        setError(`개별 금액 합계(${customTotal.toLocaleString()}원)가 총액(${total.toLocaleString()}원)과 달라요`)
        return
      }
    }

    setSubmitting(true)
    setError('')

    const { data: settlement, error: sErr } = await supabase
      .from('settlements')
      .insert({
        title,
        description: description || null,
        total_amount: total,
        amount_per_person: splitEqual ? Math.ceil(total / selectedIds.length) : 0,
        due_date: dueDate || null,
        created_by: profile.id,
      })
      .select()
      .single()

    if (sErr) { setError(sErr.message); setSubmitting(false); return }

    const items = selectedIds.map((uid, index) => {
      let amount: number
      if (splitEqual) {
        const base = Math.floor(total / selectedIds.length)
        amount = index < remainder ? base + 1 : base
      } else {
        amount = parseInt(customAmounts[uid] || '0')
      }
      return { settlement_id: settlement.id, user_id: uid, amount, is_paid: false }
    })

    await supabase.from('settlement_items').insert(items)
    await fetch('/api/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_INTERNAL_API_SECRET}`,
  },
  body: JSON.stringify({
    userIds: selectedIds.filter(id => id !== profile.id), // 본인 제외
    title: '새 정산 요청',
    body: `${profile.name}님이 "${title}" 정산을 요청했어요 · ${amountPerPerson.toLocaleString()}원`,
    url: `/settlement/${settlement.id}`,
  }),
})
    router.push('/settlement')
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="mb-6">
        <p className="text-xs font-black tracking-widest uppercase mb-1"
          style={{ color: 'var(--text-hint)' }}>Settlement</p>
        <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>정산 요청</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 정산명 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>정산명</label>
          <input type="text" placeholder="예: 1월 3주차 식비"
            value={title} onChange={e => setTitle(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
        </div>

        {/* 설명 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>설명 (선택)</label>
          <input type="text" placeholder="간단한 설명"
            value={description} onChange={e => setDescription(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
        </div>

        {/* 총 금액 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>총 금액 (원)</label>
          <input type="number" placeholder="0"
            value={totalAmount} onChange={e => setTotalAmount(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} required />
        </div>

        {/* 마감일 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-1.5 block"
            style={{ color: 'var(--text-hint)' }}>마감일 (선택)</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm" style={inputStyle} />
        </div>

        {/* 분할 방식 */}
        <div>
          <label className="text-xs font-black tracking-widest uppercase mb-2 block"
            style={{ color: 'var(--text-hint)' }}>분할 방식</label>
          <div className="flex gap-2">
            {[
              { value: true, label: '1/N 균등 분할' },
              { value: false, label: '개별 금액 설정' },
            ].map(opt => (
              <button key={String(opt.value)} type="button"
                onClick={() => setSplitEqual(opt.value)}
                className="flex-1 py-2.5 rounded-xl text-xs font-black btn-press"
                style={{
                  background: splitEqual === opt.value ? 'var(--ski-blue)' : 'var(--bg-card)',
                  border: `0.5px solid ${splitEqual === opt.value ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
                  color: splitEqual === opt.value ? '#fff' : 'var(--text-tertiary)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 대상 선택 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black tracking-widest uppercase"
              style={{ color: 'var(--text-hint)' }}>
              정산 대상
              <span className="ml-1.5 font-black" style={{ color: 'var(--text-tertiary)' }}>
                {selectedIds.length}명 선택
              </span>
            </label>
            <button type="button" onClick={toggleAll}
              className="text-xs font-black btn-press"
              style={{ color: 'var(--accent-blue)' }}>
              {isAllSelected ? '전체 해제' : '전체 선택'}
            </button>
          </div>

          {/* 1/N 미리보기 */}
          {splitEqual && total > 0 && selectedIds.length > 0 && (
            <div className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
              style={{ background: 'rgba(27,63,171,0.15)', border: '0.5px solid rgba(27,63,171,0.3)' }}>
              <span className="text-xs font-black" style={{ color: 'var(--text-hint)' }}>
                1인당 금액
              </span>
              <div className="text-right">
                <span className="text-base font-black" style={{ color: 'var(--accent-blue)' }}>
                  {amountPerPerson.toLocaleString()}원
                </span>
                {remainder > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-hint)' }}>
                    * {remainder}명은 {(amountPerPerson + 1).toLocaleString()}원 (최대 1원 차이)
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 개별 금액 합계 표시 */}
          {!splitEqual && selectedIds.length > 0 && (
            <div className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
              style={{
                background: customTotal === total && total > 0
                  ? 'rgba(46,204,113,0.1)' : 'rgba(255,255,255,0.04)',
                border: `0.5px solid ${customTotal === total && total > 0
                  ? 'rgba(46,204,113,0.3)' : 'var(--border-primary)'}`,
              }}>
              <span className="text-xs font-black" style={{ color: 'var(--text-hint)' }}>
                입력 합계
              </span>
              <span className="text-base font-black"
                style={{
                  color: customTotal === total && total > 0
                    ? 'var(--accent-green)'
                    : total > 0 ? '#F09595' : 'var(--text-tertiary)',
                }}>
                {customTotal.toLocaleString()}원
                {total > 0 && customTotal !== total && (
                  <span className="text-xs ml-1.5 font-normal">
                    / {total.toLocaleString()}원
                  </span>
                )}
              </span>
            </div>
          )}

          {/* 부원 목록 */}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {members.map(m => {
              const isSelected = selectedIds.includes(m.id)
              const isMe = m.id === profile?.id
              return (
                <div key={m.id}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer btn-press"
                  style={{
                    background: isSelected ? 'rgba(27,63,171,0.15)' : 'var(--bg-card)',
                    border: `0.5px solid ${isSelected ? 'rgba(27,63,171,0.4)' : 'var(--border-primary)'}`,
                  }}
                  onClick={() => toggleMember(m.id)}>
                  {/* 체크박스 */}
                  <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isSelected ? 'var(--ski-blue)' : 'rgba(255,255,255,0.06)',
                      border: `0.5px solid ${isSelected ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
                    }}>
                    {isSelected && (
                      <span className="text-white text-xs font-black">✓</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {m.name}
                    </span>
                    {isMe && (
                      <span className="text-xs ml-1.5 font-black"
                        style={{ color: 'var(--accent-blue)' }}>나</span>
                    )}
                    <span className="text-xs ml-1.5" style={{ color: 'var(--text-hint)' }}>
                      {m.generation}기
                    </span>
                  </div>

                  {/* 개별 금액 입력 */}
                  {!splitEqual && isSelected && (
                    <input type="number" placeholder="금액"
                      value={customAmounts[m.id] ?? ''}
                      onChange={e => setCustomAmounts(prev => ({
                        ...prev, [m.id]: e.target.value
                      }))}
                      onClick={e => e.stopPropagation()}
                      className="w-24 rounded-lg px-2 py-1.5 text-xs text-right"
                      style={inputStyle} />
                  )}

                  {/* 1/N 금액 표시 */}
                  {splitEqual && isSelected && total > 0 && (
                    <span className="text-xs font-black flex-shrink-0"
                      style={{ color: 'var(--accent-blue)' }}>
                      {(selectedIds.indexOf(m.id) < remainder
                        ? amountPerPerson + 1
                        : amountPerPerson
                      ).toLocaleString()}원
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {error && (
          <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>
        )}

        <button type="submit" disabled={submitting || !profile}
          className="w-full text-white rounded-xl py-3.5 text-sm font-black disabled:opacity-50 btn-press"
          style={{ background: 'var(--ski-blue)' }}>
          {submitting ? '등록 중...' : '정산 요청하기'}
        </button>
      </form>
    </main>
  )
}
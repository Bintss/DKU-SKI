import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendToUsers } from '@/lib/push-server'

const LABEL_TO_CODE: Record<string, { code: string; label: string }> = {
  '합숙비':   { code: '130', label: '합숙비' },
  '가입비':   { code: '110', label: '가입비' },
  '회비':     { code: '120', label: '회비' },
  '티셔츠':   { code: '140', label: '사업운영' },
  '사업운영':  { code: '140', label: '사업운영' },
  '후원금':   { code: '150', label: '후원금' },
  '참가비':   { code: '130', label: '합숙비' },
}

type BankTransaction = {
  date: string
  time: string
  description: string
  displayName: string
  counterparty: string
  amount: number
  balance: number
  type: 'deposit' | 'withdrawal'
  branch: string
  memo: string
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: settings } = await adminClient
      .from('club_settings')
      .select('current_season')
      .eq('id', 1)
      .single()
    const season = settings?.current_season ?? '2026-27'

    const { data: admins } = await adminClient
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
    const adminIds = admins?.map(a => a.id) ?? []

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 3)
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, '')

    const isMock = !process.env.BANK_API_KEY

    const transactions: BankTransaction[] = isMock
      ? [
          {
        date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
        time: '160000',
        displayName: '신정우a01',   // ← 실제 transfer_name
        counterparty: '',
        description: '이체',
        amount: 10000,              // ← 실제 amount
        balance: 1000000,
        type: 'deposit',
        branch: '',
        memo: '',
      },
          {
            date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
            time: '160100',
            displayName: '테스트회비',
            counterparty: '',
            description: '이체',
            amount: 5000,
            balance: 1005000,
            type: 'deposit',
            branch: '',
            memo: '',
          },
          {
            date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
            time: '160200',
            displayName: '알수없는입금',
            counterparty: '',
            description: '이체',
            amount: 50000,
            balance: 1055000,
            type: 'deposit',
            branch: '',
            memo: '',
          },
        ]
      : await (async () => {
          const bankRes = await fetch('https://api.bankapi.co.kr/v1/transactions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.BANK_API_KEY}:${process.env.BANK_API_SECRET}`,
            },
            body: JSON.stringify({
              bankCode: process.env.BANK_CODE,
              accountNumber: process.env.BANK_ACCOUNT_NUMBER,
              accountPassword: process.env.BANK_ACCOUNT_PASSWORD,
              residentNumber: process.env.BANK_RESIDENT_NUMBER,
              startDate: fmt(startDate),
              endDate: fmt(endDate),
            }),
          })
          const bankData = await bankRes.json()
          if (!bankData.success) {
            throw new Error(bankData.error ?? 'Bank API failed')
          }
          return bankData.transactions ?? []
        })()

    let inserted = 0
    let skipped = 0
    let autoConfirmed = 0
    let pendingCount = 0
    let unmatched = 0

    for (const tx of transactions) {
      const dateStr = `${tx.date.slice(0,4)}-${tx.date.slice(4,6)}-${tx.date.slice(6,8)}`
      const timeStr = `${tx.time.slice(0,2)}:${tx.time.slice(2,4)}:${tx.time.slice(4,6)}`
      const tradedAt = new Date(`${dateStr}T${timeStr}`)
      const amount = tx.type === 'deposit' ? tx.amount : -tx.amount

      const { data: upserted, error: upsertError } = await adminClient
        .from('finance_transactions')
        .upsert({
          season,
          traded_at: tradedAt.toISOString(),
          description: tx.displayName || tx.counterparty || tx.description,
          transaction_type: tx.type,
          institution: tx.branch || null,
          amount,
          balance_after: tx.balance,
          memo: tx.memo || null,
          status: 'unclassified',
          is_deposit_transfer: false,
        }, {
          onConflict: 'season,traded_at,amount',
          ignoreDuplicates: true,
        })
        .select()
        .single()

      if (upsertError || !upserted) {
        skipped++
        continue
      }

      inserted++

      if (tx.type !== 'deposit') continue

      const senderName = tx.displayName?.trim()
      if (!senderName) continue

      const { data: matchedItems } = await adminClient
  .from('settlement_items')
  .select(`
    id, settlement_id, amount, user_id, transfer_name,
    profiles(name, refund_bank_name, refund_account_number, refund_account_holder),
    settlements(title, transfer_label, event_id)
  `)
  .eq('transfer_name', senderName)
  .eq('status', 'unpaid')
  .limit(1)

const matchedItem = matchedItems?.[0] ?? null

      // Case 3: 송금명 매칭 안 됨
      if (!matchedItem) {
        unmatched++
        sendToUsers(
          adminClient,
          adminIds,
          '⚠️ 미확인 입금',
          `송금명 "${senderName}" — ${tx.amount.toLocaleString()}원. 정산 페이지에서 해당 부원을 찾아 입금 확인해주세요.`,
          '/settlement'
        ).catch(() => {})
        continue
      }

      const settlement = matchedItem.settlements as any
      const transferLabel = settlement?.transfer_label ?? ''

      // Case 1: 송금명 ✅ + 금액 ✅ → 자동 paid
      if (matchedItem.amount === tx.amount) {
        await adminClient
          .from('settlement_items')
          .update({
            status: 'paid',
            is_paid: true,
            paid_at: tradedAt.toISOString(),
            reject_reason: null,
            actual_amount: null,
          })
          .eq('id', matchedItem.id)

        // 행사 연동 정산이면 event_participants 확정
        if (settlement?.event_id) {
          await adminClient
            .from('event_participants')
            .update({ status: 'confirmed' })
            .eq('event_id', settlement.event_id)
            .eq('user_id', matchedItem.user_id)
        }

        // finance_transactions 자동 분류
        const accountInfo = LABEL_TO_CODE[transferLabel] ?? { code: '190', label: '기타수입' }
        await adminClient
          .from('finance_transactions')
          .update({
            status: 'classified',
            account_code: accountInfo.code,
            account_label: accountInfo.label,
            classified_at: new Date().toISOString(),
          })
          .eq('id', upserted.id)

        sendToUsers(
          adminClient,
          [matchedItem.user_id],
          '정산 납부 확인 완료 ✓',
          `"${settlement?.title}" ${tx.amount.toLocaleString()}원 납부가 자동 확인됐어요!`,
          `/settlement/${matchedItem.settlement_id}`
        ).catch(() => {})

        autoConfirmed++
        continue
      }

      // Case 2: 송금명 ✅ + 금액 ❌ → pending + actual_amount 저장
      await adminClient
        .from('settlement_items')
        .update({
          status: 'pending',
          actual_amount: tx.amount,
        })
        .eq('id', matchedItem.id)

      pendingCount++

      sendToUsers(
        adminClient,
        adminIds,
        '⚠️ 금액 불일치 입금',
        `${senderName} — 정산금액 ${matchedItem.amount.toLocaleString()}원 / 실제입금 ${tx.amount.toLocaleString()}원. 반려 처리 후 환불해주세요.`,
        `/settlement/${matchedItem.settlement_id}`
      ).catch(() => {})

      sendToUsers(
        adminClient,
        [matchedItem.user_id],
        '⚠️ 입금 금액 확인 필요',
        `정산금액(${matchedItem.amount.toLocaleString()}원)과 실제 입금액(${tx.amount.toLocaleString()}원)이 달라요. 운영진이 확인 중이에요.`,
        `/settlement/${matchedItem.settlement_id}`
      ).catch(() => {})
    }

    return NextResponse.json({
      ok: true,
      season,
      total: transactions.length,
      inserted,
      skipped,
      autoConfirmed,
      pendingCount,
      unmatched,
    })
  } catch (error) {
    console.error('sync error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
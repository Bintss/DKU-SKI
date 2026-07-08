import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { sendToUsers } from '@/lib/push-server'

type SettlementItemRow = {
  id: string
  settlement_id: string
  user_id: string
  amount: number
  status: string
  is_paid: boolean
  transfer_name: string | null
  reject_reason: string | null
  settlements: { title: string; created_by: string } | null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { itemId, action, rejectReason } = body
    // action: 'confirm_deposit' (unpaid → pending, 운영진)
    //       | 'mark_paid'       (pending → paid, 운영진)
    //       | 'revert_unpaid'   (paid → unpaid, 운영진)
    //       | 'reject'          (pending → unpaid + reject_reason, 운영진)

    const validActions = ['confirm_deposit', 'mark_paid', 'revert_unpaid', 'reject']
    if (!itemId || !validActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: item } = await adminClient
      .from('settlement_items')
      .select('*, settlements(title, created_by)')
      .eq('id', itemId)
      .single() as { data: SettlementItemRow | null }

    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: requesterProfile } = await adminClient
      .from('profiles').select('role').eq('id', user.id).single()
    const isAdmin = requesterProfile?.role === 'admin'
    const isCreator = item.settlements?.created_by === user.id

    if (!isAdmin && !isCreator) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let newStatus: string
    let updateData: Record<string, unknown>

    switch (action) {
      case 'confirm_deposit':
        // 운영진이 수동으로 입금 확인 (Case 3 — 송금명 불일치)
        if (item.status !== 'unpaid') {
          return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 })
        }
        newStatus = 'pending'
        updateData = { status: 'pending' }
        break

      case 'mark_paid':
        if (item.status !== 'pending') {
          return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 })
        }
        newStatus = 'paid'
        updateData = {
          status: 'paid',
          is_paid: true,
          paid_at: new Date().toISOString(),
          reject_reason: null,
        }
        break

      case 'revert_unpaid':
        if (item.status !== 'paid') {
          return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 })
        }
        newStatus = 'unpaid'
        updateData = {
          status: 'unpaid',
          is_paid: false,
          paid_at: null,
          reject_reason: null,
        }
        break

      case 'reject':
        if (item.status !== 'pending') {
          return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 })
        }
        newStatus = 'unpaid'
        updateData = {
          status: 'unpaid',
          is_paid: false,
          paid_at: null,
          reject_reason: rejectReason ?? 'other',
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { error: updateError } = await adminClient
      .from('settlement_items')
      .update(updateData)
      .eq('id', itemId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const settlementTitle = item.settlements?.title ?? '정산'
    const settlementId = item.settlement_id

    // 납부 확인 완료 알림
    if (action === 'mark_paid') {
      sendToUsers(
        adminClient,
        [item.user_id],
        '정산 납부 확인 완료',
        `"${settlementTitle}" ${item.amount.toLocaleString()}원 납부가 확인됐어요!`,
        `/settlement/${settlementId}`
      ).catch(err => console.error('push send error:', err))
    }

    // 입금 확인 알림 (운영진이 수동 pending 전환)
    if (action === 'confirm_deposit') {
      sendToUsers(
        adminClient,
        [item.user_id],
        '입금 확인 중',
        `"${settlementTitle}" 입금이 확인됐어요. 운영진이 검토 후 처리해요.`,
        `/settlement/${settlementId}`
      ).catch(err => console.error('push send error:', err))
    }

    return NextResponse.json({ ok: true, status: newStatus })
  } catch (error) {
    console.error('settlement status error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
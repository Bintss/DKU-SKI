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
  settlements: { title: string; created_by: string; event_id: string | null } | null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { itemId, action, rejectReason } = body

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
      .select('*, settlements(title, created_by, event_id)')
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
    const eventId = item.settlements?.event_id ?? null

    // mark_paid — 납부 확인 완료
    if (action === 'mark_paid') {
      // 행사 연동 정산이면 event_participants 확정
      if (eventId) {
        await adminClient
          .from('event_participants')
          .update({ status: 'confirmed' })
          .eq('event_id', eventId)
          .eq('user_id', item.user_id)
      }

      sendToUsers(
        adminClient,
        [item.user_id],
        '정산 납부 확인 완료',
        `"${settlementTitle}" ${item.amount.toLocaleString()}원 납부가 확인됐어요!`,
        `/settlement/${settlementId}`
      ).catch(err => console.error('push send error:', err))
    }

    // revert_unpaid — 행사 참가자도 pending_payment로 되돌리기
    if (action === 'revert_unpaid' && eventId) {
      await adminClient
        .from('event_participants')
        .update({ status: 'pending_payment' })
        .eq('event_id', eventId)
        .eq('user_id', item.user_id)
    }

    // confirm_deposit — 입금 확인 알림
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
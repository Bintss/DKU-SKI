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
  settlements: { title: string; created_by: string } | null
}

export async function POST(req: NextRequest) {
  try {
    const { itemId, action } = await req.json()
    // action: 'request_confirm' (unpaid→pending, 본인만)
    //       | 'cancel_pending' (pending→unpaid, 본인만)
    //       | 'mark_paid' (→paid, 요청자/운영진만)
    //       | 'revert_unpaid' (paid→unpaid, 요청자/운영진만)

    const validActions = ['request_confirm', 'cancel_pending', 'mark_paid', 'revert_unpaid']
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

    // 대상 항목 + 정산 정보 조회
    const { data: item } = await adminClient
      .from('settlement_items')
      .select('*, settlements(title, created_by)')
      .eq('id', itemId)
      .single() as { data: SettlementItemRow | null }

    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = item.user_id === user.id
    const { data: requesterProfile } = await adminClient
      .from('profiles').select('role, name').eq('id', user.id).single()
    const isAdmin = requesterProfile?.role === 'admin'
    const isCreator = item.settlements?.created_by === user.id
    const canConfirm = isCreator || isAdmin

    // 권한별 분기
    if (action === 'request_confirm' || action === 'cancel_pending') {
      if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden: not item owner' }, { status: 403 })
      }
    }

    if (action === 'mark_paid' || action === 'revert_unpaid') {
      if (!canConfirm) {
        return NextResponse.json({ error: 'Forbidden: requester or admin only' }, { status: 403 })
      }
    }

    let newStatus: string
    let updateData: Record<string, unknown>

    switch (action) {
      case 'request_confirm':
        if (item.status !== 'unpaid') {
          return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 })
        }
        newStatus = 'pending'
        updateData = { status: 'pending' }
        break
      case 'cancel_pending':
        if (item.status !== 'pending') {
          return NextResponse.json({ error: 'Invalid state transition' }, { status: 400 })
        }
        newStatus = 'unpaid'
        updateData = { status: 'unpaid' }
        break
      case 'mark_paid':
        newStatus = 'paid'
        updateData = { status: 'paid', is_paid: true, paid_at: new Date().toISOString() }
        break
      case 'revert_unpaid':
        if (!isAdmin && !isCreator) {
          return NextResponse.json({ error: 'Forbidden: requester or admin only' }, { status: 403 })
        }
        newStatus = 'unpaid'
        updateData = { status: 'unpaid', is_paid: false, paid_at: null }
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

    // 알림 발송 — DB 변경이 확실히 끝난 후 실행
    const settlementTitle = item.settlements?.title ?? '정산'
    const settlementId = item.settlement_id

    if (action === 'request_confirm' && item.settlements?.created_by) {
      sendToUsers(
        adminClient,
        [item.settlements.created_by],
        '송금 확인 요청',
        `${requesterProfile?.name ?? '누군가'}님이 "${settlementTitle}" 정산 송금을 완료했어요. 확인해주세요!`,
        `/settlement/${settlementId}`
      ).catch(err => console.error('push send error:', err))
    }

    if (action === 'mark_paid') {
      sendToUsers(
        adminClient,
        [item.user_id],
        '정산 납부 확인 완료',
        `"${settlementTitle}" 정산 ${item.amount.toLocaleString()}원 납부가 확인됐어요!`,
        `/settlement/${settlementId}`
      ).catch(err => console.error('push send error:', err))
    }

    return NextResponse.json({ ok: true, status: newStatus })
  } catch (error) {
    console.error('settlement status error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
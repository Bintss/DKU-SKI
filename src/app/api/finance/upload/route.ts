import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { parseMemo, ACCOUNT_CODES } from '@/lib/finance-codes'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  try {
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

    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const season = formData.get('season') as string
    const password = formData.get('password') as string | null

    if (!file || !season) {
      return NextResponse.json({ error: 'file과 season이 필요해요' }, { status: 400 })
    }

    // xlsx 파싱 — 암호화 파일 지원
    const buffer = await file.arrayBuffer()
    let workbook: XLSX.WorkBook

    try {
      workbook = XLSX.read(buffer, {
        type: 'array',
        password: password || undefined,
      })
    } catch {
      if (password) {
        return NextResponse.json({
          error: '비밀번호가 올바르지 않거나 파일을 읽을 수 없어요'
        }, { status: 400 })
      }
      return NextResponse.json({
        error: '파일을 읽을 수 없어요. 암호화된 파일이라면 비밀번호를 입력해주세요'
      }, { status: 400 })
    }

    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
    })

    // 헤더 행 찾기
    let headerIdx = -1
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].some((cell: any) =>
        String(cell ?? '').includes('거래 일시') || String(cell ?? '').includes('거래일시')
      )) {
        headerIdx = i
        break
      }
    }

    if (headerIdx === -1) {
      return NextResponse.json({ error: '거래내역 형식이 올바르지 않아요' }, { status: 400 })
    }

    const headers: string[] = rows[headerIdx].map((h: any) => String(h ?? ''))
    const colIdx = {
      date: headers.findIndex(h => h.includes('거래 일시') || h.includes('거래일시')),
      desc: headers.findIndex(h => h.includes('적요')),
      type: headers.findIndex(h => h.includes('거래 유형') || h.includes('거래유형')),
      inst: headers.findIndex(h => h.includes('거래 기관') || h.includes('거래기관')),
      amount: headers.findIndex(h => h.includes('거래 금액') || h.includes('거래금액')),
      balance: headers.findIndex(h => h.includes('잔액')),
      memo: headers.findIndex(h => h.includes('메모')),
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const toInsert = []

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row[colIdx.date] || row[colIdx.amount] === null) continue

      // 날짜 파싱 ('2026.06.27 21:59:20' 형식)
      const rawDate = String(row[colIdx.date]).trim()
      const tradedAt = rawDate.replace(
        /(\d{4})\.(\d{2})\.(\d{2}) (\d{2}:\d{2}:\d{2})/,
        '$1-$2-$3T$4+09:00'
      )

      const amount = Number(row[colIdx.amount]) || 0
      const memo = row[colIdx.memo] ? String(row[colIdx.memo]).trim() : null
      const { code, label } = parseMemo(memo)

      // 계정코드 기반 자동 분류
      let status: 'unclassified' | 'classified' | 'ignored' = 'unclassified'
      let isDepositTransfer = false
      let depositDirection: 'in' | 'out' | null = null

      if (code === '999') {
        status = 'ignored'
      } else if (code === '320') {
        status = 'classified'
        isDepositTransfer = true
        depositDirection = amount >= 0 ? 'in' : 'out'
      } else if (code && ACCOUNT_CODES[code]) {
        status = 'classified'
      }

      toInsert.push({
        season,
        traded_at: tradedAt,
        description: String(row[colIdx.desc] ?? '').trim(),
        transaction_type: String(row[colIdx.type] ?? '').trim(),
        institution: row[colIdx.inst] ? String(row[colIdx.inst]).trim() : null,
        amount,
        balance_after: row[colIdx.balance] != null ? Number(row[colIdx.balance]) : null,
        memo,
        account_code: code,
        account_label: label,
        status,
        is_deposit_transfer: isDepositTransfer,
        deposit_direction: depositDirection,
        classified_by: status === 'classified' ? user.id : null,
        classified_at: status === 'classified' ? new Date().toISOString() : null,
      })
    }

    if (toInsert.length === 0) {
      return NextResponse.json({ error: '파싱된 거래 내역이 없어요' }, { status: 400 })
    }

    const { data: inserted, error: insertError } = await adminClient
      .from('finance_transactions')
      .upsert(toInsert, {
        onConflict: 'season,traded_at,amount',
        ignoreDuplicates: true,
      })
      .select('id')

    if (insertError) {
      console.error('insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const insertedCount = inserted?.length ?? 0
    const skipped = toInsert.length - insertedCount
    const autoClassified = toInsert.filter(r => r.status === 'classified').length
    const autoIgnored = toInsert.filter(r => r.status === 'ignored').length
    const needsClassification = toInsert.filter(r => r.status === 'unclassified').length

    return NextResponse.json({
      ok: true,
      total: toInsert.length,
      inserted: insertedCount,
      skipped,
      autoClassified,
      autoIgnored,
      needsClassification,
    })

  } catch (error) {
    console.error('finance upload error:', error)
    return NextResponse.json({ error: '업로드 처리 중 오류가 발생했어요' }, { status: 500 })
  }
}
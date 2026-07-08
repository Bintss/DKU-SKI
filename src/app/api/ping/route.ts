import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    await supabase.from('club_settings').select('id').eq('id', 1).single()
    return Response.json({ ok: true, time: new Date().toISOString() })
  } catch (error) {
    return Response.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
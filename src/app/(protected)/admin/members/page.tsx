'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Profile = {
  id: string
  name: string
  generation: number
  join_type: string
  student_id: string | null
  role: string
  created_at: string
}

export default function AdminMembersPage() {
  const [pending, setPending] = useState<Profile[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setPending(data.filter(p => p.role === 'pending'))
      setMembers(data.filter(p => p.role !== 'pending'))
    }
    setLoading(false)
  }

  useEffect(() => { fetchProfiles() }, [])

  const approve = async (id: string, joinType: string) => {
    const role = joinType === 'ob' ? 'ob' : 'member'
    await supabase.from('profiles').update({ role }).eq('id', id)
    fetchProfiles()
  }

  const reject = async (id: string) => {
    await supabase.auth.admin.deleteUser(id)
    fetchProfiles()
  }

  const changeRole = async (id: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    fetchProfiles()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">불러오는 중...</p>
    </div>
  )

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-xl font-semibold mb-8">회원 관리</h1>

      {/* 승인 대기 */}
      <section className="mb-10">
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          승인 대기 <span className="text-blue-500 ml-1">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center border rounded-xl">
            대기 중인 가입 신청이 없어요
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map(p => (
              <div key={p.id} className="border rounded-xl px-4 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.generation}기 · {p.join_type === 'ob' ? '졸업생' : '재학생'}
                    {p.student_id && ` · ${p.student_id}`}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => approve(p.id, p.join_type)}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
                  >
                    승인
                  </button>
                  <button
                    onClick={() => reject(p.id)}
                    className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200"
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 전체 부원 */}
      <section>
        <h2 className="text-sm font-medium text-gray-500 mb-3">
          전체 부원 <span className="text-gray-700 ml-1">{members.length}</span>
        </h2>
        <div className="flex flex-col gap-3">
          {members.map(p => (
            <div key={p.id} className="border rounded-xl px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.generation}기 · {p.join_type === 'ob' ? '졸업생' : '재학생'}
                  {p.student_id && ` · ${p.student_id}`}
                </p>
              </div>
              <select
                value={p.role}
                onChange={e => changeRole(p.id, e.target.value)}
                className="text-xs border rounded-lg px-2 py-1.5 text-gray-600 outline-none"
              >
                <option value="member">부원</option>
                <option value="ob">OB</option>
                <option value="admin">운영진</option>
                <option value="pending">대기</option>
              </select>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

type Profile = {
  id: string
  name: string
  generation: number
  role: string
  join_type: string
  student_id: string | null
  bio: string | null
  avatar_url: string | null
}

export default function MemberDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [member, setMember] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      setMember(data)
      setLoading(false)
    }
    fetchData()
  }, [id])

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '승인 대기'
  }

  const roleColor: Record<string, string> = {
    member: 'bg-blue-50 text-blue-600',
    ob: 'bg-purple-50 text-purple-600',
    admin: 'bg-orange-50 text-orange-600',
    pending: 'bg-gray-100 text-gray-400',
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">불러오는 중...</p>
    </div>
  )

  if (!member) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-gray-400">부원을 찾을 수 없어요</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <a href="/members" className="text-xs text-gray-400 hover:text-gray-600 block mb-4">
        ← 동문 디렉토리
      </a>

      {/* 프로필 카드 */}
      <div className="rounded-2xl p-6 mb-5 text-white text-center"
        style={{ background: 'linear-gradient(135deg, var(--ski-blue) 0%, var(--ski-blue-light) 100%)' }}
      >
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-white/30 mx-auto mb-3"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold mx-auto mb-3">
            {member.name[0]}
          </div>
        )}
        <p className="text-xl font-bold mb-1">{member.name}</p>
        <p className="text-blue-200 text-sm">
          {member.generation}기 · {member.join_type === 'ob' ? '졸업생' : '재학생'}
        </p>
        <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium ${roleColor[member.role]}`}>
          {roleLabel[member.role]}
        </span>
      </div>

      {/* 자기소개 */}
      {member.bio && (
        <div className="bg-white border rounded-2xl p-5 mb-4">
          <h2 className="text-sm font-medium text-gray-500 mb-2">자기소개</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{member.bio}</p>
        </div>
      )}

      {/* 기본 정보 */}
      <div className="bg-white border rounded-2xl p-5">
        <h2 className="text-sm font-medium text-gray-500 mb-3">기본 정보</h2>
        <div className="flex flex-col gap-0">
          <div className="flex justify-between items-center py-2.5 border-b">
            <span className="text-sm text-gray-500">기수</span>
            <span className="text-sm font-medium text-gray-900">{member.generation}기</span>
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-gray-500">구분</span>
            <span className="text-sm font-medium text-gray-900">
              {member.join_type === 'ob' ? '졸업생 / OB' : '재학생'}
            </span>
          </div>
        </div>
      </div>
    </main>
  )
}
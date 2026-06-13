'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

type Member = {
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
  const { profile, loading: profileLoading } = useProfile()
  const supabase = createClient()

  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    // 내 프로필이면 /profile로 이동
    if (profile.id === id) { router.replace('/profile'); return }

    const fetchData = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, generation, role, join_type, student_id, bio, avatar_url')
        .eq('id', id)
        .single()
      setMember(data)
      setLoading(false)
    }
    fetchData()
  }, [profile, id])

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '승인 대기'
  }

  const roleColor: Record<string, string> = {
    member: 'rgba(27,63,171,0.3)',
    ob: 'rgba(155,89,182,0.3)',
    admin: 'rgba(230,126,34,0.3)',
    pending: 'rgba(255,255,255,0.06)',
  }

  const roleTextColor: Record<string, string> = {
    member: 'var(--accent-blue)',
    ob: 'var(--accent-purple)',
    admin: 'var(--accent-orange)',
    pending: 'var(--text-hint)',
  }

  if (profileLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  if (!member) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>부원을 찾을 수 없어요</p>
    </div>
  )

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <a href="/members" className="text-xs font-semibold block mb-4"
        style={{ color: 'var(--text-tertiary)' }}>
        ← 동문 디렉토리
      </a>

      {/* 프로필 카드 */}
      <div className="rounded-2xl p-6 mb-5 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1B3FAB 0%, #2E55C8 100%)',
          boxShadow: '0 8px 32px rgba(27,63,171,0.3)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(30%,-30%)' }} />

        {member.avatar_url ? (
          <img src={member.avatar_url} alt={member.name}
            className="w-20 h-20 rounded-full object-cover mx-auto mb-3"
            style={{ border: '2px solid rgba(255,255,255,0.3)' }} />
        ) : (
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black mx-auto mb-3"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            {member.name[0]}
          </div>
        )}

        <p className="text-xl font-black mb-1" style={{ color: '#fff' }}>{member.name}</p>
        <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {member.generation}기 · {member.join_type === 'ob' ? '졸업생' : '재학생'}
        </p>
        <span className="inline-block text-xs font-black px-3 py-1 rounded-full"
          style={{
            background: roleColor[member.role] ?? 'rgba(255,255,255,0.15)',
            color: roleTextColor[member.role] ?? '#fff',
          }}>
          {roleLabel[member.role]}
        </span>
      </div>

      {/* 자기소개 */}
      {member.bio && (
        <div className="rounded-2xl p-5 mb-4"
          style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
          <h2 className="text-xs font-black tracking-widest uppercase mb-2"
            style={{ color: 'var(--text-hint)' }}>자기소개</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {member.bio}
          </p>
        </div>
      )}

      {/* 기본 정보 */}
      <div className="rounded-2xl p-5"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>기본 정보</h2>
        {[
          { label: '기수', value: `${member.generation}기` },
          { label: '구분', value: member.join_type === 'ob' ? '졸업생 / OB' : '재학생' },
        ].map((item, i, arr) => (
          <div key={item.label}
            className="flex justify-between items-center py-2.5"
            style={{
              borderBottom: i < arr.length - 1
                ? '0.5px solid var(--border-primary)' : 'none'
            }}>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.label}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </main>
  )
}
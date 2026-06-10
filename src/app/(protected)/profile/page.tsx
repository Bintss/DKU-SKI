'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [generation, setGeneration] = useState('')
  const [joinType, setJoinType] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(data)
      setName(data?.name ?? '')
      setBio(data?.bio ?? '')
      setGeneration(String(data?.generation ?? ''))
      setJoinType(data?.join_type ?? 'student')
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setAvatarUploading(true)

    const ext = file.name.split('.').pop()
    const fileName = `${profile.id}/avatar.${ext}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (error) {
      alert('업로드 실패: ' + error.message)
      setAvatarUploading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    const avatarUrl = data.publicUrl + '?t=' + Date.now()

    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev)
    setAvatarUploading(false)
  }

  const handleSave = async () => {
    if (!profile) return
    setSubmitting(true)

    await supabase
      .from('profiles')
      .update({
        name,
        bio,
        generation: parseInt(generation),
        join_type: joinType,
      })
      .eq('id', profile.id)

    setProfile(prev => prev ? {
      ...prev,
      name,
      bio,
      generation: parseInt(generation),
      join_type: joinType,
    } : prev)
    setEditMode(false)
    setSubmitting(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

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

  if (!profile) return null

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-gray-900">내 프로필</h1>
        {!editMode ? (
          <button
            onClick={() => setEditMode(true)}
            className="text-xs text-white px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--ski-blue)' }}
          >
            수정
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={submitting}
              className="text-xs text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
              style={{ background: 'var(--ski-blue)' }}
            >
              {submitting ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={() => {
                setEditMode(false)
                setName(profile.name)
                setBio(profile.bio ?? '')
                setGeneration(String(profile.generation))
                setJoinType(profile.join_type)
              }}
              className="text-xs bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg"
            >
              취소
            </button>
          </div>
        )}
      </div>

      {/* 프로필 카드 */}
      <div className="rounded-2xl p-6 mb-5 text-white text-center"
        style={{ background: 'linear-gradient(135deg, var(--ski-blue) 0%, var(--ski-blue-light) 100%)' }}
      >
        {/* 아바타 */}
        <div className="relative w-20 h-20 mx-auto mb-3">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="프로필 사진"
              className="w-20 h-20 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
              {profile.name[0]}
            </div>
          )}
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow"
            style={{ color: 'var(--ski-blue)' }}
          >
            {avatarUploading ? (
              <span className="text-xs">...</span>
            ) : (
              <span className="text-sm">📷</span>
            )}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>

        <p className="text-xl font-bold mb-1">{editMode ? name : profile.name}</p>
        <p className="text-blue-200 text-sm mt-1">
          {editMode ? `${generation}기` : `${profile.generation}기`}
          {' · '}
          {(editMode ? joinType : profile.join_type) === 'ob' ? '졸업생' : '재학생'}
        </p>
        <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium ${roleColor[profile.role]}`}>
          {roleLabel[profile.role]}
        </span>
      </div>

      {/* 기본 정보 */}
      <div className="bg-white border rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-500 mb-3">기본 정보</h2>
        <div className="flex flex-col gap-0">
          <div className="flex justify-between items-center py-2.5 border-b">
            <span className="text-sm text-gray-500">이름</span>
            {editMode ? (
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="text-sm font-medium text-gray-900 bg-gray-50 border rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 text-right"
              />
            ) : (
              <span className="text-sm font-medium text-gray-900">{profile.name}</span>
            )}
          </div>
          <div className="flex justify-between items-center py-2.5 border-b">
            <span className="text-sm text-gray-500">기수</span>
            {editMode ? (
              <input
                type="number"
                value={generation}
                onChange={e => setGeneration(e.target.value)}
                className="text-sm font-medium text-gray-900 bg-gray-50 border rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 text-right w-24"
              />
            ) : (
              <span className="text-sm font-medium text-gray-900">{profile.generation}기</span>
            )}
          </div>
          <div className="flex justify-between items-center py-2.5 border-b">
            <span className="text-sm text-gray-500">구분</span>
            {editMode ? (
              <select
                value={joinType}
                onChange={e => setJoinType(e.target.value)}
                className="text-sm font-medium text-gray-900 bg-gray-50 border rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
              >
                <option value="student">재학생</option>
                <option value="ob">졸업생 / OB</option>
              </select>
            ) : (
              <span className="text-sm font-medium text-gray-900">
                {profile.join_type === 'ob' ? '졸업생 / OB' : '재학생'}
              </span>
            )}
          </div>
          {profile.student_id && (
            <div className="flex justify-between items-center py-2.5 border-b">
              <span className="text-sm text-gray-500">학번</span>
              <span className="text-sm font-medium text-gray-900">{profile.student_id}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-2.5">
            <span className="text-sm text-gray-500">권한</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleColor[profile.role]}`}>
              {roleLabel[profile.role]}
            </span>
          </div>
        </div>
      </div>

      {/* 자기소개 */}
      <div className="bg-white border rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-medium text-gray-500 mb-3">자기소개</h2>
        {editMode ? (
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="스키 실력, 포지션, 하고 싶은 말 등 자유롭게 적어주세요"
            rows={4}
            className="w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-400 resize-none"
          />
        ) : (
          <p className="text-sm text-gray-600 leading-relaxed">
            {profile.bio || (
              <span className="text-gray-300">자기소개를 작성해보세요</span>
            )}
          </p>
        )}
      </div>

      {/* 로그아웃 */}
      <button
        onClick={handleLogout}
        className="w-full bg-white border rounded-2xl py-4 text-sm font-medium text-red-400 hover:bg-red-50 transition-colors"
      >
        로그아웃
      </button>
    </main>
  )
}
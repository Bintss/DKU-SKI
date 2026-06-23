'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

export default function ProfilePage() {
  const { profile, loading: profileLoading, refetch } = useProfile()
  const [editMode, setEditMode] = useState(false)
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [generation, setGeneration] = useState('')
  const [joinType, setJoinType] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  // profile 로드 시 폼 초기화
  useEffect(() => {
    if (!profile) return
    setName(profile.name ?? '')
    setBio(profile.bio ?? '')
    setGeneration(String(profile.generation ?? ''))
    setJoinType(profile.join_type ?? 'student')
    setPhone((profile as any).phone ?? '')
  }, [profile])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setAvatarUploading(true)

    const ext = file.name.split('.').pop()
    const fileName = `${profile.id}/avatar.${ext}`

    const { error } = await supabase.storage
      .from('avatars').upload(fileName, file, { upsert: true })
    if (error) { alert('업로드 실패: ' + error.message); setAvatarUploading(false); return }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    const avatarUrl = data.publicUrl + '?t=' + Date.now()

    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile.id)
    await refetch()
    setAvatarUploading(false)
  }

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length < 4) return digits
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  const handleSave = async () => {
    if (!profile) return
    setSubmitting(true)

    await supabase.from('profiles').update({
      name, bio,
      generation: parseInt(generation),
      join_type: joinType,
      phone: phone || null,
    }).eq('id', profile.id)

    await refetch()
    setEditMode(false)
    setSubmitting(false)
  }

  const handleCancel = () => {
    if (!profile) return
    setName(profile.name ?? '')
    setBio(profile.bio ?? '')
    setGeneration(String(profile.generation ?? ''))
    setJoinType(profile.join_type ?? 'student')
    setPhone(profile.phone ?? '')
    setEditMode(false)
  }

  const handleLogout = async () => {
  sessionStorage.removeItem('splash_shown')
  await supabase.auth.signOut()
  router.push('/login')
}

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '승인 대기'
  }

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-primary)',
    color: 'var(--text-primary)',
  }

  if (profileLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </div>
  )

  if (!profile) return null

  return (
    <main className="max-w-lg mx-auto px-4 pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Profile</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>내 프로필</h1>
        </div>
        {!editMode ? (
          <button onClick={() => setEditMode(true)}
            className="text-xs font-black text-white px-4 py-2 rounded-xl btn-press"
            style={{ background: 'var(--ski-blue)' }}>
            수정
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={submitting}
              className="text-xs font-black text-white px-3 py-1.5 rounded-lg disabled:opacity-50 btn-press"
              style={{ background: 'var(--ski-blue)' }}>
              {submitting ? '저장 중...' : '저장'}
            </button>
            <button onClick={handleCancel}
              className="text-xs font-black px-3 py-1.5 rounded-lg btn-press"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-tertiary)' }}>
              취소
            </button>
          </div>
        )}
      </div>

      {/* 프로필 카드 */}
      <div className="rounded-2xl p-6 mb-5 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1B3FAB 0%, #2E55C8 100%)',
          boxShadow: '0 8px 32px rgba(27,63,171,0.3)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'white', transform: 'translate(30%,-30%)' }} />

        {/* 아바타 */}
        <div className="relative w-20 h-20 mx-auto mb-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="프로필 사진"
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: '2px solid rgba(255,255,255,0.3)' }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black"
              style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              {profile.name?.[0]}
            </div>
          )}
          <button onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center shadow btn-press"
            style={{ background: '#fff', color: 'var(--ski-blue)' }}>
            {avatarUploading ? (
              <span className="text-[10px] font-black">...</span>
            ) : (
              <span className="text-sm">📷</span>
            )}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*"
            onChange={handleAvatarUpload} className="hidden" />
        </div>

        {editMode ? (
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="text-xl font-black text-center rounded-xl px-3 py-1 w-full max-w-[200px] mx-auto block mb-1"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }} />
        ) : (
          <p className="text-xl font-black mb-1" style={{ color: '#fff' }}>{profile.name}</p>
        )}
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {editMode ? generation : profile.generation}기 ·{' '}
          {(editMode ? joinType : profile.join_type) === 'ob' ? '졸업생' : '재학생'}
        </p>
        <span className="inline-block mt-2 text-xs font-black px-3 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
          {roleLabel[profile.role]}
        </span>
      </div>

      {/* 기본 정보 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>기본 정보</h2>

        {[
          {
            label: '이름',
            view: profile.name,
            edit: <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="text-sm font-bold rounded-lg px-3 py-1.5 text-right" style={inputStyle} />,
          },
          {
            label: '기수',
            view: `${profile.generation}기`,
            edit: <input type="number" value={generation}
              onChange={e => setGeneration(e.target.value)}
              className="text-sm font-bold rounded-lg px-3 py-1.5 text-right w-24" style={inputStyle} />,
          },
          {
            label: '구분',
            view: profile.join_type === 'ob' ? '졸업생 / OB' : '재학생',
            edit: (
              <select value={joinType} onChange={e => setJoinType(e.target.value)}
                className="text-sm font-bold rounded-lg px-3 py-1.5" style={inputStyle}>
                <option value="student">재학생</option>
                <option value="ob">졸업생 / OB</option>
              </select>
            ),
          },
          {
            label: '전화번호',
            view: (profile as any).phone || '미등록',
            edit: <input type="tel" value={phone}
              placeholder="010-0000-0000"
              onChange={e => setPhone(formatPhoneInput(e.target.value))}
              className="text-sm font-bold rounded-lg px-3 py-1.5 text-right w-36" style={inputStyle} />,
          },
          ...(profile.student_id ? [{
            label: '학번',
            view: profile.student_id,
            edit: null,
          }] : []),
          {
            label: '권한',
            view: null,
            edit: null,
            custom: (
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(27,63,171,0.3)', color: 'var(--accent-blue)' }}>
                {roleLabel[profile.role]}
              </span>
            ),
          },
        ].map((item, i, arr) => (
          <div key={item.label}
            className="flex justify-between items-center py-2.5"
            style={{
              borderBottom: i < arr.length - 1
                ? '0.5px solid var(--border-primary)' : 'none'
            }}>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.label}</span>
            {item.custom ? item.custom : (
              editMode && item.edit ? item.edit : (
                <span className="text-sm font-bold"
                  style={{
                    color: item.label === '전화번호' && !item.view
                      ? 'var(--text-hint)' : 'var(--text-primary)'
                  }}>
                  {item.view}
                </span>
              )
            )}
          </div>
        ))}
      </div>

      {/* 자기소개 */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>자기소개</h2>
        {editMode ? (
          <textarea value={bio} onChange={e => setBio(e.target.value)}
            placeholder="스키 실력, 포지션, 하고 싶은 말 등 자유롭게 적어주세요"
            rows={4} className="w-full rounded-xl px-4 py-3 text-sm resize-none"
            style={inputStyle} />
        ) : (
          <p className="text-sm leading-relaxed"
            style={{ color: profile.bio ? 'var(--text-secondary)' : 'var(--text-hint)' }}>
            {profile.bio || '자기소개를 작성해보세요'}
          </p>
        )}
      </div>

      {/* 로그아웃 */}
      <button onClick={handleLogout}
        className="w-full rounded-2xl py-4 text-sm font-black btn-press"
        style={{
          background: 'rgba(255,107,107,0.1)',
          border: '0.5px solid rgba(255,107,107,0.2)',
          color: '#FF6B6B',
        }}>
        로그아웃
      </button>
    </main>
  )
}
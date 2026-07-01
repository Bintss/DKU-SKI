'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/contexts/ProfileContext'

const SKI_LEVELS = [
  { value: 'beginner', label: '처음' },
  { value: 'novice', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '상급' },
  { value: 'certified', label: '자격증 보유' },
]

const EQUIPMENT_OPTIONS = [
  { value: 'ski', label: '스키' },
  { value: 'boots', label: '부츠' },
  { value: 'poles', label: '폴' },
  { value: 'helmet', label: '헬멧' },
  { value: 'goggles', label: '고글' },
  { value: 'gloves', label: '장갑' },
]

export default function ProfilePage() {
  const { profile, loading: profileLoading, refetch } = useProfile()
  const [editMode, setEditMode] = useState(false)

  // 기본 정보
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [generation, setGeneration] = useState('')
  const [joinType, setJoinType] = useState('')
  const [phone, setPhone] = useState('')

  // 비상연락처
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  // 소속
  const [affiliation, setAffiliation] = useState('')

  // 스키 활동
  const [skiLevel, setSkiLevel] = useState('')
  const [equipment, setEquipment] = useState<string[]>([])
  const [campIntent, setCampIntent] = useState('')

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return
    const p = profile as any
    setName(p.name ?? '')
    setBio(p.bio ?? '')
    setGeneration(String(p.generation ?? ''))
    setJoinType(p.join_type ?? 'student')
    setPhone(p.phone ?? '')
    setEmergencyName(p.emergency_contact_name ?? '')
    setEmergencyPhone(p.emergency_contact_phone ?? '')
    setAffiliation(p.affiliation ?? '')
    setSkiLevel(p.ski_level ?? '')
    setEquipment(p.equipment ?? [])
    setCampIntent(p.camp_intent ?? '')
  }, [profile])

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length < 4) return digits
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  const toggleEquipment = (value: string) => {
    setEquipment(prev =>
      prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value]
    )
  }

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

  const handleSave = async () => {
    if (!profile) return
    setSubmitting(true)

    await supabase.from('profiles').update({
      name,
      bio,
      generation: parseInt(generation),
      join_type: joinType,
      phone: phone || null,
      emergency_contact_name: emergencyName || null,
      emergency_contact_phone: emergencyPhone || null,
      affiliation: affiliation || null,
      ski_level: skiLevel || null,
      equipment: equipment.length > 0 ? equipment : null,
      camp_intent: campIntent || null,
    }).eq('id', profile.id)

    await refetch()
    setEditMode(false)
    setSubmitting(false)
  }

  const handleCancel = () => {
    if (!profile) return
    const p = profile as any
    setName(p.name ?? '')
    setBio(p.bio ?? '')
    setGeneration(String(p.generation ?? ''))
    setJoinType(p.join_type ?? 'student')
    setPhone(p.phone ?? '')
    setEmergencyName(p.emergency_contact_name ?? '')
    setEmergencyPhone(p.emergency_contact_phone ?? '')
    setAffiliation(p.affiliation ?? '')
    setSkiLevel(p.ski_level ?? '')
    setEquipment(p.equipment ?? [])
    setCampIntent(p.camp_intent ?? '')
    setEditMode(false)
  }

  const handleLogout = async () => {
    sessionStorage.removeItem('splash_shown')
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleWithdraw = async () => {
    if (!confirm('정말 탈퇴하시겠어요? 작성한 글과 정산 기록은 유지되지만, 더 이상 로그인할 수 없어요.')) return
    if (!confirm('한 번 더 확인할게요. 탈퇴를 진행할까요?')) return

    const res = await fetch('/api/profile/withdraw', { method: 'POST' })
    if (res.ok) {
      sessionStorage.removeItem('splash_shown')
      router.push('/login')
    } else {
      alert('탈퇴 처리에 실패했어요. 다시 시도해주세요.')
    }
  }

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '승인 대기'
  }

  const inputStyle = {
    background: 'var(--bg-secondary)',
    border: '0.5px solid var(--border-primary)',
    color: 'var(--text-primary)',
  }

  const p = profile as any

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
            {avatarUploading
              ? <span className="text-[10px] font-black">...</span>
              : <span className="text-sm">📷</span>}
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
          {profile.generation}기 · {profile.join_type === 'ob' ? '졸업생' : '재학생'}
        </p>
        <span className="inline-block mt-2 text-xs font-black px-3 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
          {roleLabel[profile.role]}
        </span>
      </div>

      {/* ─── 기본 정보 ─── */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>기본 정보</h2>

        {[
          {
            label: '이름',
            view: <span>{profile.name}</span>,
            edit: (
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="text-sm font-bold rounded-lg px-3 py-1.5 text-right" style={inputStyle} />
            ),
          },
          {
            label: '기수',
            view: <span>{profile.generation}기</span>,
            edit: (
              <input type="number" value={generation} onChange={e => setGeneration(e.target.value)}
                className="text-sm font-bold rounded-lg px-3 py-1.5 text-right w-24" style={inputStyle} />
            ),
          },
          {
            label: '구분',
            view: <span>{profile.join_type === 'ob' ? '졸업생 / OB' : '재학생'}</span>,
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
            view: <span style={{ color: p.phone ? 'var(--text-primary)' : 'var(--text-hint)' }}>
              {p.phone || '미등록'}
            </span>,
            edit: (
              <input type="tel" value={phone} placeholder="010-0000-0000"
                onChange={e => setPhone(formatPhoneInput(e.target.value))}
                className="text-sm font-bold rounded-lg px-3 py-1.5 text-right w-36" style={inputStyle} />
            ),
          },
          {
            label: '권한',
            view: (
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ background: 'rgba(27,63,171,0.3)', color: 'var(--accent-blue)' }}>
                {roleLabel[profile.role]}
              </span>
            ),
            edit: null,
          },
        ].map((item, i, arr) => (
          <div key={item.label}
            className="flex justify-between items-center py-2.5"
            style={{ borderBottom: i < arr.length - 1 ? '0.5px solid var(--border-primary)' : 'none' }}>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.label}</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {editMode && item.edit ? item.edit : item.view}
            </span>
          </div>
        ))}
      </div>

      {/* ─── 비상연락처 ─── */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>비상연락처</h2>

        {editMode ? (
          <div className="flex flex-col gap-2">
            <input type="text" placeholder="이름 (예: 아버지)" value={emergencyName}
              onChange={e => setEmergencyName(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} />
            <input type="tel" placeholder="010-0000-0000" value={emergencyPhone}
              onChange={e => setEmergencyPhone(formatPhoneInput(e.target.value))}
              className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} />
          </div>
        ) : (
          p.emergency_contact_name && p.emergency_contact_phone ? (
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {p.emergency_contact_name}
              </p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {p.emergency_contact_phone}
              </p>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-hint)' }}>미등록</p>
          )
        )}
      </div>

      {/* ─── 소속 정보 ─── */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>소속 정보</h2>

        {editMode ? (
          <input type="text"
            placeholder="캠퍼스 / 대학 / 학과(전공) 순으로 적어주세요"
            value={affiliation} onChange={e => setAffiliation(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm" style={inputStyle} />
        ) : (
          <p className="text-sm leading-relaxed"
            style={{ color: p.affiliation ? 'var(--text-secondary)' : 'var(--text-hint)' }}>
            {p.affiliation || '미등록'}
          </p>
        )}
      </div>

      {/* ─── 스키 활동 정보 ─── */}
      <div className="rounded-2xl p-5 mb-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-primary)' }}>
        <h2 className="text-xs font-black tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-hint)' }}>스키 활동 정보</h2>

        {editMode ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>스키 실력</p>
              <div className="flex flex-wrap gap-2">
                {SKI_LEVELS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setSkiLevel(opt.value)}
                    className="rounded-xl px-3 py-2 text-xs font-bold btn-press"
                    style={{
                      background: skiLevel === opt.value ? 'var(--ski-blue)' : 'var(--bg-secondary)',
                      border: `0.5px solid ${skiLevel === opt.value ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
                      color: skiLevel === opt.value ? '#fff' : 'var(--text-tertiary)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                보유 장비 (복수 선택 가능)
              </p>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => toggleEquipment(opt.value)}
                    className="rounded-xl px-3 py-2 text-xs font-bold btn-press"
                    style={{
                      background: equipment.includes(opt.value)
                        ? 'rgba(27,63,171,0.2)' : 'var(--bg-secondary)',
                      border: `0.5px solid ${equipment.includes(opt.value)
                        ? 'var(--accent-blue)' : 'var(--border-primary)'}`,
                      color: equipment.includes(opt.value)
                        ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>합숙 참여 의향</p>
              <div className="flex gap-2">
                {[
                  { value: 'yes', label: '참여' },
                  { value: 'no', label: '미참여' },
                  { value: 'undecided', label: '미정' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setCampIntent(opt.value)}
                    className="flex-1 rounded-xl py-2 text-xs font-bold btn-press"
                    style={{
                      background: campIntent === opt.value ? 'var(--ski-blue)' : 'var(--bg-secondary)',
                      border: `0.5px solid ${campIntent === opt.value
                        ? 'var(--ski-blue)' : 'var(--border-primary)'}`,
                      color: campIntent === opt.value ? '#fff' : 'var(--text-tertiary)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {p.ski_level && (
              <div className="flex items-center gap-3">
                <span className="text-xs w-16 flex-shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}>스키 실력</span>
                <span className="text-xs font-black px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(27,63,171,0.2)', color: 'var(--accent-blue)' }}>
                  🎿 {SKI_LEVELS.find(l => l.value === p.ski_level)?.label ?? p.ski_level}
                </span>
              </div>
            )}
            {p.equipment?.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-xs w-16 flex-shrink-0 mt-0.5"
                  style={{ color: 'var(--text-tertiary)' }}>보유 장비</span>
                <div className="flex flex-wrap gap-1.5">
                  {p.equipment.map((e: string) => (
                    <span key={e} className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
                      {EQUIPMENT_OPTIONS.find(o => o.value === e)?.label ?? e}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {p.camp_intent && (
              <div className="flex items-center gap-3">
                <span className="text-xs w-16 flex-shrink-0"
                  style={{ color: 'var(--text-tertiary)' }}>합숙 의향</span>
                <span className="text-xs font-bold"
                  style={{ color: 'var(--text-secondary)' }}>
                  {p.camp_intent === 'yes' ? '참여' : p.camp_intent === 'no' ? '미참여' : '미정'}
                </span>
              </div>
            )}
            {!p.ski_level && !p.equipment?.length && !p.camp_intent && (
              <p className="text-sm" style={{ color: 'var(--text-hint)' }}>미등록</p>
            )}
          </div>
        )}
      </div>

      {/* ─── 자기소개 ─── */}
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

      {/* ─── 로그아웃 / 탈퇴 ─── */}
      <button onClick={handleLogout}
        className="w-full rounded-2xl py-4 text-sm font-black btn-press mb-3"
        style={{
          background: 'rgba(255,107,107,0.1)',
          border: '0.5px solid rgba(255,107,107,0.2)',
          color: '#FF6B6B',
        }}>
        로그아웃
      </button>

      <button onClick={handleWithdraw}
        className="w-full rounded-2xl py-3 text-xs font-bold"
        style={{ color: 'var(--text-hint)' }}>
        회원 탈퇴
      </button>
    </main>
  )
}
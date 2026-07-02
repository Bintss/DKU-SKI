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
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [generation, setGeneration] = useState('')
  const [joinType, setJoinType] = useState('')
  const [phone, setPhone] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [skiLevel, setSkiLevel] = useState('')
  const [equipment, setEquipment] = useState<string[]>([])
  const [campIntent, setCampIntent] = useState('')
  const [refundBankName, setRefundBankName] = useState('')
  const [refundAccountNumber, setRefundAccountNumber] = useState('')
  const [refundAccountHolder, setRefundAccountHolder] = useState('')
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
    setRefundBankName(p.refund_bank_name ?? '')
    setRefundAccountNumber(p.refund_account_number ?? '')
    setRefundAccountHolder(p.refund_account_holder ?? '')
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
    const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true })
    if (error) { alert('업로드 실패: ' + error.message); setAvatarUploading(false); return }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    await supabase.from('profiles').update({ avatar_url: data.publicUrl + '?t=' + Date.now() }).eq('id', profile.id)
    await refetch()
    setAvatarUploading(false)
  }

  const handleSave = async () => {
    if (!profile) return
    setSubmitting(true)
    await supabase.from('profiles').update({
      name, bio, generation: parseInt(generation), join_type: joinType,
      phone: phone || null,
      emergency_contact_name: emergencyName || null,
      emergency_contact_phone: emergencyPhone || null,
      affiliation: affiliation || null,
      ski_level: skiLevel || null,
      equipment: equipment.length > 0 ? equipment : null,
      camp_intent: campIntent || null,
      refund_bank_name: refundBankName || null,
      refund_account_number: refundAccountNumber || null,
      refund_account_holder: refundAccountHolder || null,
    }).eq('id', profile.id)
    await refetch()
    setEditMode(false)
    setSubmitting(false)
  }

  const handleCancel = () => {
    if (!profile) return
    const p = profile as any
    setName(p.name ?? ''); setBio(p.bio ?? '')
    setGeneration(String(p.generation ?? ''))
    setJoinType(p.join_type ?? 'student')
    setPhone(p.phone ?? '')
    setEmergencyName(p.emergency_contact_name ?? '')
    setEmergencyPhone(p.emergency_contact_phone ?? '')
    setAffiliation(p.affiliation ?? '')
    setSkiLevel(p.ski_level ?? '')
    setEquipment(p.equipment ?? [])
    setCampIntent(p.camp_intent ?? '')
    setRefundBankName(p.refund_bank_name ?? '')
    setRefundAccountNumber(p.refund_account_number ?? '')
    setRefundAccountHolder(p.refund_account_holder ?? '')
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
    if (res.ok) { sessionStorage.removeItem('splash_shown'); router.push('/login') }
    else alert('탈퇴 처리에 실패했어요. 다시 시도해주세요.')
  }

  const roleLabel: Record<string, string> = {
    member: '부원', ob: 'OB', admin: '운영진', pending: '승인 대기'
  }

  const inputStyle = {
    background: '#fff',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
  }

  const toggleBtn = (active: boolean) => ({
    background: active ? 'var(--dku-blue-primary)' : '#fff',
    border: `1px solid ${active ? 'var(--dku-blue-primary)' : 'var(--border-primary)'}`,
    color: active ? '#fff' : 'var(--text-tertiary)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
  })

  const sectionCard = {
    background: '#fff',
    border: '1px solid var(--border-primary)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '12px',
    boxShadow: 'var(--shadow-sm)',
  }

  const sectionTitle = {
    fontSize: '11px',
    fontWeight: '900',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-hint)',
    marginBottom: '12px',
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
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-black tracking-widest uppercase mb-1"
            style={{ color: 'var(--text-hint)' }}>Profile</p>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>내 프로필</h1>
        </div>
        {!editMode ? (
          <button onClick={() => setEditMode(true)}
            className="text-xs font-black px-4 py-2 rounded-xl btn-press"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            수정
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={submitting}
              className="text-xs font-black px-3 py-2 rounded-xl disabled:opacity-50 btn-press"
              style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
              {submitting ? '저장 중...' : '저장'}
            </button>
            <button onClick={handleCancel}
              className="text-xs font-black px-3 py-2 rounded-xl btn-press"
              style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
              취소
            </button>
          </div>
        )}
      </div>

      {/* 프로필 카드 */}
      <div className="rounded-2xl p-6 mb-5 text-center relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--dku-blue-primary) 0%, var(--dku-blue) 100%)',
          boxShadow: 'var(--shadow-blue)',
        }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', transform: 'translate(30%,-30%)' }} />

        <div className="relative w-20 h-20 mx-auto mb-3">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="프로필 사진"
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: '2px solid rgba(255,255,255,0.3)' }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
              {profile.name?.[0]}
            </div>
          )}
          <button onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center shadow btn-press"
            style={{ background: '#fff', color: 'var(--dku-blue-primary)', fontSize: 14 }}>
            {avatarUploading ? '...' : '📷'}
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*"
            onChange={handleAvatarUpload} className="hidden" />
        </div>

        {editMode ? (
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            className="text-xl font-black text-center rounded-xl px-3 py-1 w-full max-w-[200px] mx-auto block mb-1"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', outline: 'none' }} />
        ) : (
          <p className="text-xl font-black mb-1" style={{ color: '#fff' }}>{profile.name}</p>
        )}
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {profile.generation}기 · {profile.join_type === 'ob' ? '졸업생' : '재학생'}
        </p>
        <span className="inline-block mt-2 text-xs font-black px-3 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' }}>
          {roleLabel[profile.role]}
        </span>
      </div>

      {/* 기본 정보 */}
      <div style={sectionCard}>
        <p style={sectionTitle}>기본 정보</p>
        {[
          {
            label: '이름',
            view: <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{profile.name}</span>,
            edit: <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} />,
          },
          {
            label: '기수',
            view: <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{profile.generation}기</span>,
            edit: <input type="number" value={generation} onChange={e => setGeneration(e.target.value)} style={{ ...inputStyle, width: 80, textAlign: 'right' }} />,
          },
          {
            label: '구분',
            view: <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{profile.join_type === 'ob' ? '졸업생 / OB' : '재학생'}</span>,
            edit: (
              <select value={joinType} onChange={e => setJoinType(e.target.value)} style={inputStyle}>
                <option value="student">재학생</option>
                <option value="ob">졸업생 / OB</option>
              </select>
            ),
          },
          {
            label: '전화번호',
            view: <span className="text-sm font-bold" style={{ color: p.phone ? 'var(--text-primary)' : 'var(--text-hint)' }}>{p.phone || '미등록'}</span>,
            edit: <input type="tel" value={phone} placeholder="010-0000-0000" onChange={e => setPhone(formatPhoneInput(e.target.value))} style={{ ...inputStyle, textAlign: 'right', width: 144 }} />,
          },
          {
            label: '권한',
            view: (
              <span className="text-xs font-black px-2.5 py-1 rounded-full"
                style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
                {roleLabel[profile.role]}
              </span>
            ),
            edit: null,
          },
        ].map((item, i, arr) => (
          <div key={item.label}
            className="flex justify-between items-center py-2.5"
            style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--border-primary)' : 'none' }}>
            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.label}</span>
            {editMode && item.edit ? item.edit : item.view}
          </div>
        ))}
      </div>

      {/* 비상연락처 */}
      <div style={sectionCard}>
        <p style={sectionTitle}>비상연락처</p>
        {editMode ? (
          <div className="flex flex-col gap-2">
            <input type="text" placeholder="이름 (예: 아버지)" value={emergencyName}
              onChange={e => setEmergencyName(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
            <input type="tel" placeholder="010-0000-0000" value={emergencyPhone}
              onChange={e => setEmergencyPhone(formatPhoneInput(e.target.value))} style={{ ...inputStyle, width: '100%' }} />
          </div>
        ) : p.emergency_contact_name && p.emergency_contact_phone ? (
          <div>
            <p className="text-sm font-bold mb-0.5" style={{ color: 'var(--text-primary)' }}>
              {p.emergency_contact_name}
            </p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {p.emergency_contact_phone}
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>미등록</p>
        )}
      </div>

      {/* 소속 정보 */}
      <div style={sectionCard}>
        <p style={sectionTitle}>소속 정보</p>
        {editMode ? (
          <input type="text" placeholder="캠퍼스 / 대학 / 학과(전공) 순으로 적어주세요"
            value={affiliation} onChange={e => setAffiliation(e.target.value)}
            style={{ ...inputStyle, width: '100%' }} />
        ) : (
          <p className="text-sm leading-relaxed"
            style={{ color: p.affiliation ? 'var(--text-secondary)' : 'var(--text-hint)' }}>
            {p.affiliation || '미등록'}
          </p>
        )}
      </div>

      {/* 스키 활동 정보 */}
      <div style={sectionCard}>
        <p style={sectionTitle}>스키 활동 정보</p>
        {editMode ? (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>스키 실력</p>
              <div className="flex flex-wrap gap-2">
                {SKI_LEVELS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => setSkiLevel(opt.value)}
                    className="btn-press" style={toggleBtn(skiLevel === opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>보유 장비 (복수 선택)</p>
              <div className="flex flex-wrap gap-2">
                {EQUIPMENT_OPTIONS.map(opt => (
                  <button key={opt.value} type="button" onClick={() => toggleEquipment(opt.value)}
                    className="btn-press" style={toggleBtn(equipment.includes(opt.value))}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>합숙 참여 의향</p>
              <div className="flex gap-2">
                {[{ value: 'yes', label: '참여' }, { value: 'no', label: '미참여' }, { value: 'undecided', label: '미정' }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => setCampIntent(opt.value)}
                    className="flex-1 btn-press" style={toggleBtn(campIntent === opt.value)}>
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
                <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>스키 실력</span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: 'var(--ski-blue-50)', color: 'var(--dku-blue-primary)' }}>
                  {SKI_LEVELS.find(l => l.value === p.ski_level)?.label ?? p.ski_level}
                </span>
              </div>
            )}
            {p.equipment?.length > 0 && (
              <div className="flex items-start gap-3">
                <span className="text-xs w-16 flex-shrink-0 mt-0.5" style={{ color: 'var(--text-tertiary)' }}>보유 장비</span>
                <div className="flex flex-wrap gap-1.5">
                  {p.equipment.map((e: string) => (
                    <span key={e} className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--surface-low)', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)' }}>
                      {EQUIPMENT_OPTIONS.find(o => o.value === e)?.label ?? e}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {p.camp_intent && (
              <div className="flex items-center gap-3">
                <span className="text-xs w-16 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>합숙 의향</span>
                <span className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
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

      {/* 환급 계좌 */}
      <div style={sectionCard}>
        <p style={sectionTitle}>환급 계좌</p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>
          정산 반려 시 환불받을 계좌예요
        </p>
        {editMode ? (
          <div className="flex flex-col gap-2">
            <input type="text" placeholder="은행명 (예: 토스뱅크)" value={refundBankName}
              onChange={e => setRefundBankName(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
            <input type="text" placeholder="계좌번호" value={refundAccountNumber}
              onChange={e => setRefundAccountNumber(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
            <input type="text" placeholder="예금주" value={refundAccountHolder}
              onChange={e => setRefundAccountHolder(e.target.value)} style={{ ...inputStyle, width: '100%' }} />
          </div>
        ) : p.refund_bank_name && p.refund_account_number ? (
          <div className="flex flex-col gap-1.5">
            {[
              { label: '은행', value: p.refund_bank_name },
              { label: '계좌번호', value: p.refund_account_number },
              { label: '예금주', value: p.refund_account_holder },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{item.label}</span>
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-hint)' }}>미등록 — 수정 버튼을 눌러 등록해주세요</p>
        )}
      </div>

      {/* 자기소개 */}
      <div style={sectionCard}>
        <p style={sectionTitle}>자기소개</p>
        {editMode ? (
          <textarea value={bio} onChange={e => setBio(e.target.value)}
            placeholder="스키 실력, 포지션, 하고 싶은 말 등 자유롭게 적어주세요"
            rows={4} style={{ ...inputStyle, width: '100%', resize: 'none', lineHeight: 1.6 }} />
        ) : (
          <p className="text-sm leading-relaxed"
            style={{ color: profile.bio ? 'var(--text-secondary)' : 'var(--text-hint)' }}>
            {profile.bio || '자기소개를 작성해보세요'}
          </p>
        )}
      </div>

      {/* 로그아웃 / 탈퇴 */}
      <button onClick={handleLogout}
        className="w-full rounded-2xl py-3.5 text-sm font-black btn-press mb-3"
        style={{
          background: 'rgba(220,38,38,0.06)',
          border: '1px solid rgba(220,38,38,0.15)',
          color: 'var(--accent-red)',
        }}>
        로그아웃
      </button>
      <button onClick={handleWithdraw}
        className="w-full py-3 text-xs font-bold"
        style={{ color: 'var(--text-hint)' }}>
        회원 탈퇴
      </button>
    </main>
  )
}
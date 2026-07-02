'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PRIVACY_POLICY_TEXT = `[개인정보 수집·이용 동의]

수집 항목: 이름, 성별, 생년월일, 연락처, 비상연락처, 학적 정보(기수/학번), 소속 정보
수집 목적: 동아리 회원 관리, 활동 운영, 비상 상황 시 안전 관리
보유 기간: 회원 탈퇴 시까지 (단, 관계 법령에 따라 보존이 필요한 경우 해당 기간까지)

위 개인정보 수집·이용에 동의하지 않을 권리가 있으며, 동의 거부 시 회원가입이 제한될 수 있습니다.`

const REFUND_POLICY_TEXT = `가입비 및 회비는 동아리 가입 승인, 회원 자격 부여, 회원 관리 및 기본 운영을 위한 비용으로 납부 이후에는 실제 활동 참여 여부와 관계없이 환불되지 않습니다.`

const EMERGENCY_CONTACT_GUIDE = `비상연락처로 연락이 필요한 경우는 사고 또는 응급상황일 가능성이 있으므로, 가급적 법적 보호자 또는 이에 준하는 가족으로 작성해 주세요.

권장 작성 대상: 직계존속(부모, 조부모), 배우자 등 사고 발생 시 신속한 연락 및 의사결정 지원이 가능한 사람`

const EQUIPMENT_OPTIONS = [
  { value: 'ski', label: '스키' },
  { value: 'boots', label: '부츠' },
  { value: 'poles', label: '폴' },
  { value: 'helmet', label: '헬멧' },
  { value: 'goggles', label: '고글' },
  { value: 'gloves', label: '장갑' },
]

const SKI_LEVELS = [
  { value: 'beginner', label: '처음' },
  { value: 'novice', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '상급' },
  { value: 'certified', label: '자격증 보유' },
]

const currentYear = new Date().getFullYear()

const inputStyle = {
  background: '#FFFFFF',
  border: '1px solid var(--border-primary)',
  color: 'var(--text-primary)',
  borderRadius: '12px',
  padding: '12px 16px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
}

export default function KakaoRegisterPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [birthDate, setBirthDate] = useState('')
  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [joinType, setJoinType] = useState<'student' | 'ob'>('student')
  const [joinYear, setJoinYear] = useState('')
  const [generation, setGeneration] = useState('')
  const [studentIdStatus, setStudentIdStatus] = useState<'completed' | 'not_issued' | 'not_applicable'>('completed')
  const [studentId, setStudentId] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [skiLevel, setSkiLevel] = useState('')
  const [equipment, setEquipment] = useState<string[]>([])
  const [campIntent, setCampIntent] = useState<'yes' | 'no' | 'undecided' | ''>('')
  const [refundBankName, setRefundBankName] = useState('')
  const [refundAccountNumber, setRefundAccountNumber] = useState('')
  const [refundAccountHolder, setRefundAccountHolder] = useState('')
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeRefund, setAgreeRefund] = useState(false)
  const [showPrivacyText, setShowPrivacyText] = useState(false)
  const [showRefundText, setShowRefundText] = useState(false)
  const [showEmergencyGuide, setShowEmergencyGuide] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [initializing, setInitializing] = useState(true)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchInitialName = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('name').eq('id', user.id).single()
      if (profile?.name && profile.name !== '이름없음') setName(profile.name)
      setInitializing(false)
    }
    fetchInitialName()
  }, [])

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length < 4) return digits
    if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  const validatePhone = (value: string) => /^010-\d{4}-\d{4}$/.test(value)

  const toggleEquipment = (value: string) => {
    setEquipment(prev =>
      prev.includes(value) ? prev.filter(e => e !== value) : [...prev, value]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!gender) { setError('성별을 선택해주세요'); return }
    if (!birthDate) { setError('생년월일을 입력해주세요'); return }
    if (new Date(birthDate) > new Date()) { setError('생년월일이 올바르지 않아요'); return }
    if (!validatePhone(phone)) { setError('본인 연락처를 010-0000-0000 형식으로 입력해주세요'); return }
    if (!emergencyName.trim()) { setError('비상연락처 이름을 입력해주세요'); return }
    if (!validatePhone(emergencyPhone)) { setError('비상연락처를 010-0000-0000 형식으로 입력해주세요'); return }
    if (!generation) { setError('기수를 입력해주세요'); return }
    if (studentIdStatus === 'completed' && !studentId.trim()) {
      setError('학번을 입력하거나 학번 상태를 변경해주세요'); return
    }
    if (!skiLevel) { setError('스키 실력을 선택해주세요'); return }
    if (!campIntent) { setError('합숙 참여 여부를 선택해주세요'); return }
    if (!agreePrivacy || !agreeRefund) {
      setError('모든 약관에 동의해야 가입을 진행할 수 있어요'); return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: updateError } = await supabase.from('profiles').update({
      name, phone, gender, birth_date: birthDate,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      join_type: joinType,
      join_year: joinYear ? parseInt(joinYear) : null,
      generation: parseInt(generation),
      student_id_status: studentIdStatus,
      student_id: studentIdStatus === 'completed' ? studentId : null,
      affiliation: affiliation || null,
      ski_level: skiLevel,
      equipment: equipment.length > 0 ? equipment : null,
      camp_intent: campIntent,
      refund_bank_name: refundBankName || null,
      refund_account_number: refundAccountNumber || null,
      refund_account_holder: refundAccountHolder || null,
      role: 'pending',
      membership_type: 'associate',
    }).eq('id', user.id)

    if (updateError) { setError(updateError.message); setLoading(false); return }

    const now = new Date().toISOString()
    await supabase.from('consent_records').insert([
      {
        user_id: user.id, consent_type: 'privacy', agreed: true,
        agreed_at: now, policy_version: 'v1',
        policy_text_snapshot: PRIVACY_POLICY_TEXT,
      },
      {
        user_id: user.id, consent_type: 'refund_policy', agreed: true,
        agreed_at: now, policy_version: 'v1',
        policy_text_snapshot: REFUND_POLICY_TEXT,
      },
    ])

    fetch('/api/admin/notify-new-member', { method: 'POST' }).catch(() => {})
    router.push('/pending')
  }

  // 공통 버튼 스타일 헬퍼
  const toggleBtn = (active: boolean, danger = false) => ({
    background: active
      ? danger ? 'var(--accent-red)' : 'var(--dku-blue-primary)'
      : '#FFFFFF',
    border: `1px solid ${active
      ? danger ? 'var(--accent-red)' : 'var(--dku-blue-primary)'
      : 'var(--border-primary)'}`,
    color: active ? '#fff' : 'var(--text-tertiary)',
    borderRadius: '10px',
    padding: '10px 12px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  })

  const sectionLabel = (text: string) => (
    <p className="text-xs font-black tracking-widest uppercase mt-5 mb-2"
      style={{ color: 'var(--text-hint)' }}>
      {text}
    </p>
  )

  if (initializing) return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ background: 'var(--surface)' }}>
      <p className="text-sm" style={{ color: 'var(--text-hint)' }}>불러오는 중...</p>
    </main>
  )

  return (
    <main className="min-h-screen px-5 py-10"
      style={{ background: 'var(--surface)' }}>

      {/* 헤더 */}
      <div className="max-w-sm mx-auto">
        <div className="flex flex-col items-center mb-8">
          <img src="/icon-192x192.png" alt="단국대 스키부"
            className="w-14 h-14 rounded-xl mb-3"
            style={{ boxShadow: 'var(--shadow-blue)' }} />
          <h1 className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
            추가 정보 입력
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
            카카오 계정으로 가입
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">

          {/* ─── 기본 정보 ─── */}
          {sectionLabel('기본 정보')}

          <input type="text" placeholder="이름"
            value={name} onChange={e => setName(e.target.value)}
            style={inputStyle} required />

          <div className="flex gap-2">
            {[{ value: 'male', label: '남성' }, { value: 'female', label: '여성' }].map(opt => (
              <button key={opt.value} type="button"
                onClick={() => setGender(opt.value as 'male' | 'female')}
                className="flex-1 btn-press"
                style={toggleBtn(gender === opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
              생년월일
            </label>
            <input type="date" value={birthDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={e => setBirthDate(e.target.value)}
              style={inputStyle} required />
          </div>

          <input type="tel" placeholder="본인 연락처 (010-0000-0000)"
            value={phone} onChange={e => setPhone(formatPhoneInput(e.target.value))}
            style={inputStyle} required />

          {/* ─── 비상연락처 ─── */}
          {sectionLabel('비상연락처')}

          <button type="button" onClick={() => setShowEmergencyGuide(!showEmergencyGuide)}
            className="text-xs text-left" style={{ color: 'var(--dku-blue)' }}>
            {showEmergencyGuide ? '안내 접기 ▲' : '작성 안내 보기 ▼'}
          </button>
          {showEmergencyGuide && (
            <div className="rounded-xl p-3 text-xs leading-relaxed whitespace-pre-wrap"
              style={{
                background: 'var(--surface-low)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-tertiary)',
              }}>
              {EMERGENCY_CONTACT_GUIDE}
            </div>
          )}

          <input type="text" placeholder="비상연락처 이름 (예: 아버지)"
            value={emergencyName} onChange={e => setEmergencyName(e.target.value)}
            style={inputStyle} required />
          <input type="tel" placeholder="비상연락처 번호 (010-0000-0000)"
            value={emergencyPhone} onChange={e => setEmergencyPhone(formatPhoneInput(e.target.value))}
            style={inputStyle} required />

          {/* ─── 가입 유형 ─── */}
          {sectionLabel('가입 유형')}

          {[
            { value: 'student', title: '재학생 부원', desc: '현재 단국대학교 재학 중인 스키부 부원' },
            { value: 'ob', title: '졸업생 / OB', desc: '졸업한 스키부 OB 회원' },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setJoinType(opt.value as 'student' | 'ob')}
              className="text-left p-4 btn-press"
              style={{
                background: joinType === opt.value ? 'var(--ski-blue-50)' : '#FFFFFF',
                border: `1px solid ${joinType === opt.value ? 'var(--dku-blue-primary)' : 'var(--border-primary)'}`,
                borderRadius: '12px',
              }}>
              <p className="text-sm font-black mb-0.5"
                style={{ color: joinType === opt.value ? 'var(--dku-blue-primary)' : 'var(--text-primary)' }}>
                {opt.title}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{opt.desc}</p>
            </button>
          ))}

          {/* ─── 기수·학번 ─── */}
          {sectionLabel('기수·학번 정보')}

          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder={`입부년도 (예: ${currentYear})`}
              value={joinYear} min={1986} max={currentYear}
              onChange={e => setJoinYear(e.target.value)}
              style={inputStyle} />
            <input type="number" placeholder="기수 (예: 38)"
              value={generation} onChange={e => setGeneration(e.target.value)}
              style={inputStyle} required />
          </div>

          {joinType === 'student' && (
            <>
              <div className="flex gap-2">
                {[
                  { value: 'completed', label: '학번 입력' },
                  { value: 'not_issued', label: '미발급' },
                  { value: 'not_applicable', label: '해당없음' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setStudentIdStatus(opt.value as typeof studentIdStatus)}
                    className="flex-1 btn-press"
                    style={toggleBtn(studentIdStatus === opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {studentIdStatus === 'completed' && (
                <input type="text" placeholder="학번 (예: 32222435)"
                  value={studentId} onChange={e => setStudentId(e.target.value)}
                  style={inputStyle} />
              )}
            </>
          )}

          {/* ─── 소속 ─── */}
          {sectionLabel('소속 정보')}

          <input type="text"
            placeholder="캠퍼스 / 대학 / 학과(전공) 순으로 적어주세요"
            value={affiliation} onChange={e => setAffiliation(e.target.value)}
            style={inputStyle} />

          {/* ─── 스키 활동 ─── */}
          {sectionLabel('스키 활동 정보')}

          <div>
            <label className="text-xs mb-2 block" style={{ color: 'var(--text-tertiary)' }}>
              스키 실력
            </label>
            <div className="flex flex-wrap gap-2">
              {SKI_LEVELS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setSkiLevel(opt.value)}
                  className="btn-press"
                  style={toggleBtn(skiLevel === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs mb-2 block" style={{ color: 'var(--text-tertiary)' }}>
              보유 장비 (복수 선택 가능)
            </label>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => toggleEquipment(opt.value)}
                  className="btn-press"
                  style={toggleBtn(equipment.includes(opt.value))}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs mb-2 block" style={{ color: 'var(--text-tertiary)' }}>
              합숙 참여 의향
            </label>
            <div className="flex gap-2">
              {[
                { value: 'yes', label: '참여' },
                { value: 'no', label: '미참여' },
                { value: 'undecided', label: '미정' },
              ].map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setCampIntent(opt.value as typeof campIntent)}
                  className="flex-1 btn-press"
                  style={toggleBtn(campIntent === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── 환급 계좌 ─── */}
          {sectionLabel('환급 계좌 (선택)')}

          <p className="text-xs -mt-1" style={{ color: 'var(--text-hint)' }}>
            정산 반려 시 환불받을 계좌예요. 나중에 프로필에서 등록해도 돼요.
          </p>
          <input type="text" placeholder="은행명 (예: 토스뱅크)"
            value={refundBankName} onChange={e => setRefundBankName(e.target.value)}
            style={inputStyle} />
          <input type="text" placeholder="계좌번호"
            value={refundAccountNumber} onChange={e => setRefundAccountNumber(e.target.value)}
            style={inputStyle} />
          <input type="text" placeholder="예금주"
            value={refundAccountHolder} onChange={e => setRefundAccountHolder(e.target.value)}
            style={inputStyle} />

          {/* ─── 동의 ─── */}
          <div className="flex flex-col gap-2 mt-3 pt-4"
            style={{ borderTop: '1px solid var(--border-primary)' }}>

            {[
              {
                key: 'privacy',
                checked: agreePrivacy,
                setChecked: setAgreePrivacy,
                label: '(필수) 개인정보 수집·이용에 동의합니다',
                showText: showPrivacyText,
                setShowText: setShowPrivacyText,
                text: PRIVACY_POLICY_TEXT,
              },
              {
                key: 'refund',
                checked: agreeRefund,
                setChecked: setAgreeRefund,
                label: '(필수) 가입비·회비 환불 불가 정책에 동의합니다',
                showText: showRefundText,
                setShowText: setShowRefundText,
                text: REFUND_POLICY_TEXT,
              },
            ].map(item => (
              <div key={item.key} className="rounded-xl p-4"
                style={{
                  background: item.checked ? 'var(--ski-blue-50)' : 'var(--surface-low)',
                  border: `1px solid ${item.checked ? 'var(--dku-blue-light)' : 'var(--border-primary)'}`,
                }}>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={item.checked}
                    onChange={e => item.setChecked(e.target.checked)}
                    className="mt-0.5 accent-[#003C75]" />
                  <span className="text-sm font-bold flex-1"
                    style={{ color: 'var(--text-primary)' }}>
                    {item.label}
                  </span>
                </label>
                <button type="button" onClick={() => item.setShowText(!item.showText)}
                  className="text-xs mt-2 ml-6"
                  style={{ color: 'var(--dku-blue)' }}>
                  {item.showText ? '내용 접기 ▲' : '전문 보기 ▼'}
                </button>
                {item.showText && (
                  <p className="text-xs mt-2 ml-6 whitespace-pre-wrap leading-relaxed"
                    style={{ color: 'var(--text-tertiary)' }}>
                    {item.text}
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3"
              style={{
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.2)',
              }}>
              <p className="text-xs font-bold" style={{ color: 'var(--accent-red)' }}>
                {error}
              </p>
            </div>
          )}

          <button type="submit" disabled={loading}
            className="w-full rounded-2xl py-4 text-sm font-black disabled:opacity-50 btn-press mt-2"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            {loading ? '저장 중...' : '가입 신청'}
          </button>
          <p className="text-xs text-center pb-4" style={{ color: 'var(--text-hint)' }}>
            가입 후 운영진 승인이 필요해요
          </p>
        </form>
      </div>
    </main>
  )
}
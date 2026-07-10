'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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

function KakaoRegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [generation, setGeneration] = useState('')
  const [joinType, setJoinType] = useState<'student' | 'ob'>('student')
  const [gender, setGender] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')

  const [emergencyName, setEmergencyName] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')

  const [skiLevel, setSkiLevel] = useState('')
  const [equipment, setEquipment] = useState<string[]>([])
  const [campIntent, setCampIntent] = useState('')

  const [refundBankName, setRefundBankName] = useState('')
  const [refundAccountNumber, setRefundAccountNumber] = useState('')
  const [refundAccountHolder, setRefundAccountHolder] = useState('')

  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeRefund, setAgreeRefund] = useState(false)

  const isOB = joinType === 'ob'

  const getNextStep = (currentStep: number) => {
    if (isOB) {
      if (currentStep === 1) return 5
      return currentStep + 1
    }
    return currentStep + 1
  }

  const getPrevStep = (currentStep: number) => {
    if (isOB) {
      if (currentStep === 5) return 1
      return currentStep - 1
    }
    return currentStep - 1
  }

  const totalSteps = isOB ? 2 : 5
  const currentStepDisplay = isOB ? (step === 1 ? 1 : 2) : step

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

  const handleFinalSubmit = async () => {
    if (!agreePrivacy || !agreeRefund) {
      setError('모든 항목에 동의해주세요')
      return
    }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const profileData: Record<string, unknown> = {
      id: user.id,
      name,
      generation: parseInt(generation),
      join_type: joinType,
      gender: gender || null,
      birth_date: birthDate || null,
      phone: phone || null,
      role: 'pending',
    }

    if (!isOB) {
      profileData.emergency_contact_name = emergencyName || null
      profileData.emergency_contact_phone = emergencyPhone || null
      profileData.ski_level = skiLevel || null
      profileData.equipment = equipment.length > 0 ? equipment : null
      profileData.camp_intent = campIntent || null
      profileData.refund_bank_name = refundBankName || null
      profileData.refund_account_number = refundAccountNumber || null
      profileData.refund_account_holder = refundAccountHolder || null
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData)

    if (profileError) {
      setError('프로필 저장에 실패했어요: ' + profileError.message)
      setLoading(false)
      return
    }

    const consentRecords = [
      {
        user_id: user.id,
        consent_type: 'privacy',
        agreed: agreePrivacy,
        agreed_at: new Date().toISOString(),
        policy_version: 'v1',
      },
      {
        user_id: user.id,
        consent_type: 'refund_policy',
        agreed: agreeRefund,
        agreed_at: new Date().toISOString(),
        policy_version: 'v1',
      },
    ]

    await supabase.from('consent_records').insert(consentRecords)
    await fetch('/api/admin/notify-new-member', { method: 'POST' })

    // redirect 파라미터 유지
    const redirectParam = searchParams.get('redirect') ?? ''
    router.push(redirectParam
      ? `/pending?redirect=${encodeURIComponent(redirectParam)}`
      : '/pending'
    )
  }

  const inputStyle = {
    background: '#fff',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
    padding: '12px 16px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  }

  const toggleBtn = (active: boolean) => ({
    background: active ? 'var(--dku-blue-primary)' : '#fff',
    border: `1px solid ${active ? 'var(--dku-blue-primary)' : 'var(--border-primary)'}`,
    color: active ? '#fff' : 'var(--text-tertiary)',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
  })

  return (
    <main className="min-h-screen flex flex-col px-5 py-10"
      style={{ background: 'var(--surface)' }}>

      {/* 진행 바 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-black tracking-widest uppercase"
            style={{ color: 'var(--text-hint)' }}>
            {currentStepDisplay} / {totalSteps}
          </p>
          {isOB && (
            <span className="text-xs font-black px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--accent-purple)' }}>
              OB 간편 가입
            </span>
          )}
        </div>
        <div className="h-1 rounded-full overflow-hidden"
          style={{ background: 'var(--surface-low)' }}>
          <div className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${(currentStepDisplay / totalSteps) * 100}%`,
              background: 'var(--dku-blue-primary)',
            }} />
        </div>
      </div>

      {/* 1단계: 기본정보 */}
      {step === 1 && (
        <div className="flex flex-col gap-5 flex-1">
          <div>
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              기본 정보
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              스키부 가입을 환영해요!
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>구분</label>
              <div className="flex gap-2">
                {[
                  { value: 'student', label: '재학생 (YB)' },
                  { value: 'ob', label: '졸업생 (OB)' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setJoinType(opt.value as 'student' | 'ob')}
                    className="flex-1 btn-press"
                    style={toggleBtn(joinType === opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
              {isOB && (
                <p className="text-xs mt-2 font-bold"
                  style={{ color: 'var(--accent-purple)' }}>
                  OB는 이름, 기수, 연락처만 입력하면 돼요
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>이름</label>
              <input type="text" placeholder="실명을 입력해주세요"
                value={name} onChange={e => setName(e.target.value)}
                style={inputStyle} />
            </div>

            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>기수</label>
              <input type="number" placeholder="예: 38"
                value={generation} onChange={e => setGeneration(e.target.value)}
                style={inputStyle} />
            </div>

            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>전화번호</label>
              <input type="tel" placeholder="010-0000-0000"
                value={phone}
                onChange={e => setPhone(formatPhoneInput(e.target.value))}
                style={inputStyle} />
            </div>

            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>성별</label>
              <div className="flex gap-2">
                {[
                  { value: 'male', label: '남성' },
                  { value: 'female', label: '여성' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setGender(opt.value)}
                    className="flex-1 btn-press"
                    style={toggleBtn(gender === opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>생년월일</label>
              <input type="date" value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold" style={{ color: 'var(--accent-red)' }}>{error}</p>
          )}

          <button
            onClick={() => {
              if (!name.trim()) { setError('이름을 입력해주세요'); return }
              if (!generation) { setError('기수를 입력해주세요'); return }
              setError('')
              setStep(getNextStep(1))
            }}
            className="w-full rounded-2xl py-4 text-sm font-black btn-press mt-auto"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            다음
          </button>
        </div>
      )}

      {/* 2단계: 비상연락처 (YB only) */}
      {step === 2 && !isOB && (
        <div className="flex flex-col gap-5 flex-1">
          <div>
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              비상연락처
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              합숙 중 비상 시 연락할 보호자 정보예요
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>이름</label>
              <input type="text" placeholder="예: 아버지, 어머니"
                value={emergencyName} onChange={e => setEmergencyName(e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>전화번호</label>
              <input type="tel" placeholder="010-0000-0000"
                value={emergencyPhone}
                onChange={e => setEmergencyPhone(formatPhoneInput(e.target.value))}
                style={inputStyle} />
            </div>
          </div>

          <div className="flex gap-3 mt-auto">
            <button onClick={() => setStep(getPrevStep(2))}
              className="flex-1 rounded-2xl py-4 text-sm font-black btn-press"
              style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
              이전
            </button>
            <button onClick={() => { setError(''); setStep(getNextStep(2)) }}
              className="flex-1 rounded-2xl py-4 text-sm font-black btn-press"
              style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
              다음
            </button>
          </div>
        </div>
      )}

      {/* 3단계: 스키활동 (YB only) */}
      {step === 3 && !isOB && (
        <div className="flex flex-col gap-5 flex-1">
          <div>
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              스키 활동 정보
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              스키 실력과 보유 장비를 알려주세요
            </p>
          </div>

          <div className="flex flex-col gap-5">
            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>스키 실력</label>
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
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>보유 장비 (복수 선택)</label>
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
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>합숙 참여 의향</label>
              <div className="flex gap-2">
                {[
                  { value: 'yes', label: '참여 예정' },
                  { value: 'no', label: '미참여' },
                  { value: 'undecided', label: '미정' },
                ].map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setCampIntent(opt.value)}
                    className="flex-1 btn-press"
                    style={toggleBtn(campIntent === opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-auto">
            <button onClick={() => setStep(getPrevStep(3))}
              className="flex-1 rounded-2xl py-4 text-sm font-black btn-press"
              style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
              이전
            </button>
            <button onClick={() => { setError(''); setStep(getNextStep(3)) }}
              className="flex-1 rounded-2xl py-4 text-sm font-black btn-press"
              style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
              다음
            </button>
          </div>
        </div>
      )}

      {/* 4단계: 환급계좌 (YB only) */}
      {step === 4 && !isOB && (
        <div className="flex flex-col gap-5 flex-1">
          <div>
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              환급 계좌
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              정산 반려 시 환불받을 계좌예요 (선택)
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>은행명</label>
              <input type="text" placeholder="예: 토스뱅크, 국민은행"
                value={refundBankName} onChange={e => setRefundBankName(e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>계좌번호</label>
              <input type="text" placeholder="계좌번호를 입력해주세요"
                value={refundAccountNumber} onChange={e => setRefundAccountNumber(e.target.value)}
                style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-black tracking-widest uppercase mb-2 block"
                style={{ color: 'var(--text-hint)' }}>예금주</label>
              <input type="text" placeholder="예금주명"
                value={refundAccountHolder} onChange={e => setRefundAccountHolder(e.target.value)}
                style={inputStyle} />
            </div>
          </div>

          <div className="flex gap-3 mt-auto">
            <button onClick={() => setStep(getPrevStep(4))}
              className="flex-1 rounded-2xl py-4 text-sm font-black btn-press"
              style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
              이전
            </button>
            <button onClick={() => { setError(''); setStep(getNextStep(4)) }}
              className="flex-1 rounded-2xl py-4 text-sm font-black btn-press"
              style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
              다음
            </button>
          </div>
        </div>
      )}

      {/* 5단계: 동의 */}
      {step === 5 && (
        <div className="flex flex-col gap-5 flex-1">
          <div>
            <h2 className="text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
              약관 동의
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              아래 약관을 확인하고 동의해주세요
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-2xl p-4"
              style={{ background: '#fff', border: '1px solid var(--border-primary)' }}>
              <div className="flex items-start gap-3">
                <button type="button"
                  onClick={() => setAgreePrivacy(!agreePrivacy)}
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: agreePrivacy ? 'var(--dku-blue-primary)' : 'var(--surface-low)',
                    border: `1px solid ${agreePrivacy ? 'var(--dku-blue-primary)' : 'var(--border-primary)'}`,
                  }}>
                  {agreePrivacy && <span className="text-white text-xs font-black">✓</span>}
                </button>
                <div>
                  <p className="text-sm font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                    개인정보 수집 및 이용 동의 (필수)
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    수집 항목: 이름, 기수, 연락처, 성별, 생년월일
                    {!isOB && ', 비상연락처, 환급계좌'}
                    {'\n'}수집 목적: 동아리 회원 관리, 합숙/행사 운영, 정산 처리
                    {'\n'}보유 기간: 탈퇴 시까지
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-4"
              style={{ background: '#fff', border: '1px solid var(--border-primary)' }}>
              <div className="flex items-start gap-3">
                <button type="button"
                  onClick={() => setAgreeRefund(!agreeRefund)}
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: agreeRefund ? 'var(--dku-blue-primary)' : 'var(--surface-low)',
                    border: `1px solid ${agreeRefund ? 'var(--dku-blue-primary)' : 'var(--border-primary)'}`,
                  }}>
                  {agreeRefund && <span className="text-white text-xs font-black">✓</span>}
                </button>
                <div>
                  <p className="text-sm font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                    환불 정책 동의 (필수)
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                    정산 반려 시 등록된 환급 계좌로 환불 처리됩니다.
                    환급 계좌 미등록 시 직접 운영진에게 문의해야 합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="text-xs font-bold" style={{ color: 'var(--accent-red)' }}>{error}</p>
          )}

          <div className="flex gap-3 mt-auto">
            <button onClick={() => setStep(getPrevStep(5))}
              className="flex-1 rounded-2xl py-4 text-sm font-black btn-press"
              style={{ background: 'var(--surface-low)', border: '1px solid var(--border-primary)', color: 'var(--text-tertiary)' }}>
              이전
            </button>
            <button
              onClick={handleFinalSubmit}
              disabled={loading || !agreePrivacy || !agreeRefund}
              className="flex-1 rounded-2xl py-4 text-sm font-black disabled:opacity-50 btn-press"
              style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
              {loading ? '가입 중...' : '가입 완료'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function KakaoRegisterPage() {
  return (
    <Suspense>
      <KakaoRegisterContent />
    </Suspense>
  )
}
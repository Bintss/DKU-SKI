'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

const FEATURES = [
  {
    icon: '🏔️',
    title: '합숙 관리',
    desc: '달력에서 참가 날짜를 직접 선택하고 신청해요. 게스트 등록과 참가비 수납도 한 곳에서.',
    color: 'var(--dku-blue-primary)',
    bg: 'var(--ski-blue-50)',
  },
  {
    icon: '💳',
    title: '정산 시스템',
    desc: '송금명 자동완성으로 입금자 확인이 쉬워요. 토스 연동으로 송금도 버튼 하나면 끝.',
    color: 'var(--dku-blue)',
    bg: 'rgba(0,83,158,0.08)',
  },
  {
    icon: '📊',
    title: '재무 공시',
    desc: '거래내역을 업로드하면 자동으로 분류돼요. 항목별 수입·지출을 투명하게 공개해요.',
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.08)',
  },
  {
    icon: '📢',
    title: '공지 & 커뮤니티',
    desc: '운영진 공지부터 자유게시판까지. 익명 게시글과 이미지 첨부도 지원해요.',
    color: '#D97706',
    bg: 'rgba(217,119,6,0.08)',
  },
  {
    icon: '👥',
    title: '동문 디렉토리',
    desc: '기수별로 부원을 찾아볼 수 있어요. 스키 실력, 보유 장비, 합숙 의향도 확인 가능.',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
  },
]

export default function LandingPage() {
  const [current, setCurrent] = useState(0)
  const [touching, setTouching] = useState(false)
  const [touchStartX, setTouchStartX] = useState(0)

  const handleKakaoLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setTouching(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touching) return
    const diff = touchStartX - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) setCurrent(c => Math.min(c + 1, FEATURES.length - 1))
      else setCurrent(c => Math.max(c - 1, 0))
    }
    setTouching(false)
  }

  const f = FEATURES[current]

  return (
    <main className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--surface)' }}>

      {/* 상단 로고 */}
      <div className="flex flex-col items-center pt-16 pb-8 px-6">
        <div className="relative mb-5">
          <img src="/icon-192x192.png" alt="단국대 스키부"
            className="w-20 h-20 rounded-2xl"
            style={{ boxShadow: 'var(--shadow-blue)' }} />
          <span className="absolute -top-2 -right-2 text-xs font-black px-2 py-0.5 rounded-full"
            style={{ background: 'var(--dku-blue-primary)', color: '#fff' }}>
            40th
          </span>
        </div>
        <h1 className="text-2xl font-black mb-1 text-center"
          style={{ color: 'var(--text-primary)' }}>
          단국대학교 스키부
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
          창립 40주년 기념 공식 앱
        </p>
      </div>

      {/* 기능 소개 슬라이드 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div
  className="w-full max-w-sm"
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  style={{ touchAction: 'pan-x' }}>

          {/* 카드 */}
          <div
            key={current}
            className="rounded-2xl p-7 mb-6"
            style={{
              background: '#fff',
              border: '1px solid var(--border-primary)',
              boxShadow: 'var(--shadow-md)',
              animation: 'cardFadeIn 0.25s ease',
            }}>
            <style>{`
              @keyframes cardFadeIn {
                from { opacity: 0; transform: translateY(8px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>

            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: f.bg }}>
              <span style={{ fontSize: 28 }}>{f.icon}</span>
            </div>

            <h2 className="text-xl font-black mb-2" style={{ color: f.color }}>
              {f.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {f.desc}
            </p>
          </div>

          {/* 인디케이터 */}
          <div className="flex justify-center gap-2 mb-6">
            {FEATURES.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === current ? 20 : 6,
                  height: 6,
                  background: i === current ? 'var(--dku-blue-primary)' : 'var(--border-secondary)',
                }} />
            ))}
          </div>

          {/* 좌우 버튼 (데스크톱용) */}
          <div className="flex justify-between items-center px-2">
            <button
              onClick={() => setCurrent(c => Math.max(c - 1, 0))}
              disabled={current === 0}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-20 btn-press"
              style={{ background: '#fff', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
              ‹
            </button>
            <p className="text-xs font-bold" style={{ color: 'var(--text-hint)' }}>
              {current + 1} / {FEATURES.length}
            </p>
            <button
              onClick={() => setCurrent(c => Math.min(c + 1, FEATURES.length - 1))}
              disabled={current === FEATURES.length - 1}
              className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-20 btn-press"
              style={{ background: '#fff', border: '1px solid var(--border-primary)', color: 'var(--text-secondary)' }}>
              ›
            </button>
          </div>
        </div>
      </div>

      {/* 하단 로그인 */}
      <div className="px-6 pb-12">
        <div className="w-full max-w-sm mx-auto">
          <button
            onClick={handleKakaoLogin}
            className="w-full rounded-2xl py-4 text-sm font-black btn-press flex items-center justify-center gap-2 mb-4"
            style={{ background: '#FEE500', color: '#3A1D1D' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#3A1D1D">
              <path d="M12 3C7.03 3 3 6.14 3 10c0 2.49 1.52 4.68 3.84 6.03l-.98 3.64a.25.25 0 0 0 .37.28L10.5 17.8A10.6 10.6 0 0 0 12 17c4.97 0 9-3.14 9-7S16.97 3 12 3z" />
            </svg>
            카카오로 시작하기
          </button>
          <p className="text-xs text-center" style={{ color: 'var(--text-hint)' }}>
            카카오 계정으로 로그인하면 자동으로 가입돼요
          </p>
        </div>
      </div>
    </main>
  )
}
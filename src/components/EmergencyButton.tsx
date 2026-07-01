'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase'

type ClubSettings = {
  patrol_phone: string | null
  captain_name: string | null
  captain_phone: string | null
  coach_name: string | null
  coach_phone: string | null
}

export default function EmergencyButton() {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<ClubSettings | null>(null)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('club_settings')
        .select('patrol_phone, captain_name, captain_phone, coach_name, coach_phone')
        .eq('id', 1)
        .single()
      setSettings(data)
    }
    fetchSettings()
  }, [])

  const contacts = [
    { label: '스키 패트롤', sub: '본부', phone: settings?.patrol_phone },
    { label: '주장', sub: settings?.captain_name ?? '', phone: settings?.captain_phone },
    { label: '훈련팀장', sub: settings?.coach_name ?? '', phone: settings?.coach_phone },
  ].filter(c => c.phone)

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone.replace(/-/g, '')}`
    setOpen(false)
  }

  const modal = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{
          background: 'rgba(0,30,60,0.4)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          zIndex: 9998,
        }}
        onClick={() => setOpen(false)}
      />

      {/* Bottom Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto"
        style={{
          background: '#FFFFFF',
          borderRadius: '20px 20px 0 0',
          borderTop: '1px solid var(--border-primary)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
          animation: 'emergencySlideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          zIndex: 9999,
        }}
      >
        <style>{`
          @keyframes emergencySlideUp {
            from { transform: translateY(100%); }
            to   { transform: translateY(0); }
          }
        `}</style>

        {/* Handle */}
        <div className="w-9 h-1 rounded-full mx-auto mt-3 mb-4"
          style={{ background: 'var(--border-secondary)' }} />

        <div className="px-5 pb-10">
          {/* 헤더 */}
          <div className="flex items-center gap-2 mb-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent-red)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01M10.29 3.86l-8.18 14.18A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.71-3.96L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <h2 className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
              비상 연락
            </h2>
          </div>
          <p className="text-xs mb-5" style={{ color: 'var(--text-tertiary)' }}>
            연락할 대상을 선택하면 바로 전화가 연결돼요
          </p>

          {contacts.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-hint)' }}>
              등록된 비상연락처가 없어요
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {contacts.map(contact => (
                <button
                  key={contact.label}
                  onClick={() => handleCall(contact.phone!)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3.5 btn-press card-hover"
                  style={{
                    background: 'var(--surface-low)',
                    border: '1px solid var(--border-primary)',
                  }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(220,38,38,0.08)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke="var(--accent-red)" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {contact.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {contact.sub || contact.phone}
                    </p>
                  </div>
                  <span className="text-xs font-black px-3 py-1.5 rounded-full"
                    style={{
                      background: 'rgba(220,38,38,0.08)',
                      color: 'var(--accent-red)',
                    }}>
                    전화
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 btn-press"
        style={{
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.15)',
        }}
        aria-label="비상 연락"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
          stroke="var(--accent-red)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      </button>

      {mounted && open && createPortal(modal, document.body)}
    </>
  )
}
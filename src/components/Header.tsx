'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useProfile } from '@/contexts/ProfileContext'
import Drawer from './Drawer'

export default function Header({ title }: { title?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { profile } = useProfile()

  // 미납 뱃지는 Header에서 계산 (Drawer에서 받아서 표시)
  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-30 px-4 flex items-center h-14"
        style={{
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* 햄버거 버튼 — 이전 디자인 유지 */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl transition-colors relative"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <span className="w-4 h-px rounded-full block"
            style={{ background: 'rgba(255,255,255,0.7)' }} />
          <span className="w-4 h-px rounded-full block"
            style={{ background: 'rgba(255,255,255,0.7)' }} />
          <span className="w-2.5 h-px rounded-full block"
            style={{ background: 'rgba(255,255,255,0.7)' }} />
        </button>

        {title && (
          <h1 className="font-bold text-base ml-3" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
        )}

        <div className="ml-auto">
          <img src="/icon-192x192.png" alt="로고" className="w-7 h-7 rounded-lg opacity-60" />
        </div>
      </header>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="h-14" />
    </>
  )
}
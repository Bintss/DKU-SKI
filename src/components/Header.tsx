'use client'

import { useState } from 'react'
import Drawer from './Drawer'
import EmergencyButton from './EmergencyButton'

export default function Header({ title }: { title?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-30 px-4 flex items-center h-14"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-primary)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
        }}
      >
        {/* 햄버거 버튼 */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl transition-colors btn-press"
          style={{ background: 'var(--surface-low)' }}
        >
          <span className="w-4 h-0.5 rounded-full block"
            style={{ background: 'var(--text-secondary)' }} />
          <span className="w-4 h-0.5 rounded-full block"
            style={{ background: 'var(--text-secondary)' }} />
          <span className="w-2.5 h-0.5 rounded-full block"
            style={{ background: 'var(--text-secondary)' }} />
        </button>

        {title && (
          <h1 className="font-bold text-base ml-3" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
        )}

        {/* 로고 (title 없을 때) */}
        {!title && (
          <div className="ml-3 flex items-center gap-2">
            <img src="/icon-192x192.png" alt="DKU 스키부"
              className="w-6 h-6 rounded-md" />
            <span className="text-sm font-black"
              style={{ color: 'var(--dku-blue-primary)' }}>
              단국대 스키부
            </span>
          </div>
        )}

        <div className="ml-auto">
          <EmergencyButton />
        </div>
      </header>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="h-14" />
    </>
  )
}
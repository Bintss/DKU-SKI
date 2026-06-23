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
          background: 'rgba(10,10,15,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-xl transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <span className="w-4 h-px rounded-full block" style={{ background: 'rgba(255,255,255,0.7)' }}></span>
          <span className="w-4 h-px rounded-full block" style={{ background: 'rgba(255,255,255,0.7)' }}></span>
          <span className="w-2.5 h-px rounded-full block" style={{ background: 'rgba(255,255,255,0.7)' }}></span>
        </button>

        {title && (
          <h1 className="font-bold text-base ml-3" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h1>
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
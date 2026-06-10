import Header from '@/components/Header'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--gray-50)' }}>
      <Header />
      {children}
    </div>
  )
}
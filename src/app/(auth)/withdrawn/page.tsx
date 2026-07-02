export default function WithdrawnPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ background: 'var(--surface)' }}>

      <div className="w-full max-w-sm text-center">
        <img
          src="/icon-192x192.png"
          alt="단국대 스키부"
          className="w-16 h-16 rounded-2xl mx-auto mb-6"
          style={{ opacity: 0.3, boxShadow: 'var(--shadow-sm)' }}
        />

        <h1 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
          탈퇴된 계정이에요
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-tertiary)' }}>
          이 계정은 더 이상 이용할 수 없어요.<br />
          재가입을 원하시면 운영진에게 문의해주세요.
        </p>

        <a href="/login"
          className="inline-block text-sm font-bold px-6 py-3 rounded-2xl btn-press"
          style={{
            background: 'var(--surface-low)',
            border: '1px solid var(--border-primary)',
            color: 'var(--text-secondary)',
          }}>
          로그인 화면으로
        </a>
      </div>
    </main>
  )
}
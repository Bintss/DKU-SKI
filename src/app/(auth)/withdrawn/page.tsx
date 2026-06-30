export default function WithdrawnPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      <img src="/icon-192x192.png" alt="단국대 스키부"
        className="w-20 h-20 rounded-2xl mb-6 opacity-50" />
      <h1 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
        탈퇴된 계정이에요
      </h1>
      <p className="text-sm leading-relaxed text-center" style={{ color: 'var(--text-tertiary)' }}>
        이 계정은 더 이상 이용할 수 없어요.<br />
        재가입을 원하시면 운영진에게 문의해주세요.
      </p>
      <a href="/login" className="mt-8 text-sm font-semibold"
        style={{ color: 'var(--accent-blue)' }}>
        로그인 화면으로
      </a>
    </main>
  )
}
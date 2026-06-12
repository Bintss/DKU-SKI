export default function PendingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--bg-primary)' }}
    >
      <img src="/icon-192x192.png" alt="단국대 스키부"
        className="w-20 h-20 rounded-2xl mb-6 opacity-50" />
      <h1 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
        승인 대기 중
      </h1>
      <p className="text-sm leading-relaxed text-center" style={{ color: 'var(--text-tertiary)' }}>
        가입 신청이 완료됐어요.<br />
        운영진 승인 후 이용 가능합니다.<br />
        승인까지 1~2일 소요될 수 있어요.
      </p>
      <a href="/login" className="mt-8 text-sm font-semibold"
        style={{ color: 'var(--accent-blue)' }}>
        로그인으로 돌아가기
      </a>
    </main>
  )
}
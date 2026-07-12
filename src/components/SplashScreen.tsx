'use client'

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundImage: 'url(/splash_1.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        animation: 'splashFadeOut 0.5s ease forwards',
      }}
    >
      <style>{`
        @keyframes splashFadeOut {
          0%   { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; visibility: hidden; }
        }
      `}</style>
    </div>
  )
}
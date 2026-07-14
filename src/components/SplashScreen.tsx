'use client'

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: '#fff',
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
      <img
        src="/splash_1.png"
        alt="DKU SKI"
        style={{
          width: '70%',
          maxWidth: 400,
          objectFit: 'contain',
        }}
      />
    </div>
  )
}
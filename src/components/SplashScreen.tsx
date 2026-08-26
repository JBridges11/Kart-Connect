import { useEffect, useState } from 'react'

interface Props {
  onDone: () => void
}

export function SplashScreen({ onDone }: Props) {
  const [visible, setVisible] = useState(true)
  const [textVisible, setTextVisible] = useState(false)

  useEffect(() => {
    const textTimer = setTimeout(() => setTextVisible(true), 300)
    const fadeTimer = setTimeout(() => setVisible(false), 2600)
    const doneTimer = setTimeout(onDone, 3100)
    return () => { clearTimeout(textTimer); clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [onDone])

  return (
    <div
      className="fixed inset-0 z-50 bg-bg-primary flex flex-col items-center justify-center gap-16 transition-opacity duration-500"
      style={{ opacity: visible ? 1 : 0, pointerEvents: 'none' }}
    >
      <div
        className="text-center transition-all duration-700"
        style={{ opacity: textVisible ? 1 : 0, transform: textVisible ? 'translateY(0)' : 'translateY(8px)' }}
      >
        <p className="font-display text-4xl font-bold tracking-widest uppercase text-text-primary">Welcome to the Paddock</p>
      </div>

      <img
        src="/logo-pdf.png"
        alt="Kart Connect"
        className="w-48 object-contain transition-transform duration-700"
        style={{ transform: visible ? 'scale(1)' : 'scale(1.04)' }}
      />
    </div>
  )
}

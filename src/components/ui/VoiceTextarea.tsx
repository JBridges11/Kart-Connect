import { useRef, useState, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Language } from '@/i18n'

const LANG_MAP: Record<Language, string> = {
  en: 'en-GB',
  de: 'de-DE',
  pt: 'pt-BR',
  ja: 'ja-JP',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  ar: 'ar-SA',
}

interface Props {
  label?: string
  value: string
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
}

type SpeechRecognitionType = typeof window extends { SpeechRecognition: infer T } ? T : never

function getSpeechRecognition(): (new () => SpeechRecognitionType) | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null
}

export function VoiceTextarea({ label, value, onChange, placeholder, rows = 3 }: Props) {
  const { language } = useLanguage()
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [interim, setInterim] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  // Keep a live ref to value so onresult always appends to the latest text
  const valueRef = useRef(value)
  useEffect(() => { valueRef.current = value }, [value])
  // Track intended listening state separately from recognition lifecycle
  const activeRef = useRef(false)

  const textareaId = label?.toLowerCase().replace(/\s+/g, '-')

  useEffect(() => {
    if (!getSpeechRecognition()) setSupported(false)
  }, [])

  function buildRecognition() {
    const SR = getSpeechRecognition()
    if (!SR) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = new SR()
    r.lang = LANG_MAP[language] ?? 'en-GB'
    r.continuous = true
    r.interimResults = true
    r.maxAlternatives = 1

    r.onstart = () => setListening(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (event: any) => {
      let final = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) final += transcript
        else interimText += transcript
      }
      if (final) {
        // Use valueRef so we always append to the very latest text, not stale closure
        const current = valueRef.current
        onChange(current ? current + ' ' + final.trim() : final.trim())
        setInterim('')
      } else {
        setInterim(interimText)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (event: any) => {
      // 'no-speech' just means a pause — let onend restart it automatically
      if (event.error === 'no-speech' || event.error === 'audio-capture') return
      activeRef.current = false
      setListening(false)
      setInterim('')
    }

    r.onend = () => {
      setInterim('')
      // If the user is still intending to record, restart seamlessly
      if (activeRef.current) {
        try { r.start() } catch { /* ignore if already started */ }
      } else {
        setListening(false)
      }
    }

    return r
  }

  function startListening() {
    activeRef.current = true
    const r = buildRecognition()
    if (!r) return
    recognitionRef.current = r
    try { r.start() } catch { /* already started */ }
  }

  function stopListening() {
    activeRef.current = false
    recognitionRef.current?.stop()
    setListening(false)
    setInterim('')
  }

  function toggleVoice() {
    if (listening) stopListening()
    else startListening()
  }

  useEffect(() => () => {
    activeRef.current = false
    recognitionRef.current?.abort()
  }, [])

  const displayValue = listening && interim ? value + (value ? ' ' : '') + interim : value

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={textareaId}
            className="font-heading text-xs uppercase tracking-wider text-text-muted"
          >
            {label}
          </label>
          {supported && (
            <button
              type="button"
              onClick={toggleVoice}
              title={listening ? 'Stop recording' : 'Speak feedback'}
              className={[
                'flex items-center gap-1.5 text-xs font-heading font-bold uppercase tracking-wider px-2 py-1 rounded-card transition-all cursor-pointer',
                listening
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-bg-elevated text-text-muted border border-border-color hover:text-accent-primary hover:border-accent-primary/40',
              ].join(' ')}
            >
              {listening ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <MicOff size={11} />
                  Stop
                </>
              ) : (
                <>
                  <Mic size={11} />
                  Voice
                </>
              )}
            </button>
          )}
        </div>
      )}

      <textarea
        id={textareaId}
        rows={rows}
        value={displayValue}
        onChange={e => onChange(e.target.value)}
        placeholder={listening ? 'Listening…' : placeholder}
        className={[
          'bg-bg-elevated border border-border-color rounded-card px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none resize-none transition-all duration-150',
          'focus:border-l-2 focus:border-accent-primary',
          listening ? 'border-red-500/40' : '',
        ].join(' ')}
      />

      {listening && interim && (
        <p className="text-xs text-text-muted italic px-1">{interim}…</p>
      )}
    </div>
  )
}

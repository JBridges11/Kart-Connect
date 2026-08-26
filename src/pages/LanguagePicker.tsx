import { useState } from 'react'
import { LANGUAGES } from '@/i18n'
import type { Language } from '@/i18n'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  onDone: () => void
}

export function LanguagePickerPage({ onDone }: Props) {
  const { language, setLanguage, t } = useLanguage()
  const [selected, setSelected] = useState<Language>(language)

  function confirm() {
    setLanguage(selected)
    localStorage.setItem('kc_language_chosen', '1')
    onDone()
  }

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 gap-8">
      {/* Logo */}
      <img src="/logo-pdf.png" alt="Kart Connect" className="w-44 object-contain" />

      {/* Heading */}
      <div className="text-center space-y-1">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-text-primary">
          {t('lang.title')}
        </h1>
        <p className="text-text-muted text-sm">{t('lang.subtitle')}</p>
      </div>

      {/* Language grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {LANGUAGES.map(lang => {
          const isSelected = selected === lang.code
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setSelected(lang.code)}
              className={[
                'flex items-center gap-3 px-4 py-3.5 rounded-card border text-left transition-all cursor-pointer',
                isSelected
                  ? 'border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary'
                  : 'border-border-color bg-bg-elevated hover:border-accent-primary/40 hover:bg-bg-elevated/80',
              ].join(' ')}
            >
              <span className="text-2xl leading-none">{lang.flag}</span>
              <div className="min-w-0">
                <p className={[
                  'font-heading font-bold text-sm leading-tight',
                  isSelected ? 'text-accent-primary' : 'text-text-primary',
                ].join(' ')}>
                  {lang.native}
                </p>
                {lang.native !== lang.name && (
                  <p className="text-text-muted text-xs mt-0.5">{lang.name}</p>
                )}
              </div>
              {isSelected && (
                <div className="ml-auto w-4 h-4 rounded-full bg-accent-primary flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-bg-primary" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Continue button */}
      <button
        type="button"
        onClick={confirm}
        className="w-full max-w-sm py-3 bg-accent-primary text-bg-primary font-heading font-bold uppercase tracking-wider rounded-card cursor-pointer hover:bg-accent-primary/90 transition-colors text-sm"
      >
        {t('lang.continue')}
      </button>
    </div>
  )
}

import { createContext, useContext, useState, useEffect } from 'react'
import type { Language, TranslationKey } from '@/i18n'
import { getTranslations, LANGUAGES } from '@/i18n'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKey) => string
  isRtl: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(
    (localStorage.getItem('kc_language') as Language) ?? 'en'
  )

  const isRtl = LANGUAGES.find(l => l.code === language)?.rtl ?? false
  const translations = getTranslations(language)

  function t(key: TranslationKey): string {
    return translations[key] ?? key
  }

  function setLanguage(lang: Language) {
    setLanguageState(lang)
    localStorage.setItem('kc_language', lang)
  }

  // Apply RTL direction to document
  useEffect(() => {
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', language)
  }, [language, isRtl])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider')
  return ctx
}

export type Language = 'en' | 'en-us' | 'es' | 'fr' | 'it' | 'ar'

export const LANGUAGES: { code: Language; flag: string; name: string; native: string; rtl?: boolean }[] = [
  { code: 'en',    flag: '🇬🇧', name: 'English',          native: 'English'   },
  { code: 'en-us', flag: '🇺🇸', name: 'English (US)',      native: 'English'   },
  { code: 'es',    flag: '🇪🇸', name: 'Spanish',           native: 'Español'   },
  { code: 'fr',    flag: '🇫🇷', name: 'French',            native: 'Français'  },
  { code: 'it',    flag: '🇮🇹', name: 'Italian',           native: 'Italiano'  },
  { code: 'ar',    flag: '🇸🇦', name: 'Arabic',            native: 'العربية', rtl: true },
]

type Translations = {
  // Language picker
  'lang.title': string
  'lang.subtitle': string
  'lang.continue': string

  // Navigation
  'nav.home': string
  'nav.new_session': string
  'nav.tracks': string
  'nav.garage': string
  'nav.my_kart': string
  'nav.my_team': string
  'nav.analytics': string
  'nav.leaderboard': string
  'nav.stats': string
  'nav.settings': string

  // Sidebar
  'sidebar.live_session': string
  'sidebar.end_live_session': string
  'sidebar.are_you_sure': string
  'sidebar.yes_end_it': string
  'sidebar.cancel': string

  // Settings
  'settings.profile': string
  'settings.preferences': string
  'settings.billing': string
  'settings.sign_out': string
  'settings.signing_out': string
  'settings.pressure_unit': string
  'settings.altitude_unit': string
  'settings.temperature_unit': string
  'settings.speed_unit': string
  'settings.language': string
  'settings.save': string
  'settings.full_name': string
  'settings.billing_contact': string

  // Common
  'common.save': string
  'common.cancel': string
  'common.delete': string
  'common.edit': string
  'common.back': string
  'common.loading': string
  'common.error': string
  'common.search': string
  'common.confirm': string
  'common.done': string
  'common.new': string
}

const en: Translations = {
  'lang.title':   'Choose Your Language',
  'lang.subtitle': 'You can change this any time in Settings',
  'lang.continue': 'Continue',

  'nav.home':        'Dashboard',
  'nav.new_session': 'New Session',
  'nav.tracks':      'Tracks',
  'nav.garage':      'Garage',
  'nav.my_kart':     'My Kart',
  'nav.my_team':     'My Team',
  'nav.analytics':   'Analytics',
  'nav.leaderboard': 'Leaderboard',
  'nav.stats':       'Stats',
  'nav.settings':    'Settings',

  'sidebar.live_session':     'Live Session',
  'sidebar.end_live_session': 'End live session',
  'sidebar.are_you_sure':     'Are you sure?',
  'sidebar.yes_end_it':       'Yes, end it',
  'sidebar.cancel':           'Cancel',

  'settings.profile':          'Profile',
  'settings.preferences':      'Preferences',
  'settings.billing':          'Billing & Subscription',
  'settings.sign_out':         'Sign Out',
  'settings.signing_out':      'Signing out…',
  'settings.pressure_unit':    'Tyre Pressure Unit',
  'settings.altitude_unit':    'Altitude Unit',
  'settings.temperature_unit': 'Temperature Unit',
  'settings.speed_unit':       'Speed Unit',
  'settings.language':         'Language',
  'settings.save':             'Save',
  'settings.full_name':        'Full name',
  'settings.billing_contact':  'To manage your subscription, please contact support at',

  'common.save':    'Save',
  'common.cancel':  'Cancel',
  'common.delete':  'Delete',
  'common.edit':    'Edit',
  'common.back':    'Back',
  'common.loading': 'Loading…',
  'common.error':   'Something went wrong',
  'common.search':  'Search',
  'common.confirm': 'Confirm',
  'common.done':    'Done',
  'common.new':     'New',
}

const enUs: Translations = {
  ...en,
  'lang.title':   'Choose Your Language',
  'nav.home':     'Dashboard',
  'nav.garage':   'Garage',
  'nav.my_kart':  'My Kart',
  'settings.pressure_unit': 'Tire Pressure Unit',
}

const es: Translations = {
  'lang.title':   'Elige tu idioma',
  'lang.subtitle': 'Puedes cambiarlo en cualquier momento en Configuración',
  'lang.continue': 'Continuar',

  'nav.home':        'Panel',
  'nav.new_session': 'Nueva Sesión',
  'nav.tracks':      'Circuitos',
  'nav.garage':      'Garaje',
  'nav.my_kart':     'Mi Kart',
  'nav.my_team':     'Mi Equipo',
  'nav.analytics':   'Estadísticas',
  'nav.leaderboard': 'Clasificación',
  'nav.stats':       'Estadísticas',
  'nav.settings':    'Ajustes',

  'sidebar.live_session':     'Sesión en Vivo',
  'sidebar.end_live_session': 'Terminar sesión en vivo',
  'sidebar.are_you_sure':     '¿Estás seguro?',
  'sidebar.yes_end_it':       'Sí, terminar',
  'sidebar.cancel':           'Cancelar',

  'settings.profile':          'Perfil',
  'settings.preferences':      'Preferencias',
  'settings.billing':          'Facturación y Suscripción',
  'settings.sign_out':         'Cerrar Sesión',
  'settings.signing_out':      'Cerrando sesión…',
  'settings.pressure_unit':    'Unidad de Presión de Neumáticos',
  'settings.altitude_unit':    'Unidad de Altitud',
  'settings.temperature_unit': 'Unidad de Temperatura',
  'settings.speed_unit':       'Unidad de Velocidad',
  'settings.language':         'Idioma',
  'settings.save':             'Guardar',
  'settings.full_name':        'Nombre completo',
  'settings.billing_contact':  'Para gestionar tu suscripción, contacta soporte en',

  'common.save':    'Guardar',
  'common.cancel':  'Cancelar',
  'common.delete':  'Eliminar',
  'common.edit':    'Editar',
  'common.back':    'Atrás',
  'common.loading': 'Cargando…',
  'common.error':   'Algo salió mal',
  'common.search':  'Buscar',
  'common.confirm': 'Confirmar',
  'common.done':    'Hecho',
  'common.new':     'Nuevo',
}

const fr: Translations = {
  'lang.title':   'Choisissez votre langue',
  'lang.subtitle': 'Vous pouvez le modifier à tout moment dans les Paramètres',
  'lang.continue': 'Continuer',

  'nav.home':        'Tableau de bord',
  'nav.new_session': 'Nouvelle Session',
  'nav.tracks':      'Circuits',
  'nav.garage':      'Garage',
  'nav.my_kart':     'Mon Kart',
  'nav.my_team':     'Mon Équipe',
  'nav.analytics':   'Statistiques',
  'nav.leaderboard': 'Classement',
  'nav.stats':       'Statistiques',
  'nav.settings':    'Paramètres',

  'sidebar.live_session':     'Session en Direct',
  'sidebar.end_live_session': 'Terminer la session en direct',
  'sidebar.are_you_sure':     'Êtes-vous sûr ?',
  'sidebar.yes_end_it':       'Oui, terminer',
  'sidebar.cancel':           'Annuler',

  'settings.profile':          'Profil',
  'settings.preferences':      'Préférences',
  'settings.billing':          'Facturation et Abonnement',
  'settings.sign_out':         'Se déconnecter',
  'settings.signing_out':      'Déconnexion…',
  'settings.pressure_unit':    'Unité de Pression des Pneus',
  'settings.altitude_unit':    'Unité d\'Altitude',
  'settings.temperature_unit': 'Unité de Température',
  'settings.speed_unit':       'Unité de Vitesse',
  'settings.language':         'Langue',
  'settings.save':             'Enregistrer',
  'settings.full_name':        'Nom complet',
  'settings.billing_contact':  'Pour gérer votre abonnement, contactez le support à',

  'common.save':    'Enregistrer',
  'common.cancel':  'Annuler',
  'common.delete':  'Supprimer',
  'common.edit':    'Modifier',
  'common.back':    'Retour',
  'common.loading': 'Chargement…',
  'common.error':   'Une erreur est survenue',
  'common.search':  'Rechercher',
  'common.confirm': 'Confirmer',
  'common.done':    'Terminé',
  'common.new':     'Nouveau',
}

const it: Translations = {
  'lang.title':   'Scegli la tua lingua',
  'lang.subtitle': 'Puoi cambiarlo in qualsiasi momento nelle Impostazioni',
  'lang.continue': 'Continua',

  'nav.home':        'Dashboard',
  'nav.new_session': 'Nuova Sessione',
  'nav.tracks':      'Circuiti',
  'nav.garage':      'Garage',
  'nav.my_kart':     'Il Mio Kart',
  'nav.my_team':     'Il Mio Team',
  'nav.analytics':   'Statistiche',
  'nav.leaderboard': 'Classifica',
  'nav.stats':       'Statistiche',
  'nav.settings':    'Impostazioni',

  'sidebar.live_session':     'Sessione in Diretta',
  'sidebar.end_live_session': 'Termina sessione in diretta',
  'sidebar.are_you_sure':     'Sei sicuro?',
  'sidebar.yes_end_it':       'Sì, termina',
  'sidebar.cancel':           'Annulla',

  'settings.profile':          'Profilo',
  'settings.preferences':      'Preferenze',
  'settings.billing':          'Fatturazione e Abbonamento',
  'settings.sign_out':         'Disconnetti',
  'settings.signing_out':      'Disconnessione…',
  'settings.pressure_unit':    'Unità Pressione Pneumatici',
  'settings.altitude_unit':    'Unità di Altitudine',
  'settings.temperature_unit': 'Unità di Temperatura',
  'settings.speed_unit':       'Unità di Velocità',
  'settings.language':         'Lingua',
  'settings.save':             'Salva',
  'settings.full_name':        'Nome completo',
  'settings.billing_contact':  'Per gestire il tuo abbonamento, contatta il supporto a',

  'common.save':    'Salva',
  'common.cancel':  'Annulla',
  'common.delete':  'Elimina',
  'common.edit':    'Modifica',
  'common.back':    'Indietro',
  'common.loading': 'Caricamento…',
  'common.error':   'Qualcosa è andato storto',
  'common.search':  'Cerca',
  'common.confirm': 'Conferma',
  'common.done':    'Fatto',
  'common.new':     'Nuovo',
}

const ar: Translations = {
  'lang.title':   'اختر لغتك',
  'lang.subtitle': 'يمكنك تغيير ذلك في أي وقت من الإعدادات',
  'lang.continue': 'متابعة',

  'nav.home':        'لوحة التحكم',
  'nav.new_session': 'جلسة جديدة',
  'nav.tracks':      'المضامير',
  'nav.garage':      'المرآب',
  'nav.my_kart':     'كارتي',
  'nav.my_team':     'فريقي',
  'nav.analytics':   'الإحصائيات',
  'nav.leaderboard': 'المتصدرون',
  'nav.stats':       'الإحصائيات',
  'nav.settings':    'الإعدادات',

  'sidebar.live_session':     'الجلسة المباشرة',
  'sidebar.end_live_session': 'إنهاء الجلسة المباشرة',
  'sidebar.are_you_sure':     'هل أنت متأكد؟',
  'sidebar.yes_end_it':       'نعم، إنهاء',
  'sidebar.cancel':           'إلغاء',

  'settings.profile':          'الملف الشخصي',
  'settings.preferences':      'التفضيلات',
  'settings.billing':          'الفواتير والاشتراك',
  'settings.sign_out':         'تسجيل الخروج',
  'settings.signing_out':      'جارٍ تسجيل الخروج…',
  'settings.pressure_unit':    'وحدة ضغط الإطارات',
  'settings.altitude_unit':    'وحدة الارتفاع',
  'settings.temperature_unit': 'وحدة درجة الحرارة',
  'settings.speed_unit':       'وحدة السرعة',
  'settings.language':         'اللغة',
  'settings.save':             'حفظ',
  'settings.full_name':        'الاسم الكامل',
  'settings.billing_contact':  'لإدارة اشتراكك، يرجى التواصل مع الدعم على',

  'common.save':    'حفظ',
  'common.cancel':  'إلغاء',
  'common.delete':  'حذف',
  'common.edit':    'تعديل',
  'common.back':    'رجوع',
  'common.loading': 'جارٍ التحميل…',
  'common.error':   'حدث خطأ ما',
  'common.search':  'بحث',
  'common.confirm': 'تأكيد',
  'common.done':    'تم',
  'common.new':     'جديد',
}

const dict: Record<Language, Translations> = { en, 'en-us': enUs, es, fr, it, ar }

export function getTranslations(lang: Language) {
  return dict[lang] ?? en
}

export type TranslationKey = keyof Translations

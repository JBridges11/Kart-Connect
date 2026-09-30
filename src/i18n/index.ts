export type Language = 'en' | 'es' | 'fr' | 'it' | 'ar' | 'de' | 'pt' | 'ja'

export const LANGUAGES: { code: Language; flag: string; name: string; native: string; rtl?: boolean }[] = [
  { code: 'en', flag: '🇬🇧', name: 'English',            native: 'English'    },
  { code: 'de', flag: '🇩🇪', name: 'German',             native: 'Deutsch'    },
  { code: 'es', flag: '🇪🇸', name: 'Spanish',            native: 'Español'    },
  { code: 'fr', flag: '🇫🇷', name: 'French',             native: 'Français'   },
  { code: 'it', flag: '🇮🇹', name: 'Italian',            native: 'Italiano'   },
  { code: 'pt', flag: '🇧🇷', name: 'Portuguese (BR)',    native: 'Português'  },
  { code: 'ar', flag: '🇸🇦', name: 'Arabic',             native: 'العربية', rtl: true },
  { code: 'ja', flag: '🇯🇵', name: 'Japanese',           native: '日本語'      },
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

const de: Translations = {
  'lang.title':   'Sprache wählen',
  'lang.subtitle': 'Du kannst dies jederzeit in den Einstellungen ändern',
  'lang.continue': 'Weiter',

  'nav.home':        'Dashboard',
  'nav.new_session': 'Neue Session',
  'nav.tracks':      'Strecken',
  'nav.garage':      'Garage',
  'nav.my_kart':     'Mein Kart',
  'nav.my_team':     'Mein Team',
  'nav.analytics':   'Statistiken',
  'nav.leaderboard': 'Rangliste',
  'nav.stats':       'Statistiken',
  'nav.settings':    'Einstellungen',

  'sidebar.live_session':     'Live-Session',
  'sidebar.end_live_session': 'Live-Session beenden',
  'sidebar.are_you_sure':     'Bist du sicher?',
  'sidebar.yes_end_it':       'Ja, beenden',
  'sidebar.cancel':           'Abbrechen',

  'settings.profile':          'Profil',
  'settings.preferences':      'Einstellungen',
  'settings.billing':          'Abrechnung & Abonnement',
  'settings.sign_out':         'Abmelden',
  'settings.signing_out':      'Abmelden…',
  'settings.pressure_unit':    'Reifendruckeinheit',
  'settings.altitude_unit':    'Höheneinheit',
  'settings.temperature_unit': 'Temperatureinheit',
  'settings.speed_unit':       'Geschwindigkeitseinheit',
  'settings.language':         'Sprache',
  'settings.save':             'Speichern',
  'settings.full_name':        'Vollständiger Name',
  'settings.billing_contact':  'Zur Verwaltung deines Abonnements wende dich an den Support unter',

  'common.save':    'Speichern',
  'common.cancel':  'Abbrechen',
  'common.delete':  'Löschen',
  'common.edit':    'Bearbeiten',
  'common.back':    'Zurück',
  'common.loading': 'Lädt…',
  'common.error':   'Etwas ist schiefgelaufen',
  'common.search':  'Suchen',
  'common.confirm': 'Bestätigen',
  'common.done':    'Fertig',
  'common.new':     'Neu',
}

const pt: Translations = {
  'lang.title':   'Escolha seu idioma',
  'lang.subtitle': 'Você pode alterar isso a qualquer momento nas Configurações',
  'lang.continue': 'Continuar',

  'nav.home':        'Painel',
  'nav.new_session': 'Nova Sessão',
  'nav.tracks':      'Pistas',
  'nav.garage':      'Garagem',
  'nav.my_kart':     'Meu Kart',
  'nav.my_team':     'Meu Time',
  'nav.analytics':   'Estatísticas',
  'nav.leaderboard': 'Classificação',
  'nav.stats':       'Estatísticas',
  'nav.settings':    'Configurações',

  'sidebar.live_session':     'Sessão ao Vivo',
  'sidebar.end_live_session': 'Encerrar sessão ao vivo',
  'sidebar.are_you_sure':     'Tem certeza?',
  'sidebar.yes_end_it':       'Sim, encerrar',
  'sidebar.cancel':           'Cancelar',

  'settings.profile':          'Perfil',
  'settings.preferences':      'Preferências',
  'settings.billing':          'Faturamento e Assinatura',
  'settings.sign_out':         'Sair',
  'settings.signing_out':      'Saindo…',
  'settings.pressure_unit':    'Unidade de Pressão dos Pneus',
  'settings.altitude_unit':    'Unidade de Altitude',
  'settings.temperature_unit': 'Unidade de Temperatura',
  'settings.speed_unit':       'Unidade de Velocidade',
  'settings.language':         'Idioma',
  'settings.save':             'Salvar',
  'settings.full_name':        'Nome completo',
  'settings.billing_contact':  'Para gerenciar sua assinatura, entre em contato com o suporte em',

  'common.save':    'Salvar',
  'common.cancel':  'Cancelar',
  'common.delete':  'Excluir',
  'common.edit':    'Editar',
  'common.back':    'Voltar',
  'common.loading': 'Carregando…',
  'common.error':   'Algo deu errado',
  'common.search':  'Pesquisar',
  'common.confirm': 'Confirmar',
  'common.done':    'Concluído',
  'common.new':     'Novo',
}

const ja: Translations = {
  'lang.title':   '言語を選択',
  'lang.subtitle': '設定からいつでも変更できます',
  'lang.continue': '続ける',

  'nav.home':        'ダッシュボード',
  'nav.new_session': '新しいセッション',
  'nav.tracks':      'サーキット',
  'nav.garage':      'ガレージ',
  'nav.my_kart':     'マイカート',
  'nav.my_team':     'マイチーム',
  'nav.analytics':   '分析',
  'nav.leaderboard': 'ランキング',
  'nav.stats':       '統計',
  'nav.settings':    '設定',

  'sidebar.live_session':     'ライブセッション',
  'sidebar.end_live_session': 'ライブセッションを終了',
  'sidebar.are_you_sure':     '本当によろしいですか？',
  'sidebar.yes_end_it':       'はい、終了します',
  'sidebar.cancel':           'キャンセル',

  'settings.profile':          'プロフィール',
  'settings.preferences':      '設定',
  'settings.billing':          '請求とサブスクリプション',
  'settings.sign_out':         'サインアウト',
  'settings.signing_out':      'サインアウト中…',
  'settings.pressure_unit':    'タイヤ空気圧単位',
  'settings.altitude_unit':    '高度単位',
  'settings.temperature_unit': '温度単位',
  'settings.speed_unit':       '速度単位',
  'settings.language':         '言語',
  'settings.save':             '保存',
  'settings.full_name':        'フルネーム',
  'settings.billing_contact':  'サブスクリプションの管理はサポートまでお問い合わせください',

  'common.save':    '保存',
  'common.cancel':  'キャンセル',
  'common.delete':  '削除',
  'common.edit':    '編集',
  'common.back':    '戻る',
  'common.loading': '読み込み中…',
  'common.error':   'エラーが発生しました',
  'common.search':  '検索',
  'common.confirm': '確認',
  'common.done':    '完了',
  'common.new':     '新規',
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

const dict: Record<Language, Translations> = { en, de, pt, ja, es, fr, it, ar }

export function getTranslations(lang: Language) {
  return dict[lang] ?? en
}

export type TranslationKey = keyof Translations

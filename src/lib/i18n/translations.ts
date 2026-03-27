// TASK 3.1: Create translation object T with all UI strings
// Supports: English (en), Spanish (es), French (fr), Chinese (zh)

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'zh';

export const T = {
  en: {
    // Navigation & Header
    'nav.atlas': 'Atlas',
    'nav.conversation': 'Conversation',
    'nav.dashboard': 'Dashboard',
    'nav.settings': 'Settings',
    'nav.signOut': 'Sign out',

    // Landing Page
    'landing.title': 'The clarity you\'ve always wanted about your money.',
    'landing.subtitle': 'Atlas talks with you, understands your real situation, and gives you one clear step forward — like a brilliant friend who genuinely cares about your future.',
    'landing.startConversation': 'Start a conversation →',
    'landing.signIn': 'Sign in with email',
    'landing.toggleTheme': 'Dark mode',
    'landing.noBankSync': 'No bank sync',
    'landing.staysPrivate': 'Stays on your device',
    'landing.oneStep': 'One step at a time',
    'landing.realConversation': 'Real conversation',

    // Conversation
    'conversation.placeholder': 'Tell Atlas anything…',
    'conversation.send': 'Send',
    'conversation.cancel': 'Cancel',
    'conversation.retry': 'Retry',
    'conversation.streaming': 'Streaming response…',
    'conversation.aiOffline': 'AI is offline right now — Atlas will do its best in local mode. You can retry anytime.',
    'conversation.aiDegraded': 'AI is a bit slow/unreliable at the moment — if a response fails, hit Retry.',
    'conversation.aiUnknown': 'AI status is unknown — if anything feels off, hit Retry.',
    'conversation.jumpToLatest': 'Jump to latest ↓',
    'conversation.newMessages': 'New messages ↓',

    // Chat Status
    'status.atlasActive': 'Atlas AI active',
    'status.aiDegraded': 'AI degraded',
    'status.aiOffline': 'AI offline',
    'status.aiUnknown': 'AI status unknown',
    'status.apiNotConfigured': 'API not configured',

    // Buttons & Actions
    'button.yes': 'Yes',
    'button.no': 'No',
    'button.next': 'Next',
    'button.back': 'Back',
    'button.confirm': 'Confirm',
    'button.cancel': 'Cancel',
    'button.edit': 'Edit',
    'button.save': 'Save',
    'button.delete': 'Delete',
    'button.close': 'Close',

    // Financial Terms
    'finance.monthlyIncome': 'Monthly income',
    'finance.essentials': 'Essentials',
    'finance.savings': 'Savings',
    'finance.debt': 'Debt',
    'finance.highInterestDebt': 'High-interest debt',
    'finance.lowInterestDebt': 'Low-interest debt',
    'finance.emergencyFund': 'Emergency fund',
    'finance.surplus': 'Monthly surplus',

    // Goals
    'goal.stability': 'Stability',
    'goal.growth': 'Growth',
    'goal.flexibility': 'Flexibility',
    'goal.wealthBuilding': 'Wealth building',

    // Themes
    'theme.light': 'Light mode',
    'theme.dark': 'Dark mode',

    // Language
    'language.english': 'English',
    'language.spanish': 'Español',
    'language.french': 'Français',
    'language.chinese': '中文',
  },

  es: {
    // Navigation & Header
    'nav.atlas': 'Atlas',
    'nav.conversation': 'Conversación',
    'nav.dashboard': 'Panel',
    'nav.settings': 'Configuración',
    'nav.signOut': 'Cerrar sesión',

    // Landing Page
    'landing.title': 'La claridad que siempre quisiste sobre tu dinero.',
    'landing.subtitle': 'Atlas habla contigo, entiende tu situación real y te da un paso claro hacia adelante — como un amigo brillante que realmente se preocupa por tu futuro.',
    'landing.startConversation': 'Comenzar una conversación →',
    'landing.signIn': 'Iniciar sesión con correo',
    'landing.toggleTheme': 'Modo oscuro',
    'landing.noBankSync': 'Sin sincronización bancaria',
    'landing.staysPrivate': 'Se mantiene en tu dispositivo',
    'landing.oneStep': 'Un paso a la vez',
    'landing.realConversation': 'Conversación real',

    // Conversation
    'conversation.placeholder': 'Cuéntale a Atlas cualquier cosa…',
    'conversation.send': 'Enviar',
    'conversation.cancel': 'Cancelar',
    'conversation.retry': 'Reintentar',
    'conversation.streaming': 'Transmitiendo respuesta…',
    'conversation.aiOffline': 'La IA está sin conexión ahora — Atlas hará lo mejor en modo local. Puedes reintentar en cualquier momento.',
    'conversation.aiDegraded': 'La IA está un poco lenta/poco confiable en este momento — si una respuesta falla, haz clic en Reintentar.',
    'conversation.aiUnknown': 'El estado de la IA es desconocido — si algo se ve mal, haz clic en Reintentar.',
    'conversation.jumpToLatest': 'Ir al más reciente ↓',
    'conversation.newMessages': 'Nuevos mensajes ↓',

    // Chat Status
    'status.atlasActive': 'Atlas IA activa',
    'status.aiDegraded': 'IA degradada',
    'status.aiOffline': 'IA sin conexión',
    'status.aiUnknown': 'Estado de IA desconocido',
    'status.apiNotConfigured': 'API no configurada',

    // Buttons & Actions
    'button.yes': 'Sí',
    'button.no': 'No',
    'button.next': 'Siguiente',
    'button.back': 'Atrás',
    'button.confirm': 'Confirmar',
    'button.cancel': 'Cancelar',
    'button.edit': 'Editar',
    'button.save': 'Guardar',
    'button.delete': 'Eliminar',
    'button.close': 'Cerrar',

    // Financial Terms
    'finance.monthlyIncome': 'Ingresos mensuales',
    'finance.essentials': 'Esenciales',
    'finance.savings': 'Ahorros',
    'finance.debt': 'Deuda',
    'finance.highInterestDebt': 'Deuda de alto interés',
    'finance.lowInterestDebt': 'Deuda de bajo interés',
    'finance.emergencyFund': 'Fondo de emergencia',
    'finance.surplus': 'Superávit mensual',

    // Goals
    'goal.stability': 'Estabilidad',
    'goal.growth': 'Crecimiento',
    'goal.flexibility': 'Flexibilidad',
    'goal.wealthBuilding': 'Construcción de riqueza',

    // Themes
    'theme.light': 'Modo claro',
    'theme.dark': 'Modo oscuro',

    // Language
    'language.english': 'English',
    'language.spanish': 'Español',
    'language.french': 'Français',
    'language.chinese': '中文',
  },

  fr: {
    // Navigation & Header
    'nav.atlas': 'Atlas',
    'nav.conversation': 'Conversation',
    'nav.dashboard': 'Tableau de bord',
    'nav.settings': 'Paramètres',
    'nav.signOut': 'Se déconnecter',

    // Landing Page
    'landing.title': 'La clarté que vous avez toujours voulue sur votre argent.',
    'landing.subtitle': 'Atlas vous parle, comprend votre situation réelle et vous donne une étape claire vers l\'avant — comme un ami brillant qui se soucie vraiment de votre avenir.',
    'landing.startConversation': 'Commencer une conversation →',
    'landing.signIn': 'Se connecter avec e-mail',
    'landing.toggleTheme': 'Mode sombre',
    'landing.noBankSync': 'Pas de synchronisation bancaire',
    'landing.staysPrivate': 'Reste sur votre appareil',
    'landing.oneStep': 'Un pas à la fois',
    'landing.realConversation': 'Conversation réelle',

    // Conversation
    'conversation.placeholder': 'Dites à Atlas n\'importe quoi…',
    'conversation.send': 'Envoyer',
    'conversation.cancel': 'Annuler',
    'conversation.retry': 'Réessayer',
    'conversation.streaming': 'Transmission de la réponse…',
    'conversation.aiOffline': 'L\'IA est hors ligne en ce moment — Atlas fera de son mieux en mode local. Vous pouvez réessayer à tout moment.',
    'conversation.aiDegraded': 'L\'IA est un peu lente/peu fiable en ce moment — si une réponse échoue, cliquez sur Réessayer.',
    'conversation.aiUnknown': 'L\'état de l\'IA est inconnu — si quelque chose semble mal, cliquez sur Réessayer.',
    'conversation.jumpToLatest': 'Aller au plus récent ↓',
    'conversation.newMessages': 'Nouveaux messages ↓',

    // Chat Status
    'status.atlasActive': 'Atlas IA actif',
    'status.aiDegraded': 'IA dégradée',
    'status.aiOffline': 'IA hors ligne',
    'status.aiUnknown': 'État de l\'IA inconnu',
    'status.apiNotConfigured': 'API non configurée',

    // Buttons & Actions
    'button.yes': 'Oui',
    'button.no': 'Non',
    'button.next': 'Suivant',
    'button.back': 'Retour',
    'button.confirm': 'Confirmer',
    'button.cancel': 'Annuler',
    'button.edit': 'Modifier',
    'button.save': 'Enregistrer',
    'button.delete': 'Supprimer',
    'button.close': 'Fermer',

    // Financial Terms
    'finance.monthlyIncome': 'Revenu mensuel',
    'finance.essentials': 'Essentiels',
    'finance.savings': 'Épargne',
    'finance.debt': 'Dette',
    'finance.highInterestDebt': 'Dette à taux élevé',
    'finance.lowInterestDebt': 'Dette à taux faible',
    'finance.emergencyFund': 'Fonds d\'urgence',
    'finance.surplus': 'Surplus mensuel',

    // Goals
    'goal.stability': 'Stabilité',
    'goal.growth': 'Croissance',
    'goal.flexibility': 'Flexibilité',
    'goal.wealthBuilding': 'Création de richesse',

    // Themes
    'theme.light': 'Mode clair',
    'theme.dark': 'Mode sombre',

    // Language
    'language.english': 'English',
    'language.spanish': 'Español',
    'language.french': 'Français',
    'language.chinese': '中文',
  },

  zh: {
    // Navigation & Header
    'nav.atlas': 'Atlas',
    'nav.conversation': '对话',
    'nav.dashboard': '仪表板',
    'nav.settings': '设置',
    'nav.signOut': '登出',

    // Landing Page
    'landing.title': '获得您一直想要的关于金钱的清晰认识。',
    'landing.subtitle': 'Atlas 与您交谈，了解您的真实情况，并为您指出清晰的前进方向 — 就像一位真正关心您未来的聪慧朋友。',
    'landing.startConversation': '开始对话 →',
    'landing.signIn': '使用电子邮件登录',
    'landing.toggleTheme': '深色模式',
    'landing.noBankSync': '无银行同步',
    'landing.staysPrivate': '保留在您的设备上',
    'landing.oneStep': '一次一步',
    'landing.realConversation': '真实对话',

    // Conversation
    'conversation.placeholder': '告诉 Atlas 任何事情…',
    'conversation.send': '发送',
    'conversation.cancel': '取消',
    'conversation.retry': '重试',
    'conversation.streaming': '正在流式传输响应…',
    'conversation.aiOffline': 'AI 现在离线 — Atlas 将在本地模式下尽力而为。您可以随时重试。',
    'conversation.aiDegraded': 'AI 目前速度有点慢/不太可靠 — 如果响应失败，请点击重试。',
    'conversation.aiUnknown': 'AI 状态未知 — 如果有任何问题，请点击重试。',
    'conversation.jumpToLatest': '跳转到最新 ↓',
    'conversation.newMessages': '新消息 ↓',

    // Chat Status
    'status.atlasActive': 'Atlas AI 活跃',
    'status.aiDegraded': 'AI 性能下降',
    'status.aiOffline': 'AI 离线',
    'status.aiUnknown': 'AI 状态未知',
    'status.apiNotConfigured': 'API 未配置',

    // Buttons & Actions
    'button.yes': '是',
    'button.no': '否',
    'button.next': '下一步',
    'button.back': '返回',
    'button.confirm': '确认',
    'button.cancel': '取消',
    'button.edit': '编辑',
    'button.save': '保存',
    'button.delete': '删除',
    'button.close': '关闭',

    // Financial Terms
    'finance.monthlyIncome': '月收入',
    'finance.essentials': '基本开支',
    'finance.savings': '储蓄',
    'finance.debt': '债务',
    'finance.highInterestDebt': '高利息债务',
    'finance.lowInterestDebt': '低利息债务',
    'finance.emergencyFund': '应急基金',
    'finance.surplus': '月度盈余',

    // Goals
    'goal.stability': '稳定',
    'goal.growth': '增长',
    'goal.flexibility': '灵活性',
    'goal.wealthBuilding': '财富积累',

    // Themes
    'theme.light': '浅色模式',
    'theme.dark': '深色模式',

    // Language
    'language.english': 'English',
    'language.spanish': 'Español',
    'language.french': 'Français',
    'language.chinese': '中文',
  },
} as const;

// Helper function to get translated string
export function t(key: keyof typeof T.en, lang: SupportedLanguage = 'en'): string {
  const translation = T[lang][key as keyof typeof T[typeof lang]];
  return translation || T.en[key as keyof typeof T.en] || key;
}

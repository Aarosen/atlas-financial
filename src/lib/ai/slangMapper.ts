export type SupportedLanguage = 'en' | 'es' | 'fr' | 'zh';

const slangMappings: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    'broke': 'no money',
    'cash flow': 'money left each month',
    'stash': 'savings',
    'dough': 'money',
    'bucks': 'dollars',
    'paycheck': 'income',
    'gig': 'side income',
    'side hustle': 'additional income',
    'debt trap': 'high debt',
    'rainy day fund': 'emergency fund',
    'nest egg': 'savings',
    'penny pinching': 'budgeting',
    'splurge': 'spending',
    'tight': 'low on money',
    'loaded': 'wealthy',
  },
  es: {
    'plata': 'dinero',
    'pasta': 'dinero',
    'guita': 'dinero',
    'billete': 'dinero',
    'pesos': 'dinero',
    'sin un peso': 'sin dinero',
    'quebrado': 'sin dinero',
    'ahorros': 'savings',
    'fondo de emergencia': 'emergency fund',
    'deudas': 'debt',
    'gastos': 'expenses',
    'ingresos': 'income',
    'sueldo': 'salary',
    'laburo': 'work',
    'curro': 'work',
  },
  fr: {
    'fric': 'argent',
    'pognon': 'argent',
    'thune': 'argent',
    'blé': 'argent',
    'tune': 'argent',
    'fauché': 'sans argent',
    'raide': 'sans argent',
    'économies': 'savings',
    'épargne': 'savings',
    'fonds de secours': 'emergency fund',
    'dettes': 'debt',
    'dépenses': 'expenses',
    'revenus': 'income',
    'salaire': 'salary',
    'boulot': 'work',
  },
  zh: {
    '没钱': 'no money',
    '穷': 'poor',
    '有钱': 'wealthy',
    '存钱': 'savings',
    '存款': 'savings',
    '应急基金': 'emergency fund',
    '债务': 'debt',
    '花费': 'expenses',
    '收入': 'income',
    '工资': 'salary',
    '工作': 'work',
    '副业': 'side income',
    '赚钱': 'earn money',
    '花钱': 'spend money',
    '理财': 'financial management',
  },
};

export function normalizeSlang(text: string, lang: SupportedLanguage): string {
  let result = text;
  const mappings = slangMappings[lang] || {};
  for (const [slang, formal] of Object.entries(mappings)) {
    const regex = new RegExp(`\\b${slang}\\b`, 'gi');
    result = result.replace(regex, formal);
  }
  return result;
}

import type { Category } from '@/domain/model'

/** The starting categories. Fixed ids keep them stable and readable in the database. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Alimentação', icon: 'utensils', kind: 'expense', order: 0 },
  { id: 'home', name: 'Casa', icon: 'house', kind: 'expense', order: 1 },
  { id: 'transport', name: 'Transporte', icon: 'bus', kind: 'expense', order: 2 },
  { id: 'fun', name: 'Lazer', icon: 'party', kind: 'expense', order: 3 },
  { id: 'subscriptions', name: 'Assinaturas', icon: 'repeat', kind: 'expense', order: 4 },
  { id: 'health', name: 'Saúde', icon: 'health', kind: 'expense', order: 5 },
  { id: 'shopping', name: 'Compras', icon: 'shopping', kind: 'expense', order: 6 },
  { id: 'education', name: 'Educação', icon: 'education', kind: 'expense', order: 7 },
  { id: 'other-expense', name: 'Outros', icon: 'other', kind: 'expense', order: 8 },
  { id: 'salary', name: 'Salário', icon: 'briefcase', kind: 'income', order: 0 },
  { id: 'bonus', name: 'Subsídios', icon: 'gift', kind: 'income', order: 1 },
  { id: 'other-income', name: 'Outros ganhos', icon: 'coins', kind: 'income', order: 2 },
]

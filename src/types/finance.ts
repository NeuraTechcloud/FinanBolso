export type TransactionType = 'expense' | 'income';

export type PaymentMethod = 
  | 'pix' 
  | 'credit_card' 
  | 'debit_card' 
  | 'boleto'
  | 'ticket'
  | 'cash' 
  | 'bank_transfer' 
  | 'other';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  monthlyBudget?: number;
  keywords?: string[];
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO YYYY-MM-DD
  paymentMethod: PaymentMethod;
  notes?: string;
  isRecurring?: boolean;
  installmentNumber?: number;
  installmentsTotal?: number;
  recurringGroupId?: string;
  isPaid?: boolean;
  createdAt: number;
  updatedAt?: number;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color: string;
  icon: string;
}

export interface MonthlyBudget {
  categoryId: string;
  month: string; // YYYY-MM
  limit: number;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { label: string; icon: string }> = {
  pix: { label: 'PIX', icon: 'Zap' },
  credit_card: { label: 'Cartão de Crédito', icon: 'CreditCard' },
  debit_card: { label: 'Cartão de Débito', icon: 'CreditCard' },
  boleto: { label: 'Boleto Bancário', icon: 'FileText' },
  ticket: { label: 'Ticket / Benefício (VR/VA)', icon: 'Utensils' },
  cash: { label: 'Dinheiro', icon: 'Banknote' },
  bank_transfer: { label: 'Transferência/TED', icon: 'ArrowLeftRight' },
  other: { label: 'Outro', icon: 'HelpCircle' },
};

export const DEFAULT_CATEGORIES: Category[] = [
  // Despesas
  { id: 'alimentacao', name: 'Alimentação', type: 'expense', color: '#f59e0b', icon: 'Utensils', monthlyBudget: 1200 },
  { id: 'moradia', name: 'Moradia & Contas', type: 'expense', color: '#3b82f6', icon: 'Home', monthlyBudget: 1800 },
  { id: 'transporte', name: 'Transporte & Combustível', type: 'expense', color: '#ef4444', icon: 'Car', monthlyBudget: 600 },
  { id: 'saude', name: 'Saúde & Farmácia', type: 'expense', color: '#10b981', icon: 'HeartPulse', monthlyBudget: 400 },
  { id: 'lazer', name: 'Lazer & Viagens', type: 'expense', color: '#8b5cf6', icon: 'Sparkles', monthlyBudget: 500 },
  { id: 'educacao', name: 'Educação & Cursos', type: 'expense', color: '#06b6d4', icon: 'GraduationCap', monthlyBudget: 350 },
  { id: 'compras', name: 'Compras & Vestuário', type: 'expense', color: '#ec4899', icon: 'ShoppingBag', monthlyBudget: 400 },
  { id: 'servicos', name: 'Assinaturas & Serviços', type: 'expense', color: '#6366f1', icon: 'Tv', monthlyBudget: 250 },
  { id: 'outros_gastos', name: 'Outros Gastos', type: 'expense', color: '#64748b', icon: 'MoreHorizontal', monthlyBudget: 300 },

  // Receitas
  { id: 'salario', name: 'Salário Normal (Conta)', type: 'income', color: '#10b981', icon: 'Briefcase' },
  { id: 'ticket_beneficio', name: 'Ticket & Benefícios (VR/VA)', type: 'income', color: '#f59e0b', icon: 'Utensils' },
  { id: 'freelance', name: 'Freelance & Projetos', type: 'income', color: '#06b6d4', icon: 'Laptop' },
  { id: 'investimentos', name: 'Rendimentos & Dividendos', type: 'income', color: '#8b5cf6', icon: 'TrendingUp' },
  { id: 'outras_receitas', name: 'Outras Entradas', type: 'income', color: '#14b8a6', icon: 'PlusCircle' },
];

export const INITIAL_SAVINGS_GOALS: SavingsGoal[] = [
  {
    id: 'meta-1',
    title: 'Reserva de Emergência (6 meses)',
    targetAmount: 18000,
    currentAmount: 12450,
    deadline: '2026-12-31',
    color: '#10b981',
    icon: 'ShieldCheck'
  },
  {
    id: 'meta-2',
    title: 'Viagem de Férias',
    targetAmount: 6000,
    currentAmount: 4300,
    deadline: '2027-01-15',
    color: '#8b5cf6',
    icon: 'Plane'
  },
  {
    id: 'meta-3',
    title: 'Troca de Smartphone',
    targetAmount: 4500,
    currentAmount: 2100,
    deadline: '2026-11-30',
    color: '#3b82f6',
    icon: 'Smartphone'
  }
];

export interface QuickPreset {
  id: string;
  title: string;
  type: TransactionType;
  category: string;
  defaultAmount?: number;
  paymentMethod: PaymentMethod;
}

export const DEFAULT_QUICK_PRESETS: QuickPreset[] = [
  { id: 'p1', title: 'Almoço (Ticket VR)', type: 'expense', category: 'Alimentação', defaultAmount: 38.0, paymentMethod: 'ticket' },
  { id: 'p2', title: 'Supermercado (Ticket VA)', type: 'expense', category: 'Alimentação', defaultAmount: 180.0, paymentMethod: 'ticket' },
  { id: 'p3', title: 'Boleto / Conta Luz/Água', type: 'expense', category: 'Moradia & Contas', defaultAmount: 140.0, paymentMethod: 'boleto' },
  { id: 'p4', title: 'Uber / Corrida', type: 'expense', category: 'Transporte & Combustível', defaultAmount: 24.0, paymentMethod: 'pix' },
  { id: 'p5', title: 'Combustível', type: 'expense', category: 'Transporte & Combustível', defaultAmount: 100.0, paymentMethod: 'credit_card' },
  { id: 'p6', title: 'Farmácia', type: 'expense', category: 'Saúde & Farmácia', defaultAmount: 45.0, paymentMethod: 'pix' },
  { id: 'p7', title: 'Salário Normal (Conta)', type: 'income', category: 'Salário Normal (Conta)', defaultAmount: 3800.0, paymentMethod: 'bank_transfer' },
  { id: 'p8', title: 'Ticket Alimentação / VR', type: 'income', category: 'Ticket & Benefícios (VR/VA)', defaultAmount: 750.0, paymentMethod: 'ticket' },
  { id: 'p9', title: 'Freelance / Extra', type: 'income', category: 'Freelance & Projetos', defaultAmount: 450.0, paymentMethod: 'pix' },
];

export interface Reminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  category: string;
  isPaid: boolean;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export const INITIAL_REMINDERS: Reminder[] = [
  {
    id: 'rem-1',
    title: 'Fatura Cartão Nubank',
    amount: 1450.00,
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    category: 'Moradia & Contas',
    isPaid: false,
    paymentMethod: 'credit_card',
    notes: 'Vencimento dia 25'
  },
  {
    id: 'rem-2',
    title: 'Internet Fibra Óptica',
    amount: 119.90,
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    category: 'Moradia & Contas',
    isPaid: false,
    paymentMethod: 'pix',
    notes: 'Débito automático'
  },
  {
    id: 'rem-3',
    title: 'Seguro do Automóvel',
    amount: 230.00,
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString().slice(0, 10),
    category: 'Transporte & Combustível',
    isPaid: false,
    paymentMethod: 'credit_card'
  }
];
export type SubscriptionPlanType = 'monthly' | 'yearly';

export interface UserSubscription {
  isPro: boolean;
  planName: string;
  planType?: SubscriptionPlanType;
  durationDays: number; // 30 or 365
  activationId?: string; // unique activation ID
  deviceId?: string; // unique device identifier
  activatedAt?: number;
  expiresAt: number;
}

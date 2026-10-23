import { 
  Transaction, 
  Category, 
  SavingsGoal, 
  Reminder,
  UserSubscription,
  DEFAULT_CATEGORIES, 
  INITIAL_SAVINGS_GOALS,
  INITIAL_REMINDERS
} from '../types/finance';

const STORAGE_KEYS = {
  TRANSACTIONS: 'finanbolso_user_transactions_v2',
  CATEGORIES: 'finanbolso_categories_v1',
  SAVINGS_GOALS: 'finanbolso_user_goals_v2',
  REMINDERS: 'finanbolso_user_reminders_v1',
  INITIALIZED: 'finanbolso_user_clean_v2',
};

// Generates initial realistic demo transactions for the current and prior 2 months
function generateInitialDemoData(): Transaction[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const pad = (n: number) => String(n).padStart(2, '0');
  const makeDate = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

  const list: Transaction[] = [
    // Current Month (receitas)
    {
      id: 'tx-cm-1',
      type: 'income',
      amount: 5400.00,
      description: 'Salário Mensal',
      category: 'Salário & Pro-labore',
      date: makeDate(year, month, 5),
      paymentMethod: 'bank_transfer',
      notes: 'Depósito em conta corrente CLT',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15,
    },
    {
      id: 'tx-cm-2',
      type: 'income',
      amount: 1150.00,
      description: 'Projeto Freelance Design UI',
      category: 'Freelance & Projetos',
      date: makeDate(year, month, 12),
      paymentMethod: 'pix',
      notes: 'Cliente Agência Web',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    },
    {
      id: 'tx-cm-3',
      type: 'income',
      amount: 320.50,
      description: 'Dividendos FIIs e Ações',
      category: 'Rendimentos & Dividendos',
      date: makeDate(year, month, 15),
      paymentMethod: 'bank_transfer',
      notes: 'Rendimentos do mês',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    },

    // Current Month (despesas)
    {
      id: 'tx-cm-4',
      type: 'expense',
      amount: 1450.00,
      description: 'Aluguel do Apartamento',
      category: 'Moradia & Contas',
      date: makeDate(year, month, 6),
      paymentMethod: 'pix',
      notes: 'Boleto do condomínio incluso',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    },
    {
      id: 'tx-cm-5',
      type: 'expense',
      amount: 420.00,
      description: 'Supermercado Mensal',
      category: 'Alimentação',
      date: makeDate(year, month, 8),
      paymentMethod: 'debit_card',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 12,
    },
    {
      id: 'tx-cm-6',
      type: 'expense',
      amount: 215.30,
      description: 'Conta de Energia (Enel)',
      category: 'Moradia & Contas',
      date: makeDate(year, month, 10),
      paymentMethod: 'pix',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 11,
    },
    {
      id: 'tx-cm-7',
      type: 'expense',
      amount: 250.00,
      description: 'Abastecimento Gasolina Comum',
      category: 'Transporte & Combustível',
      date: makeDate(year, month, 11),
      paymentMethod: 'credit_card',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
    },
    {
      id: 'tx-cm-8',
      type: 'expense',
      amount: 189.90,
      description: 'Jantar Restaurante Japonês',
      category: 'Alimentação',
      date: makeDate(year, month, 13),
      paymentMethod: 'credit_card',
      notes: 'Noite com amigos',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 8,
    },
    {
      id: 'tx-cm-9',
      type: 'expense',
      amount: 85.00,
      description: 'Farmácia - Medicamentos e Vitaminas',
      category: 'Saúde & Farmácia',
      date: makeDate(year, month, 16),
      paymentMethod: 'pix',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 6,
    },
    {
      id: 'tx-cm-10',
      type: 'expense',
      amount: 55.90,
      description: 'Netflix & Spotify Premium',
      category: 'Assinaturas & Serviços',
      date: makeDate(year, month, 17),
      paymentMethod: 'credit_card',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
    },
    {
      id: 'tx-cm-11',
      type: 'expense',
      amount: 140.00,
      description: 'Ingressos Cinema & Pipoca',
      category: 'Lazer & Viagens',
      date: makeDate(year, month, 18),
      paymentMethod: 'credit_card',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
    },
    {
      id: 'tx-cm-12',
      type: 'expense',
      amount: 320.00,
      description: 'Feira e Hortifruti Semanal',
      category: 'Alimentação',
      date: makeDate(year, month, 20),
      paymentMethod: 'pix',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    },

    // Prior Month (Mês anterior)
    {
      id: 'tx-pm-1',
      type: 'income',
      amount: 5400.00,
      description: 'Salário Mensal',
      category: 'Salário & Pro-labore',
      date: makeDate(year, (month - 1 + 12) % 12, 5),
      paymentMethod: 'bank_transfer',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    },
    {
      id: 'tx-pm-2',
      type: 'income',
      amount: 900.00,
      description: 'Consultoria Financeira Avulsa',
      category: 'Freelance & Projetos',
      date: makeDate(year, (month - 1 + 12) % 12, 18),
      paymentMethod: 'pix',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 35,
    },
    {
      id: 'tx-pm-3',
      type: 'expense',
      amount: 1450.00,
      description: 'Aluguel do Apartamento',
      category: 'Moradia & Contas',
      date: makeDate(year, (month - 1 + 12) % 12, 6),
      paymentMethod: 'pix',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 44,
    },
    {
      id: 'tx-pm-4',
      type: 'expense',
      amount: 880.00,
      description: 'Supermercado e Compras do Mês',
      category: 'Alimentação',
      date: makeDate(year, (month - 1 + 12) % 12, 10),
      paymentMethod: 'debit_card',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 40,
    },
    {
      id: 'tx-pm-5',
      type: 'expense',
      amount: 450.00,
      description: 'Manutenção Veículo / Revisão Óleo',
      category: 'Transporte & Combustível',
      date: makeDate(year, (month - 1 + 12) % 12, 15),
      paymentMethod: 'credit_card',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 38,
    },
    {
      id: 'tx-pm-6',
      type: 'expense',
      amount: 320.00,
      description: 'Curso Online Especialização',
      category: 'Educação & Cursos',
      date: makeDate(year, (month - 1 + 12) % 12, 22),
      paymentMethod: 'credit_card',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    },

    // 2 Months Ago
    {
      id: 'tx-2m-1',
      type: 'income',
      amount: 5400.00,
      description: 'Salário Mensal',
      category: 'Salário & Pro-labore',
      date: makeDate(year, (month - 2 + 12) % 12, 5),
      paymentMethod: 'bank_transfer',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 75,
    },
    {
      id: 'tx-2m-2',
      type: 'expense',
      amount: 1450.00,
      description: 'Aluguel do Apartamento',
      category: 'Moradia & Contas',
      date: makeDate(year, (month - 2 + 12) % 12, 6),
      paymentMethod: 'pix',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 74,
    },
    {
      id: 'tx-2m-3',
      type: 'expense',
      amount: 920.00,
      description: 'Supermercado e Feira',
      category: 'Alimentação',
      date: makeDate(year, (month - 2 + 12) % 12, 12),
      paymentMethod: 'debit_card',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 70,
    },
    {
      id: 'tx-2m-4',
      type: 'expense',
      amount: 380.00,
      description: 'Combustível e Uber',
      category: 'Transporte & Combustível',
      date: makeDate(year, (month - 2 + 12) % 12, 20),
      paymentMethod: 'credit_card',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 65,
    },
  ];

  return list;
}

export const StorageService = {
  getTransactions(): Transaction[] {
    try {
      // Purge any legacy mock demo keys
      localStorage.removeItem('finanbolso_transactions_v1');
      localStorage.removeItem('finanbolso_goals_v1');

      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) {
        // Start clean with 0 fictional data as requested by user
        this.saveTransactions([]);
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.warn('Erro ao carregar transações offline:', e);
      return [];
    }
  },

  saveTransactions(transactions: Transaction[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      console.error('Erro ao salvar transações offline:', e);
    }
  },

  getCategories(): Category[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      if (!data) {
        this.saveCategories(DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Erro ao carregar categorias offline:', e);
      return DEFAULT_CATEGORIES;
    }
  },

  saveCategories(categories: Category[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      console.error('Erro ao salvar categorias:', e);
    }
  },

  getSavingsGoals(): SavingsGoal[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SAVINGS_GOALS);
      if (!data) {
        this.saveSavingsGoals([]);
        return [];
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Erro ao carregar metas offline:', e);
      return [];
    }
  },

  saveSavingsGoals(goals: SavingsGoal[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVINGS_GOALS, JSON.stringify(goals));
    } catch (e) {
      console.error('Erro ao salvar metas:', e);
    }
  },

  getReminders(): Reminder[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
      if (!data) {
        this.saveReminders(INITIAL_REMINDERS);
        return INITIAL_REMINDERS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Erro ao carregar lembretes:', e);
      return INITIAL_REMINDERS;
    }
  },

  saveReminders(reminders: Reminder[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    } catch (e) {
      console.error('Erro ao salvar lembretes:', e);
    }
  },

  resetToDemoData(): { transactions: Transaction[]; categories: Category[]; goals: SavingsGoal[]; reminders: Reminder[] } {
    const transactions = generateInitialDemoData();
    const categories = DEFAULT_CATEGORIES;
    const goals = INITIAL_SAVINGS_GOALS;
    const reminders = INITIAL_REMINDERS;

    this.saveTransactions(transactions);
    this.saveCategories(categories);
    this.saveSavingsGoals(goals);
    this.saveReminders(reminders);

    return { transactions, categories, goals, reminders };
  },

  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.SAVINGS_GOALS);
    localStorage.removeItem(STORAGE_KEYS.REMINDERS);
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
    localStorage.removeItem('finanbolso_transactions_v1');
    localStorage.removeItem('finanbolso_goals_v1');
    localStorage.removeItem('finanbolso_initialized_v1');
    this.saveTransactions([]);
    this.saveSavingsGoals([]);
    this.saveReminders([]);
  },

  // Unique Device Identifier (Hardware & Browser binding)
  getDeviceId(): string {
    try {
      let id = localStorage.getItem('finanbolso_device_id_v2');
      if (!id) {
        // Upgrade from legacy key or generate a unique persistent hardware format
        const legacy = localStorage.getItem('finanbolso_device_id');
        if (legacy && legacy.startsWith('DEV-BR-')) {
          id = legacy;
        } else {
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          const rand = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
          id = `DEV-BR-${rand()}-${rand()}`;
        }
        localStorage.setItem('finanbolso_device_id_v2', id);
        localStorage.setItem('finanbolso_device_id', id);
      }
      return id;
    } catch {
      return 'DEV-BR-LOCAL-0001';
    }
  },

  // Extended Device Information & Fingerprint
  getDeviceInfo(): {
    deviceId: string;
    platform: string;
    screenResolution: string;
    isIdentified: boolean;
    status: string;
  } {
    const deviceId = this.getDeviceId();
    let platform = 'Navegador Web';
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      if (/Android/i.test(ua)) platform = 'Smartphone Android';
      else if (/iPhone/i.test(ua)) platform = 'Apple iPhone (iOS)';
      else if (/iPad/i.test(ua)) platform = 'Apple iPad';
      else if (/Windows/i.test(ua)) platform = 'Windows PC';
      else if (/Macintosh|Mac OS/i.test(ua)) platform = 'Apple Mac';
      else if (/Linux/i.test(ua)) platform = 'Sistema Linux';
    }

    const screenResolution = typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height} px`
      : '1080x2400 px';

    return {
      deviceId,
      platform,
      screenResolution,
      isIdentified: true,
      status: 'Aparelho Identificado & Registrado',
    };
  },

  exportBackupJSON(): string {
    const deviceId = this.getDeviceId();
    const backup = {
      version: 2,
      appName: 'FinanBolso',
      deviceId,
      exportedAt: new Date().toISOString(),
      transactions: this.getTransactions(),
      categories: this.getCategories(),
      savingsGoals: this.getSavingsGoals(),
      reminders: this.getReminders(),
      subscription: this.getSubscription(),
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupJSON(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed.transactions)) {
        this.saveTransactions(parsed.transactions);
      }
      if (Array.isArray(parsed.categories)) {
        this.saveCategories(parsed.categories);
      }
      if (Array.isArray(parsed.savingsGoals)) {
        this.saveSavingsGoals(parsed.savingsGoals);
      }
      if (Array.isArray(parsed.reminders)) {
        this.saveReminders(parsed.reminders);
      }
      if (parsed.subscription) {
        this.saveSubscription(parsed.subscription);
      }
      return true;
    } catch (e) {
      console.error('Falha ao importar arquivo JSON de backup:', e);
      return false;
    }
  },

  getSubscription(): UserSubscription {
    try {
      const currentDeviceId = this.getDeviceId();
      const data = localStorage.getItem('finanbolso_subscription_v1');
      if (!data) return { isPro: false, planName: 'Gratuito', durationDays: 0, expiresAt: 0, deviceId: currentDeviceId };
      const parsed: UserSubscription = JSON.parse(data);
      if (!parsed.deviceId) {
        parsed.deviceId = currentDeviceId;
      }
      // Auto-expire check when subscription timestamp has passed
      if (parsed.isPro && parsed.expiresAt > 0 && parsed.expiresAt < Date.now()) {
        const expired: UserSubscription = { 
          ...parsed,
          isPro: false, 
          planName: 'Expirado', 
          expiresAt: parsed.expiresAt,
          deviceId: currentDeviceId
        };
        this.saveSubscription(expired);
        return expired;
      }
      return parsed;
    } catch (e) {
      return { isPro: false, planName: 'Gratuito', durationDays: 0, expiresAt: 0, deviceId: this.getDeviceId() };
    }
  },

  saveSubscription(sub: UserSubscription): void {
    try {
      if (!sub.deviceId) {
        sub.deviceId = this.getDeviceId();
      }
      localStorage.setItem('finanbolso_subscription_v1', JSON.stringify(sub));
    } catch (e) {}
  }
};


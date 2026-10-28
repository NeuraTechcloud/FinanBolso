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
  return [];
}

// Deterministic Hardware Fingerprint Generator (stable across Incognito mode & cache clear on same device)
function computeHardwareFingerprint(): string {
  try {
    const parts: string[] = [];

    // 1. User Agent & Navigator Traits
    if (typeof navigator !== 'undefined') {
      parts.push(navigator.userAgent || '');
      parts.push(navigator.language || '');
      parts.push(String(navigator.hardwareConcurrency || ''));
      parts.push(String((navigator as any).deviceMemory || ''));
    }

    // 2. Screen Dimensions & Color Depth
    if (typeof window !== 'undefined' && window.screen) {
      parts.push(`${window.screen.width}x${window.screen.height}`);
      parts.push(`${window.screen.colorDepth}`);
      parts.push(`${window.devicePixelRatio || 1}`);
    }

    // 3. Timezone
    try {
      parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || '');
    } catch {}

    // 4. HTML5 Offscreen Canvas Rendering Hash
    if (typeof document !== 'undefined') {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 50;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.textBaseline = 'top';
          ctx.font = "14px 'Arial'";
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#f60';
          ctx.fillRect(125, 1, 62, 20);
          ctx.fillStyle = '#069';
          ctx.fillText('FinanBolso-HW-ID-v1', 2, 15);
          ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
          ctx.fillText('FinanBolso-HW-ID-v1', 4, 17);
          parts.push(canvas.toDataURL());
        }
      } catch {}

      // 5. WebGL GPU Vendor / Renderer Info
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            parts.push(`${vendor}~${renderer}`);
          }
        }
      } catch {}
    }

    const rawString = parts.join('||');

    // FNV-1a Hash Algorithm to generate two 16-bit equivalent alphanumeric segments
    let hash1 = 2166136261;
    let hash2 = 305419896;
    for (let i = 0; i < rawString.length; i++) {
      const code = rawString.charCodeAt(i);
      hash1 ^= code;
      hash1 = Math.imul(hash1, 16777619);
      hash2 ^= code;
      hash2 = Math.imul(hash2, 1099511628211 % 4294967296);
    }

    const seg1 = (hash1 >>> 0).toString(36).toUpperCase().padStart(4, 'X').slice(-4);
    const seg2 = (hash2 >>> 0).toString(36).toUpperCase().padStart(4, 'Y').slice(-4);

    return `DEV-BR-${seg1}-${seg2}`;
  } catch {
    return 'DEV-BR-UNQ1-8842';
  }
}

export const StorageService = {
  getTransactions(): Transaction[] {
    try {
      // Purge any legacy mock demo keys
      localStorage.removeItem('finanbolso_transactions_v1');
      localStorage.removeItem('finanbolso_goals_v1');

      const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      if (!data) {
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
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.saveCategories(DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES;
      }
      return parsed;
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
        return [];
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

  // Unique Device Identifier (Hardware Fingerprint & Browser binding)
  getDeviceId(): string {
    try {
      // 1. Try localStorage
      let id = localStorage.getItem('finanbolso_device_id_v2');
      if (id && id.startsWith('DEV-BR-')) return id;

      // 2. Try sessionStorage fallback
      try {
        id = sessionStorage.getItem('finanbolso_device_id_v2');
        if (id && id.startsWith('DEV-BR-')) {
          localStorage.setItem('finanbolso_device_id_v2', id);
          return id;
        }
      } catch {}

      // 3. Compute deterministic hardware fingerprint (stable across Incognito & cache clear)
      const fpId = computeHardwareFingerprint();

      try {
        localStorage.setItem('finanbolso_device_id_v2', fpId);
        localStorage.setItem('finanbolso_device_id', fpId);
        sessionStorage.setItem('finanbolso_device_id_v2', fpId);
      } catch {}

      return fpId;
    } catch {
      return computeHardwareFingerprint();
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


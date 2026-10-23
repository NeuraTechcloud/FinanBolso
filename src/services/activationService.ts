// Service for generating and validating 30-day and 365-day Pro Activation IDs
import { UserSubscription } from '../types/finance';
import { StorageService } from './storage';

export interface ActivationValidationResult {
  valid: boolean;
  durationDays: 30 | 365;
  planName: string;
  activationId: string;
  deviceId?: string;
  message: string;
}

export interface AuthorizedKey {
  key: string;
  durationDays: 30 | 365;
  issuedAt: number;
  label?: string;
}

const STORAGE_AUTHORIZED_KEYS = 'finanbolso_authorized_keys_v1';

// Initial keys authorized by administration (starts empty for fresh creation)
const DEFAULT_AUTHORIZED_KEYS: AuthorizedKey[] = [];

function generateRandomSegment(length: number = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < length; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

export const ActivationService = {
  // Retrieve list of keys authorized by the ADM
  getAuthorizedKeys(): AuthorizedKey[] {
    try {
      const data = localStorage.getItem(STORAGE_AUTHORIZED_KEYS);
      if (!data) {
        localStorage.setItem(STORAGE_AUTHORIZED_KEYS, JSON.stringify(DEFAULT_AUTHORIZED_KEYS));
        return DEFAULT_AUTHORIZED_KEYS;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_AUTHORIZED_KEYS;
    }
  },

  // Register a newly generated key into the authorized pool
  registerAuthorizedKey(key: string, durationDays: 30 | 365, label?: string): void {
    const keys = this.getAuthorizedKeys();
    const cleanKey = key.trim().toUpperCase();
    if (!keys.some(k => k.key.toUpperCase() === cleanKey)) {
      keys.unshift({
        key: cleanKey,
        durationDays,
        issuedAt: Date.now(),
        label,
      });
      try {
        localStorage.setItem(STORAGE_AUTHORIZED_KEYS, JSON.stringify(keys));
      } catch {}
    }
  },

  // Delete an unused key from the authorized pool
  deleteAuthorizedKey(keyToDelete: string): void {
    const keys = this.getAuthorizedKeys();
    const cleanKey = keyToDelete.trim().toUpperCase();
    const filtered = keys.filter(k => k.key.toUpperCase() !== cleanKey);
    try {
      localStorage.setItem(STORAGE_AUTHORIZED_KEYS, JSON.stringify(filtered));
    } catch {}
  },

  // Generate a distinct Activation ID for 30 or 365 days and register it
  generateActivationId(durationDays: 30 | 365, label?: string): string {
    const prefix = durationDays === 30 ? 'PRO-30D' : 'PRO-365D';
    const part1 = generateRandomSegment(4);
    const part2 = generateRandomSegment(4);
    const key = `${prefix}-${part1}-${part2}`;
    this.registerAuthorizedKey(key, durationDays, label || `Emitido pelo ADM (${durationDays}d)`);
    return key;
  },

  // Validate an Activation ID strictly against ADM authorized keys
  async validateActivationId(rawId: string): Promise<ActivationValidationResult> {
    const id = rawId.trim().toUpperCase();

    if (!id || id.length < 6) {
      return {
        valid: false,
        durationDays: 30,
        planName: '',
        activationId: id,
        message: 'Código de ativação inválido ou muito curto.',
      };
    }

    const deviceId = StorageService.getDeviceId();

    // 1. Try server verification first if online
    try {
      const response = await fetch('/api/subscription/validate-id', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activationId: id, deviceId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.valid) {
          return {
            valid: true,
            durationDays: data.durationDays === 30 ? 30 : 365,
            planName: data.planName || (data.durationDays === 30 ? 'Pro Mensal (30 Dias)' : 'Pro Anual (365 Dias)'),
            activationId: data.activationId || id,
            deviceId,
            message: data.message || `Código validado com sucesso e vinculado a este aparelho (${deviceId})! Plano de ${data.durationDays} dias liberado.`,
          };
        }
      }
    } catch {
      // Offline fallback: check local authorized database
    }

    // 2. Check local authorized keys created by ADM
    const authorizedList = this.getAuthorizedKeys();
    const localMatch = authorizedList.find(k => k.key.toUpperCase() === id);

    if (localMatch) {
      return {
        valid: true,
        durationDays: localMatch.durationDays,
        planName: localMatch.durationDays === 365 ? 'Pro Anual (365 Dias)' : 'Pro Mensal (30 Dias)',
        activationId: localMatch.key,
        deviceId,
        message: `Código autorizado pelo administrador validado e vinculado ao aparelho (${deviceId})! Plano de ${localMatch.durationDays} dias liberado.`,
      };
    }

    // 3. Check subscribers in Admin database
    try {
      const adminSubsData = localStorage.getItem('finanbolso_admin_subscribers_v1');
      if (adminSubsData) {
        const subs = JSON.parse(adminSubsData);
        const subMatch = subs.find((s: any) => s.activationId && s.activationId.toUpperCase() === id);
        if (subMatch) {
          const durationDays: 30 | 365 = subMatch.plan === 'Pro Mensal' ? 30 : 365;
          return {
            valid: true,
            durationDays,
            planName: durationDays === 365 ? 'Pro Anual (365 Dias)' : 'Pro Mensal (30 Dias)',
            activationId: subMatch.activationId,
            deviceId,
            message: `Código de cliente validado pelo gestor e vinculado ao aparelho (${deviceId})! Plano de ${durationDays} dias liberado.`,
          };
        }
      }
    } catch {}

    // Strict reject: Only codes authorized by the ADM are permitted
    return {
      valid: false,
      durationDays: 30,
      planName: '',
      activationId: id,
      deviceId,
      message: 'Código não encontrado ou não autorizado pelo administrador.',
    };
  },

  // Calculate remaining days from an expiration timestamp
  calculateRemainingDays(expiresAt: number): number {
    if (!expiresAt || expiresAt <= 0) return 0;
    const diffMs = expiresAt - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  },

  // Create an active UserSubscription object bound to device
  buildSubscription(durationDays: 30 | 365, activationId?: string): UserSubscription {
    const days = durationDays === 30 ? 30 : 365;
    const now = Date.now();
    const id = activationId || this.generateActivationId(days, 'Ativação Master');
    const deviceId = StorageService.getDeviceId();
    return {
      isPro: true,
      planName: days === 30 ? 'Pro Mensal (30 Dias)' : 'Pro Anual (365 Dias)',
      planType: days === 30 ? 'monthly' : 'yearly',
      durationDays: days,
      activationId: id,
      deviceId,
      activatedAt: now,
      expiresAt: now + days * 24 * 60 * 60 * 1000,
    };
  },

  // Automatically record or update a subscriber in the admin subscriber list when activated
  recordSubscriber(subscription: UserSubscription): void {
    try {
      const saved = localStorage.getItem('finanbolso_admin_subscribers_v1');
      let subs = saved ? JSON.parse(saved) : [];
      const deviceId = subscription.deviceId || StorageService.getDeviceId();
      const existingIdx = subs.findIndex((s: any) => 
        (subscription.activationId && s.activationId === subscription.activationId) || s.id === deviceId
      );

      const planTitle = subscription.durationDays === 30 ? 'Pro Mensal' : 'Pro Anual';
      const newSub = {
        id: existingIdx >= 0 ? subs[existingIdx].id : `sub-${Date.now()}`,
        name: existingIdx >= 0 ? subs[existingIdx].name : `Usuário Aparelho (${deviceId.slice(0, 8)})`,
        email: existingIdx >= 0 ? subs[existingIdx].email : `cliente_${deviceId.slice(0, 6)}@finanbolso.app`,
        plan: planTitle,
        durationDays: subscription.durationDays || 365,
        activationId: subscription.activationId,
        status: 'Ativo' as const,
        expiresAt: new Date(subscription.expiresAt).toISOString().slice(0, 10),
        managedAssetsValue: existingIdx >= 0 ? subs[existingIdx].managedAssetsValue : 0.00,
      };

      if (existingIdx >= 0) {
        subs[existingIdx] = newSub;
      } else {
        subs.unshift(newSub);
      }

      localStorage.setItem('finanbolso_admin_subscribers_v1', JSON.stringify(subs));
    } catch {}
  },

  // Force registration of device presence and unique device ID for ADM management
  async registerDevicePresence(subscription: UserSubscription): Promise<void> {
    try {
      const devInfo = StorageService.getDeviceInfo();
      const deviceId = devInfo.deviceId;
      const planName = subscription.isPro ? subscription.planName : 'Gratuito';
      const activationId = subscription.activationId || (subscription.isPro ? 'PRO-ACTIVE' : 'FREE-DEVICE');

      const userGoals = StorageService.getSavingsGoals();
      const userAssets = userGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);

      const entry = {
        id: deviceId,
        deviceId,
        name: `Aparelho ${devInfo.platform} (${deviceId.slice(-6)})`,
        email: `aparelho_${deviceId.toLowerCase().replace(/[^a-z0-9]/g, '')}@finanbolso.app`,
        plan: planName,
        durationDays: subscription.durationDays || (subscription.isPro ? 30 : 0),
        activationId,
        status: 'Ativo' as const,
        expiresAt: subscription.expiresAt ? new Date(subscription.expiresAt).toISOString().slice(0, 10) : '2027-12-31',
        managedAssetsValue: userAssets,
        platform: devInfo.platform,
        resolution: devInfo.screenResolution,
      };

      await fetch('/api/subscription/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      const saved = localStorage.getItem('finanbolso_admin_subscribers_v1');
      let subs: any[] = saved ? JSON.parse(saved) : [];
      const existingIdx = subs.findIndex((s: any) => s.deviceId === deviceId || s.id === deviceId);
      if (existingIdx >= 0) {
        subs[existingIdx] = { ...subs[existingIdx], ...entry, plan: planName };
      } else {
        subs.unshift(entry);
      }

      localStorage.setItem('finanbolso_admin_subscribers_v1', JSON.stringify(subs));
    } catch {}
  }
};

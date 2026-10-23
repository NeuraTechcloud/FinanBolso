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

// Initial keys authorized by administration
const DEFAULT_AUTHORIZED_KEYS: AuthorizedKey[] = [
  { key: 'PRO-365D-MSTR-2026', durationDays: 365, issuedAt: Date.now(), label: 'Chave Master Gestor' },
  { key: 'PRO-30D-MARI-8411', durationDays: 30, issuedAt: Date.now(), label: 'Licença Mariana 30d' },
  { key: 'PRO-365D-ROBT-9902', durationDays: 365, issuedAt: Date.now(), label: 'Licença Roberto 365d' },
];

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
  }
};

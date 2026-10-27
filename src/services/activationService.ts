// Service for generating and validating 30-day and 365-day Pro Activation IDs
import { UserSubscription } from '../types/finance';
import { StorageService } from './storage';
import { FirestoreService } from './firestore';
import { auth, db } from '../lib/firebase';
import { getDoc, setDoc, doc as firestoreDoc } from 'firebase/firestore';

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
  isUsed?: boolean;
  status?: 'available' | 'used';
  usedBy?: string | null;
  usedAt?: number | null;
  singleUseRegistered?: boolean;
  createdAt?: number;
}

export function isActivationKeyUsed(data: any): boolean {
  if (!data) return false;
  if (data.isUsed === true) return true;
  if (data.status === 'used') return true;
  if (data.status === 'available') return false;
  if (data.isUsed === false) return false;
  if (typeof data.usedAt === 'number' && data.usedAt > 0) return true;
  if (typeof data.usedBy === 'string' && data.usedBy.trim() !== '' && data.usedBy !== 'null' && data.usedBy !== 'undefined') return true;
  return false;
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

  // Register a newly generated key into the authorized pool with single-use lock
  async registerAuthorizedKey(key: string, durationDays: 30 | 365, label?: string, autoUseEmail?: string): Promise<void> {
    const cleanKey = key.trim().toUpperCase();
    const currentUser = auth.currentUser;
    const identifier = autoUseEmail || currentUser?.email || currentUser?.displayName || 'Sistema / Administrador';

    const keyData: AuthorizedKey = {
      key: cleanKey,
      durationDays,
      issuedAt: Date.now(),
      label: label || `Licença Corporativa (${durationDays}d)`,
      isUsed: false,
      status: 'available',
      usedBy: undefined,
      usedAt: undefined,
      singleUseRegistered: true,
      createdAt: Date.now(),
    };

    try {
      // 1. Save to Firestore
      await FirestoreService.saveActivationKey(keyData);
    } catch (err) {
      console.error('Failed to save activation key to Firestore:', err);
    }

    // 2. Fallback to LocalStorage (always save locally for persistence if offline)
    const keys = this.getAuthorizedKeys();
    if (!keys.some(k => k.key.toUpperCase() === cleanKey)) {
      keys.unshift(keyData);
      try {
        localStorage.setItem(STORAGE_AUTHORIZED_KEYS, JSON.stringify(keys));
      } catch {}
    }
  },

  // Delete an unused key from the authorized pool
  async deleteAuthorizedKey(keyToDelete: string): Promise<void> {
    const cleanKey = keyToDelete.trim().toUpperCase();
    
    // 1. Sync LocalStorage immediately so local queries never return it
    const keys = this.getAuthorizedKeys();
    const filtered = keys.filter(k => k.key.toUpperCase() !== cleanKey);
    try {
      localStorage.setItem(STORAGE_AUTHORIZED_KEYS, JSON.stringify(filtered));
    } catch {}

    // 2. Delete document from Firestore
    try {
      await FirestoreService.deleteActivationKey(cleanKey);
    } catch (err) {
      console.error('Failed to delete activation key from Firestore:', err);
    }
  },

  // Generate a distinct Activation ID for 30 or 365 days and register it as available for single-use
  async generateActivationId(durationDays: 30 | 365, label?: string, autoUseEmail?: string): Promise<string> {
    const prefix = durationDays === 30 ? 'PRO-30D' : 'PRO-365D';
    const part1 = generateRandomSegment(4);
    const part2 = generateRandomSegment(4);
    const key = `${prefix}-${part1}-${part2}`;
    await this.registerAuthorizedKey(key, durationDays, label || `Emissão de Sistema (${durationDays}d)`, autoUseEmail);
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
    const currentUser = auth.currentUser;
    const userIdentifier = currentUser?.email || currentUser?.displayName || `Usuário (${deviceId})`;

    // 1. Try Firestore verification first
    try {
      const keyDoc = await getDoc(firestoreDoc(db, 'activations', id));
      if (keyDoc.exists()) {
        const data = keyDoc.data();

        // STRICT SINGLE-USE LOCK: Check if key was actually used
        if (isActivationKeyUsed(data)) {
          const usedDateStr = data.usedAt ? ` em ${new Date(data.usedAt).toLocaleDateString('pt-BR')}` : '';
          return {
            valid: false,
            durationDays: 30,
            planName: '',
            activationId: id,
            deviceId,
            message: `Esta chave de ativação já foi utilizada${usedDateStr} (uso único) e não pode ser reutilizada.`,
          };
        }

        // Mark key as USED in Firestore (single-use lock registered)
        try {
          await setDoc(firestoreDoc(db, 'activations', id), {
            key: id,
            durationDays: data.durationDays === 365 ? 365 : 30,
            issuedAt: data.issuedAt || Date.now(),
            label: data.label || 'Licença Pro',
            isUsed: true,
            status: 'used',
            usedBy: userIdentifier,
            usedAt: Date.now(),
            singleUseRegistered: true,
            updatedAt: Date.now(),
          }, { merge: true });
        } catch (err) {
          console.error('Error marking key as used in Firestore:', err);
        }

        // Update local cache
        const localKeys = this.getAuthorizedKeys();
        const match = localKeys.find(k => k.key.toUpperCase() === id);
        if (match) {
          match.isUsed = true;
          match.status = 'used';
          match.usedBy = userIdentifier;
          match.usedAt = Date.now();
          try {
            localStorage.setItem(STORAGE_AUTHORIZED_KEYS, JSON.stringify(localKeys));
          } catch {}
        }

        return {
          valid: true,
          durationDays: data.durationDays === 365 ? 365 : 30,
          planName: data.durationDays === 365 ? 'Pro Anual (365 Dias)' : 'Pro Mensal (30 Dias)',
          activationId: id,
          deviceId,
          message: `Chave de ativação de uso único validada com sucesso! Plano de ${data.durationDays === 365 ? '365' : '30'} dias liberado.`,
        };
      }
    } catch (e) {
      console.error('Firestore key validation failed, falling back:', e);
    }

    // 2. Check local authorized keys created by ADM
    const authorizedList = this.getAuthorizedKeys();
    const localMatch = authorizedList.find(k => k.key.toUpperCase() === id);
    if (localMatch) {
      // STRICT SINGLE-USE LOCK: Check if key was actually used locally
      if (isActivationKeyUsed(localMatch)) {
        const usedDateStr = localMatch.usedAt ? ` em ${new Date(localMatch.usedAt).toLocaleDateString('pt-BR')}` : '';
        return {
          valid: false,
          durationDays: 30,
          planName: '',
          activationId: localMatch.key,
          deviceId,
          message: `Esta chave de ativação já foi utilizada${usedDateStr} (uso único) e não pode ser reutilizada.`,
        };
      }

      // Mark as USED locally
      localMatch.isUsed = true;
      localMatch.status = 'used';
      localMatch.usedBy = userIdentifier;
      localMatch.usedAt = Date.now();
      try {
        localStorage.setItem(STORAGE_AUTHORIZED_KEYS, JSON.stringify(authorizedList));
      } catch {}

      return {
        valid: true,
        durationDays: localMatch.durationDays,
        planName: localMatch.durationDays === 365 ? 'Pro Anual (365 Dias)' : 'Pro Mensal (30 Dias)',
        activationId: localMatch.key,
        deviceId,
        message: `Chave de ativação de uso único validada com sucesso! Plano de ${localMatch.durationDays} dias liberado.`,
      };
    }

    // 3. Check subscribers in Admin database
    try {
      const adminSubsData = localStorage.getItem('finanbolso_admin_subscribers_v1');
      if (adminSubsData) {
        const subs = JSON.parse(adminSubsData);
        const subMatch = subs.find((s: any) => s.activationId && s.activationId.toUpperCase() === id);
        if (subMatch) {
          if (subMatch.isKeyUsed || subMatch.status === 'used' || subMatch.keyUsedAt) {
            return {
              valid: false,
              durationDays: 30,
              planName: '',
              activationId: id,
              deviceId,
              message: 'Esta chave de ativação já foi utilizada (uso único) e não pode ser usada novamente.',
            };
          }
          subMatch.isKeyUsed = true;
          subMatch.status = 'used';
          subMatch.keyUsedAt = Date.now();
          subMatch.usedBy = userIdentifier;
          try {
            localStorage.setItem('finanbolso_admin_subscribers_v1', JSON.stringify(subs));
          } catch {}
          const durationDays: 30 | 365 = subMatch.plan === 'Pro Mensal' ? 30 : 365;
          return {
            valid: true,
            durationDays,
            planName: durationDays === 365 ? 'Pro Anual (365 Dias)' : 'Pro Mensal (30 Dias)',
            activationId: subMatch.activationId,
            deviceId,
            message: `Chave de ativação de uso único validada com sucesso! Plano de ${durationDays} dias liberado.`,
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
      message: 'Código de ativação não encontrado ou inválido.',
    };
  },

  // Calculate remaining days from an expiration timestamp
  calculateRemainingDays(expiresAt: number): number {
    if (!expiresAt || expiresAt <= 0) return 0;
    const diffMs = expiresAt - Date.now();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  },

  // Create an active UserSubscription object bound to device (accumulating days if already Pro)
  async buildSubscription(durationDays: 30 | 365, activationId?: string): Promise<UserSubscription> {
    const days = durationDays === 30 ? 30 : 365;
    const now = Date.now();
    const id = activationId || await this.generateActivationId(days, 'Upgrade de Assinatura');
    const deviceId = StorageService.getDeviceId();

    const currentSub = StorageService.getSubscription();
    let baseExpiresAt = now;

    if (currentSub && currentSub.isPro && currentSub.expiresAt && currentSub.expiresAt > now) {
      // Accumulate new days on top of existing remaining expiration
      baseExpiresAt = currentSub.expiresAt;
    }

    const expiresAt = baseExpiresAt + days * 24 * 60 * 60 * 1000;

    return {
      isPro: true,
      planName: days === 30 ? 'Pro Mensal (30 Dias)' : 'Pro Anual (365 Dias)',
      planType: days === 30 ? 'monthly' : 'yearly',
      durationDays: (currentSub?.durationDays || 0) + days,
      activationId: id,
      deviceId,
      activatedAt: now,
      expiresAt,
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

  // Force registration of device presence and unique device ID for ADM management + sync server plan status
  async registerDevicePresence(subscription: UserSubscription): Promise<UserSubscription | null> {
    try {
      const devInfo = StorageService.getDeviceInfo();
      const deviceId = devInfo.deviceId;
      const currentUser = auth.currentUser;

      // 1. Check for User-Level Subscription first if logged in
      if (currentUser) {
        try {
          const userDoc: any = await FirestoreService.getUser(currentUser.uid);
          if (userDoc && userDoc.subscription && userDoc.subscription.isPro) {
            const userSub = userDoc.subscription;
            // Sync local with User-Level Pro
            if (!subscription.isPro || subscription.activationId !== userSub.activationId) {
              const updatedSub: UserSubscription = {
                ...userSub,
                deviceId,
              };
              StorageService.saveSubscription(updatedSub);
              // Also update device record to show it's Pro via User
              await FirestoreService.registerDevice(deviceId, {
                ...devInfo,
                userId: currentUser.uid,
                email: currentUser.email,
                plan: userSub.planName,
                status: 'Ativo',
                expiresAt: new Date(userSub.expiresAt).toISOString().slice(0, 10),
                activationId: userSub.activationId,
                durationDays: userSub.durationDays
              });
              return updatedSub;
            }
          }
        } catch (e) {
          console.error('Error fetching user subscription from Firestore:', e);
        }
      }

      // 2. Standard Device-Level logic
      const planName = subscription.isPro ? subscription.planName : 'Gratuito';
      const activationId = subscription.activationId || (subscription.isPro ? 'PRO-ACTIVE' : 'FREE-DEVICE');

      const userGoals = StorageService.getSavingsGoals();
      const userAssets = userGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);

      const entry = {
        id: deviceId,
        deviceId,
        name: `Aparelho ${devInfo.platform} (${deviceId.slice(-6)})`,
        email: currentUser?.email || `aparelho_${deviceId.toLowerCase().replace(/[^a-z0-9]/g, '')}@finanbolso.app`,
        plan: planName,
        durationDays: subscription.durationDays || (subscription.isPro ? 30 : 0),
        activationId,
        status: (subscription.isPro && (subscription.expiresAt || 0) > Date.now()) ? ('Ativo' as const) : ('Expirado' as const),
        expiresAt: subscription.expiresAt ? new Date(subscription.expiresAt).toISOString().slice(0, 10) : '2027-12-31',
        managedAssetsValue: userAssets,
        platform: devInfo.platform,
        resolution: devInfo.screenResolution,
        userId: currentUser?.uid || null,
      };

      // Post current presence to Firestore
      await FirestoreService.registerDevice(deviceId, entry);

      // Fetch server-recorded status from Firestore to check if ADM modified or revoked/renewed plan
      const deviceDoc: any = await FirestoreService.getDevice(deviceId);
      
      if (deviceDoc) {
        const isServerPro = deviceDoc.status === 'Ativo' && deviceDoc.plan !== 'Gratuito';
        
        // Case A: ADM revoked Pro (server says Free/Expired, local says Pro)
        if (!isServerPro && subscription.isPro) {
          const freeSub: UserSubscription = {
            isPro: false,
            planName: 'Plano Gratuito',
            durationDays: 0,
            expiresAt: 0,
            deviceId,
          };
          StorageService.saveSubscription(freeSub);
          return freeSub;
        }
        
        // Case B: ADM granted/renewed Pro (server says Pro, local says Free or different plan)
        if (isServerPro && (!subscription.isPro || subscription.activationId !== deviceDoc.activationId)) {
          const durationDays: 30 | 365 = deviceDoc.durationDays === 30 ? 30 : 365;
          const proSub: UserSubscription = {
            isPro: true,
            planName: deviceDoc.plan,
            planType: durationDays === 365 ? 'yearly' : 'monthly',
            durationDays,
            activationId: deviceDoc.activationId || 'PRO-ADM-GRANTED',
            deviceId,
            activatedAt: Date.now(),
            expiresAt: deviceDoc.expiresAt ? new Date(deviceDoc.expiresAt).getTime() : Date.now() + durationDays * 86400000,
          };
          StorageService.saveSubscription(proSub);
          return proSub;
        }
      }

      // Update local storage cache for offline fallback
      const saved = localStorage.getItem('finanbolso_admin_subscribers_v1');
      let subs: any[] = saved ? JSON.parse(saved) : [];
      const existingIdx = subs.findIndex((s: any) => s.deviceId === deviceId || s.id === deviceId);
      if (existingIdx >= 0) {
        subs[existingIdx] = { ...subs[existingIdx], ...entry };
      } else {
        subs.unshift(entry);
      }
      localStorage.setItem('finanbolso_admin_subscribers_v1', JSON.stringify(subs));
    } catch (err) {
      console.error('Error in registerDevicePresence:', err);
    }
    return null;
  }
};

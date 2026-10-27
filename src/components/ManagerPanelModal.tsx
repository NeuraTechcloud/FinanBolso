import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  ShieldAlert, 
  KeyRound, 
  Users, 
  Briefcase, 
  TrendingUp, 
  CheckCircle2, 
  X, 
  Plus, 
  Trash2, 
  RefreshCw,
  Award,
  DollarSign,
  Smartphone,
  Lock,
  Copy,
  Check,
  CreditCard,
  Sparkles,
  Fingerprint,
  Mail,
  Clock,
  UserCheck,
  Crown,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { PaymentIntegrationGuide } from './PaymentIntegrationGuide';
import { formatBRL, formatDateBR } from '../services/exportService';
import { UserSubscription } from '../types/finance';
import { ActivationService, isActivationKeyUsed } from '../services/activationService';
import { StorageService } from '../services/storage';
import { FirestoreService } from '../services/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { useFirebase } from '../contexts/FirebaseContext';

interface Subscriber {
  id: string;
  name: string;
  email: string;
  plan: 'Pro Mensal' | 'Pro Anual' | 'Enterprise' | 'Gratuito';
  durationDays?: 30 | 365 | 0;
  activationId?: string;
  status: 'Ativo' | 'Pendente' | 'Expirado';
  expiresAt: string;
  managedAssetsValue: number;
  deviceId?: string;
  platform?: string;
  userId?: string;
}

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  lastLogin: number;
  updatedAt: any;
  subscription?: {
    isPro: boolean;
    planName: string;
    durationDays: number;
    activationId: string;
    expiresAt: number;
  };
}

// SHA-256 Hash of fixed ADM Password "100393"
const ADM_PIN_HASH = 'e302f01fc645949ce070c2e17b4d1d7bab208349a8fda3cc5296e2ec0ef628d8';

async function hashSHA256(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface ManagerPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceProGlobal: (planName: string, durationDays: 30 | 365, activationId?: string) => void;
  onResetSubscriptionGlobal?: () => void;
  subscription: UserSubscription;
}

export const ManagerPanelModal: React.FC<ManagerPanelModalProps> = ({
  isOpen,
  onClose,
  onForceProGlobal,
  onResetSubscriptionGlobal,
  subscription,
}) => {
  const { user } = useFirebase();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Removed auto-authentication for security
  useEffect(() => {
    setIsAuthenticated(false);
  }, []);
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [activeTab, setActiveTab] = useState<'subscribers' | 'users' | 'keygen' | 'assets' | 'gateway'>('subscribers');
  
  // New subscriber form state
  const [newSubName, setNewSubName] = useState('');
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubPlan, setNewSubPlan] = useState<'Pro Mensal' | 'Pro Anual' | 'Enterprise' | 'Gratuito'>('Pro Mensal');
  const [newSubAssets, setNewSubAssets] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Key generator state
  const [generatedKeys, setGeneratedKeys] = useState<Array<{ id: string; key: string; duration: 30 | 365; createdAt: string; isUsed?: boolean; usedBy?: string | null; usedAt?: number | null }>>(() => {
    return ActivationService.getAuthorizedKeys().map((lk: any) => ({
      id: `key-local-${lk.key}`,
      key: lk.key,
      duration: lk.durationDays,
      createdAt: lk.label || `Chave ${lk.durationDays}d`,
      isUsed: lk.isUsed === true || lk.status === 'used' || !!lk.usedBy || !!lk.usedAt,
      usedBy: lk.usedBy || null,
      usedAt: lk.usedAt || null,
    }));
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Track keys deleted in this session so real-time snapshots don't revive them
  const deletedKeysRef = useRef<Set<string>>(new Set());

  // In-app deletion confirmation modal state (safe in iframe environments)
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'key' | 'user' | 'subscriber';
    id: string;
    title: string;
    description: string;
    payload?: any;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Firestore Real-time Subscriptions
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;

    // Immediately load local keys so there is never an empty state
    const currentLocal = ActivationService.getAuthorizedKeys();
    if (currentLocal.length > 0) {
      setGeneratedKeys(
        currentLocal
          .filter((lk: any) => lk && lk.key && !deletedKeysRef.current.has(lk.key.toUpperCase()))
          .map((lk: any) => ({
            id: `key-local-${lk.key}`,
            key: lk.key,
            duration: lk.durationDays,
            createdAt: lk.label || `Chave ${lk.durationDays}d`,
            isUsed: isActivationKeyUsed(lk),
            usedBy: lk.usedBy || null,
            usedAt: lk.usedAt || null,
          }))
      );
    }

    setIsSyncing(true);
    
    // Subscribe to Devices
    const unsubDevices = FirestoreService.subscribeDevices((devices) => {
      setSubscribers(devices as Subscriber[]);
      setIsSyncing(false);
      setLastSyncedAt(new Date().toLocaleTimeString());
    });

    // Subscribe to Activation Keys
    const unsubKeys = FirestoreService.subscribeActivationKeys((keys) => {
      const localKeys = ActivationService.getAuthorizedKeys();
      const keyMap = new Map<string, any>();

      // Load local cache keys
      localKeys.forEach((lk: any) => {
        if (lk && lk.key) {
          const upperKey = lk.key.toUpperCase();
          if (!deletedKeysRef.current.has(upperKey)) {
            keyMap.set(upperKey, {
              id: `key-local-${lk.key}`,
              key: lk.key,
              duration: lk.durationDays,
              createdAt: lk.label || `Chave ${lk.durationDays}d`,
              isUsed: isActivationKeyUsed(lk),
              usedBy: lk.usedBy || null,
              usedAt: lk.usedAt || null,
            });
          }
        }
      });

      // Override with live Firestore keys
      keys.forEach((k: any) => {
        if (k && k.key) {
          const upperKey = k.key.toUpperCase();
          if (!deletedKeysRef.current.has(upperKey)) {
            keyMap.set(upperKey, {
              id: `key-firestore-${k.key}`,
              key: k.key,
              duration: k.durationDays,
              createdAt: k.label || `Chave ${k.durationDays}d`,
              isUsed: isActivationKeyUsed(k),
              usedBy: k.usedBy || null,
              usedAt: k.usedAt || null,
            });
          }
        }
      });

      setGeneratedKeys(Array.from(keyMap.values()));
    });

    // Fetch Users
    const fetchUsers = async () => {
      try {
        const users = await FirestoreService.getAllUsers();
        setAppUsers(users as AppUser[]);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();

    return () => {
      unsubDevices();
      unsubKeys();
    };
  }, [isOpen, isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = pinInput.trim();
    if (!cleanInput) {
      setPinError(true);
      return;
    }

    const inputHash = await hashSHA256(cleanInput);

    if (inputHash === ADM_PIN_HASH || cleanInput === '100393') {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const showMsg = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleGenerateKey = async (durationDays: 30 | 365) => {
    try {
      const key = await ActivationService.generateActivationId(durationDays);
      
      // Instantly add to state so key appears immediately in the UI
      setGeneratedKeys(prev => [
        {
          id: `key-instant-${key}`,
          key,
          duration: durationDays,
          isUsed: false,
          createdAt: `Emitido pelo ADM (${durationDays}d)`,
          usedBy: null,
          usedAt: null
        },
        ...prev.filter(k => k.key.toUpperCase() !== key.toUpperCase())
      ]);

      try {
        await navigator.clipboard.writeText(key);
      } catch {}

      setCopiedKey(key);
      showMsg(`✓ Chave ${durationDays} dias gerada, copiada e salva com sucesso!`);
      setTimeout(() => setCopiedKey(null), 3000);
    } catch (error) {
      showMsg("Erro ao gerar chave no servidor.");
    }
  };

  const handleDeleteGeneratedKey = (keyToDelete: string) => {
    setPendingDelete({
      type: 'key',
      id: keyToDelete,
      title: 'Excluir Chave de Ativação',
      description: `Tem certeza que deseja excluir permanentemente a chave "${keyToDelete}"? Ela será removida do servidor e nenhum dispositivo poderá utilizá-la.`,
    });
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const durationDays: 30 | 365 = newSubPlan === 'Pro Mensal' ? 30 : 365;
    const activationId = await ActivationService.generateActivationId(durationDays, `Novo Cliente: ${newSubName}`);
    const expireTimestamp = Date.now() + 1000 * 60 * 60 * 24 * durationDays;

    const newSub: Subscriber = {
      id: `sub-${Date.now()}`,
      name: newSubName.trim(),
      email: newSubEmail.trim() || 'cliente@finanbolso.app',
      plan: newSubPlan,
      durationDays,
      activationId,
      status: newSubPlan === 'Gratuito' ? 'Expirado' : 'Ativo',
      expiresAt: new Date(expireTimestamp).toISOString().slice(0, 10),
      managedAssetsValue: parseFloat(newSubAssets) || 0.00,
    };

    // Save to Firestore
    await FirestoreService.registerDevice(newSub.id, newSub);

    setNewSubName('');
    setNewSubEmail('');
    setNewSubAssets('');
    showMsg(`Assinante ${newSub.name} cadastrado e salvo no servidor com ID ${activationId}!`);
  };

  const handleRevokePro = async (sub: Subscriber) => {
    const updatedSub: any = {
      ...sub,
      plan: 'Gratuito',
      status: 'Expirado',
      activationId: 'FREE-DEVICE',
      durationDays: 0,
    };

    await FirestoreService.registerDevice(sub.id, updatedSub);

    // If device is linked to a user, also revoke user-level pro
    if (sub.userId) {
       await FirestoreService.saveUserSubscription(sub.userId, {
         isPro: false,
         planName: 'Plano Gratuito',
         durationDays: 0,
         expiresAt: 0,
         activationId: 'REVOKED'
       });
    }

    const devInfo = StorageService.getDeviceInfo();
    if (sub.deviceId === devInfo.deviceId || sub.id === devInfo.deviceId) {
      onResetSubscriptionGlobal?.();
    }

    showMsg(`✓ Plano Pro do aparelho (${sub.name}) foi REVOGADO.`);
  };

  const handleRenewPro = async (sub: Subscriber, durationDays: 30 | 365) => {
    const newActivationId = await ActivationService.generateActivationId(durationDays, `Renovação de Assinatura: ${sub.name}`);
    const planTitle = durationDays === 30 ? 'Pro Mensal' : 'Pro Anual';
    const expiresTimestamp = Date.now() + durationDays * 24 * 60 * 60 * 1000;

    const updatedSub: Subscriber = {
      ...sub,
      plan: planTitle,
      status: 'Ativo',
      durationDays,
      activationId: newActivationId,
      expiresAt: new Date(expiresTimestamp).toISOString().slice(0, 10),
    };

    await FirestoreService.registerDevice(sub.id, updatedSub);

    // If linked to user, also update user-level
    if (sub.userId) {
      await FirestoreService.saveUserSubscription(sub.userId, {
        isPro: true,
        planName: planTitle,
        durationDays,
        activationId: newActivationId,
        expiresAt: expiresTimestamp
      });
    }

    const devInfo = StorageService.getDeviceInfo();
    if (sub.deviceId === devInfo.deviceId || sub.id === devInfo.deviceId) {
      onForceProGlobal(planTitle, durationDays, newActivationId);
    }

    showMsg(`✓ Plano ${planTitle} (${durationDays}d) ATIVADO/RENOVADO para ${sub.name}!`);
  };

  const handleGrantUserPro = async (u: AppUser, durationDays: 30 | 365) => {
    const newActivationId = await ActivationService.generateActivationId(durationDays, `Liberação Manual: ${u.displayName || u.email}`);
    const planTitle = durationDays === 30 ? 'Pro Mensal' : 'Pro Anual';
    const expiresTimestamp = Date.now() + durationDays * 24 * 60 * 60 * 1000;

    const userSub = {
      isPro: true,
      planName: planTitle,
      durationDays,
      activationId: newActivationId,
      expiresAt: expiresTimestamp
    };

    // 1. Save to User level
    await FirestoreService.saveUserSubscription(u.uid, userSub);

    // 2. Find and update all devices linked to this user for instant sync
    const userDevices = await FirestoreService.getDevicesByUserId(u.uid);
    for (const d of userDevices) {
      await FirestoreService.registerDevice(d.id, {
        ...d,
        plan: planTitle,
        status: 'Ativo',
        durationDays,
        activationId: newActivationId,
        expiresAt: new Date(expiresTimestamp).toISOString().slice(0, 10),
      });
    }

    showMsg(`✓ Usuário ${u.displayName || u.email} agora é PRO (${durationDays}d)!`);
    
    // Refresh user list locally
    setAppUsers(appUsers.map(user => user.uid === u.uid ? { ...user, subscription: userSub } : user));
  };

  const handleDeleteUser = (u: AppUser) => {
    setPendingDelete({
      type: 'user',
      id: u.uid,
      title: 'Excluir Conta de Usuário',
      description: `Deseja realmente excluir permanentemente a conta de "${u.displayName || u.email}"? Esta ação removerá o registro do Firestore e não pode ser desfeita.`,
      payload: u,
    });
  };

  const handleRevokeUserPro = async (u: AppUser) => {
    const userSub = {
      isPro: false,
      planName: 'Plano Gratuito',
      durationDays: 0,
      expiresAt: 0,
      activationId: 'REVOKED'
    };

    await FirestoreService.saveUserSubscription(u.uid, userSub);

    const userDevices = await FirestoreService.getDevicesByUserId(u.uid);
    for (const d of userDevices) {
      await FirestoreService.registerDevice(d.id, {
        ...d,
        plan: 'Gratuito',
        status: 'Expirado',
        durationDays: 0,
        activationId: 'REVOKED',
      });
    }

    showMsg(`✓ Plano Pro de ${u.displayName || u.email} revogado.`);
    setAppUsers(appUsers.map(user => user.uid === u.uid ? { ...user, subscription: userSub } : user));
  };

  const handleDeleteSubscriber = (id: string) => {
    setPendingDelete({
      type: 'subscriber',
      id,
      title: 'Excluir Registro de Dispositivo',
      description: `Deseja realmente excluir este registro de dispositivo (${id})?`,
    });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    const target = pendingDelete;
    try {
      if (target.type === 'key') {
        const cleanKey = target.id.trim().toUpperCase();
        deletedKeysRef.current.add(cleanKey);
        setGeneratedKeys(prev => prev.filter(k => k.key.toUpperCase() !== cleanKey));
        await ActivationService.deleteAuthorizedKey(cleanKey);
        showMsg(`✓ Chave ${cleanKey} excluída com sucesso.`);
      } else if (target.type === 'user') {
        const u = target.payload as AppUser;
        await FirestoreService.deleteUser(u.uid);
        setAppUsers(prev => prev.filter(user => user.uid !== u.uid));
        showMsg(`✓ Usuário ${u.displayName || u.email} excluído.`);
      } else if (target.type === 'subscriber') {
        await FirestoreService.deleteDevice(target.id);
        setSubscribers(prev => prev.filter(s => s.id !== target.id));
        showMsg('✓ Registro de dispositivo excluído.');
      }
    } catch (err) {
      console.error('Error during deletion:', err);
      showMsg('Erro ao excluir item.');
    } finally {
      setIsDeleting(false);
      setPendingDelete(null);
    }
  };

  // Calculate stats with useMemo for smooth performance
  const { totalSubscribersCount, activeProCount, totalAssetsUnderManagement, simulatedMRR } = useMemo(() => {
    const totalCount = subscribers.length;
    const proCount = subscribers.filter(s => s.status === 'Ativo' && s.plan !== 'Gratuito').length;
    const assets = subscribers.reduce((acc, s) => acc + (s.managedAssetsValue || 0), 0);
    const mrr = subscribers.reduce((acc, s) => {
      if (s.status !== 'Ativo') return acc;
      if (s.plan === 'Pro Mensal') return acc + 29.90;
      if (s.plan === 'Pro Anual') return acc + 199.90 / 12;
      if (s.plan === 'Enterprise') return acc + 99.90;
      return acc;
    }, 0);
    return {
      totalSubscribersCount: totalCount,
      activeProCount: proCount,
      totalAssetsUnderManagement: assets,
      simulatedMRR: mrr
    };
  }, [subscribers]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 gpu-layer">
          <motion.div 
            initial={{ scale: 0.97, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] gpu-layer"
          >
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Painel do Gestor
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {user?.displayName ? `Admin: ${user.displayName}` : 'Admin Master'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Gerenciamento em Tempo Real (Firestore)</span>
                {lastSyncedAt && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    • Live: {lastSyncedAt}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PIN Lock */}
        {!user ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-4 my-auto text-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Login de Administrador Requerido</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Para acessar o Painel ADM, faça login na sua conta de administrador do sistema.
              </p>
            </div>
            <button
              onClick={() => {
                onClose();
                (window as any)._openEmailAuthModal?.();
              }}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow transition active:scale-95"
            >
              Fazer Login ADM
            </button>
          </div>
        ) : user.email?.toLowerCase().trim() !== 'bodygmr30@gmail.com' ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-4 my-auto text-center max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/30">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Acesso Restrito ao Administrador</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sua conta atual não possui privilégios de acesso ao Painel ADM do sistema.
              </p>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-5 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <div className="text-center space-y-1 max-w-sm">
              <h3 className="text-base font-bold text-white">Autenticação do Gestor</h3>
              <p className="text-xs text-slate-400">
                Digite a senha do sistema para desbloquear o painel administrativo.
              </p>
            </div>
            <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3">
              <input
                type="password"
                placeholder="Senha do Sistema"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-center text-white text-sm font-mono tracking-widest focus:outline-none focus:border-emerald-500 transition"
              />
              {pinError && <p className="text-xs text-red-400 font-bold text-center">Senha do sistema incorreta.</p>}
              <button type="submit" className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg transition active:scale-95">
                Acessar Painel ADM
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Content */
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            {successToast && (
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successToast}</span>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Assinantes</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-lg font-extrabold text-white">{totalSubscribersCount}</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Pro Ativos</span>
                  <Award className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-lg font-extrabold text-white">{activeProCount}</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>MRR Est.</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-lg font-extrabold text-emerald-400">{formatBRL(simulatedMRR)}</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>AUM</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-base font-extrabold text-amber-300 truncate">{formatBRL(totalAssetsUnderManagement)}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-[10px]">
              <button onClick={() => setActiveTab('subscribers')} className={`flex-1 py-2 rounded-xl font-bold transition ${activeTab === 'subscribers' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>
                DISPOSITIVOS
              </button>
              <button onClick={() => setActiveTab('users')} className={`flex-1 py-2 rounded-xl font-bold transition ${activeTab === 'users' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>
                USUÁRIOS
              </button>
              <button onClick={() => setActiveTab('keygen')} className={`flex-1 py-2 rounded-xl font-bold transition ${activeTab === 'keygen' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>
                CHAVES
              </button>
              <button onClick={() => setActiveTab('gateway')} className={`flex-1 py-2 rounded-xl font-bold transition ${activeTab === 'gateway' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}`}>
                GATEWAY
              </button>
            </div>

            {/* Subscribers Tab */}
            {activeTab === 'subscribers' && (
              <div className="space-y-4">
                  {subscribers.length === 0 ? (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500 bg-slate-950/50 rounded-3xl border border-dashed border-slate-800">
                      <Smartphone className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-sm font-medium">Nenhum dispositivo encontrado.</p>
                      <p className="text-[10px]">Aguardando conexão de aparelhos...</p>
                    </div>
                  ) : (
                    subscribers.map((sub) => {
                      const isPro = sub.status === 'Ativo' && sub.plan !== 'Gratuito';
                      const isExpired = sub.status === 'Expirado' && sub.plan !== 'Gratuito';
                      
                      return (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={sub.id} 
                          className={`group p-4 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                            isPro 
                              ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 shadow-lg shadow-emerald-950/20' 
                              : isExpired 
                                ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/40' 
                                : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${
                                isPro ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                              }`}>
                                <Smartphone className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-bold text-white text-sm truncate group-hover:text-emerald-400 transition-colors">
                                  {sub.name || `Dispositivo ${sub.id.slice(-4)}`}
                                </h5>
                                <p className="text-[10px] text-slate-500 truncate font-mono">
                                  {sub.email || 'sem email vinculado'}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className={`px-2.5 py-1 rounded-full text-[9px] font-extrabold border transition-all ${
                                isPro 
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                                  : isExpired 
                                    ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}>
                                {isPro ? 'PRO ATIVO' : isExpired ? 'PRO EXPIRADO' : 'PLANO FREE'}
                              </div>
                              <span className="text-[8px] text-slate-600 font-mono tracking-tighter">ID: {sub.id}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                            <div className="bg-slate-900/80 backdrop-blur-sm p-2.5 rounded-2xl border border-slate-800/50">
                              <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5 tracking-wider">Plano Atual</span>
                              <div className="flex items-center gap-1.5">
                                {isPro ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-slate-600" />}
                                <span className={`text-[11px] font-bold ${isPro ? 'text-white' : 'text-slate-400'}`}>{sub.plan}</span>
                              </div>
                            </div>
                            <div className="bg-slate-900/80 backdrop-blur-sm p-2.5 rounded-2xl border border-slate-800/50">
                              <span className="text-[8px] text-slate-500 uppercase font-bold block mb-0.5 tracking-wider">Expiração</span>
                              <div className="flex items-center gap-1.5">
                                <KeyRound className="w-3 h-3 text-slate-500" />
                                <span className="text-[11px] text-slate-300 font-mono">{sub.expiresAt || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 relative z-10">
                            <button 
                              onClick={() => handleRenewPro(sub, 30)} 
                              className="flex-[2] py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-blue-900/20 transition active:scale-95"
                            >
                              Renovar 30d
                            </button>
                            <button 
                              onClick={() => handleRenewPro(sub, 365)} 
                              className="flex-[2] py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-emerald-900/20 transition active:scale-95"
                            >
                              Anual 365d
                            </button>
                            {isPro ? (
                              <button 
                                onClick={() => handleRevokePro(sub)} 
                                className="flex-1 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-xl text-[10px] font-bold transition"
                                title="Revogar Plano"
                              >
                                Bloquear
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleDeleteSubscriber(sub.id)} 
                                className="w-10 h-9 flex items-center justify-center bg-slate-800 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-slate-700 hover:border-red-500/30 rounded-xl transition"
                                title="Excluir Registro"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contas Registradas</h4>
                    <span className="text-[10px] font-bold text-emerald-400">{appUsers.length} Usuários</span>
                  </div>
                  <div className="divide-y divide-slate-800 max-h-[400px] overflow-y-auto mobile-scroll">
                    {appUsers.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs font-medium">
                        Nenhum usuário registrado no Firestore.
                      </div>
                    ) : (
                      appUsers.map((u) => {
                        const userPro = u.subscription?.isPro;
                        return (
                          <div key={u.uid} className="p-4 flex flex-col gap-4 hover:bg-slate-900/50 transition">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center border border-slate-700">
                                  {u.photoURL ? (
                                    <img src={u.photoURL} alt={u.displayName} className="w-full h-full rounded-2xl object-cover" />
                                  ) : (
                                    <UserCheck className="w-5 h-5 text-slate-500" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-xs font-bold text-white truncate flex items-center gap-2">
                                    {u.displayName || 'Usuário Sem Nome'}
                                    {userPro && <Crown className="w-3 h-3 text-amber-400" />}
                                  </h5>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Mail className="w-3 h-3 text-slate-500" />
                                    <span className="text-[10px] text-slate-400 truncate">{u.email}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-1">
                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold border ${
                                  userPro ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'
                                }`}>
                                  {userPro ? 'USUÁRIO PRO' : 'USUÁRIO FREE'}
                                </div>
                                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                  <Clock className="w-3 h-3" />
                                  <span>Log: {new Date(u.lastLogin).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleGrantUserPro(u, 30)}
                                className="flex-1 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-[10px] font-bold rounded-lg border border-blue-600/30 transition"
                              >
                                Ativar Plano 30d
                              </button>
                              <button 
                                onClick={() => handleGrantUserPro(u, 365)}
                                className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-[10px] font-bold rounded-lg border border-emerald-600/30 transition"
                              >
                                Ativar Plano 365d
                              </button>
                              {userPro && (
                                <button 
                                  onClick={() => handleRevokeUserPro(u)}
                                  className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-[10px] font-bold rounded-lg border border-red-600/30 transition"
                                >
                                  Revogar
                                </button>
                              )}
                              <button 
                                onClick={() => handleDeleteUser(u)}
                                className="px-3 py-1.5 bg-red-900/20 hover:bg-red-900/40 text-red-500 text-[10px] font-bold rounded-lg border border-red-900/30 transition"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Keygen Tab */}
            {activeTab === 'keygen' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                {/* Single-Use Security Notice */}
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/25 rounded-2xl flex items-start gap-2.5 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="text-white font-bold text-xs">Licenças com Bloqueio de Uso Único</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Todas as chaves geradas abaixo possuem trava de <strong>uso único</strong>. Uma vez ativadas, o sistema registra permanentemente no painel e impede qualquer reutilização futura.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleGenerateKey(30)}
                    className="flex flex-col items-center justify-center p-4 bg-blue-600/10 border border-blue-500/30 rounded-2xl hover:bg-blue-600/20 transition active:scale-95 group"
                  >
                    <Plus className="w-6 h-6 text-blue-400 mb-2 group-hover:scale-110 transition" />
                    <span className="text-xs font-bold text-white">Chave 30 Dias</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Pro Mensal (Uso Único)</span>
                  </button>
                  <button 
                    onClick={() => handleGenerateKey(365)}
                    className="flex flex-col items-center justify-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl hover:bg-emerald-500/20 transition active:scale-95 group"
                  >
                    <Plus className="w-6 h-6 text-emerald-400 mb-2 group-hover:scale-110 transition" />
                    <span className="text-xs font-bold text-white">Chave 365 Dias</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Pro Anual (Uso Único)</span>
                  </button>
                </div>

                <div className="bg-slate-950/50 rounded-2xl border border-slate-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chaves Registradas (Uso Único)</h4>
                    <span className="text-[10px] font-bold text-emerald-400">{generatedKeys.length} Licenças</span>
                  </div>
                  <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto mobile-scroll">
                    {generatedKeys.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs font-medium">
                        Nenhuma chave ativa disponível.
                      </div>
                    ) : (
                      generatedKeys.map((k) => {
                        const isUsed = !!k.isUsed;
                        return (
                          <div key={k.id} className="p-3.5 flex items-center justify-between hover:bg-slate-900/60 transition">
                            <div className="min-w-0 pr-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-xs font-mono font-bold tracking-wider ${isUsed ? 'text-slate-400 line-through' : 'text-white'}`}>
                                  {k.key}
                                </span>
                                <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full ${
                                  k.duration === 365 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                  {k.duration} DIAS
                                </span>
                                {isUsed ? (
                                  <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                    USO ÚNICO • UTILIZADA ({k.usedBy})
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    USO ÚNICO • DISPONÍVEL
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[9px] text-slate-500 mt-1">
                                <span>{k.createdAt}</span>
                                {k.usedAt && <span>• Ativada em: {new Date(k.usedAt).toLocaleString('pt-BR')}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(k.key);
                                  setCopiedKey(k.key);
                                  showMsg(`Chave ${k.key} copiada!`);
                                  setTimeout(() => setCopiedKey(null), 2000);
                                }}
                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                                title="Copiar"
                              >
                                {copiedKey === k.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button 
                                onClick={() => handleDeleteGeneratedKey(k.key)}
                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center transition"
                                title="Excluir Chave"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'gateway' && <PaymentIntegrationGuide />}
          </div>
        )}
      </motion.div>

      {/* In-app Deletion Confirmation Modal Dialog (100% iframe-safe, zero window.confirm blocking) */}
      <AnimatePresence>
        {pendingDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-6 h-6 stroke-[2]" />
              </div>

              <div className="text-center space-y-1.5">
                <h4 className="text-sm font-bold text-white">{pendingDelete.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed font-normal">
                  {pendingDelete.description}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setPendingDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs shadow-lg shadow-red-950/50 transition flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isDeleting ? 'Excluindo...' : 'Confirmar'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )}
  </AnimatePresence>
  );
};

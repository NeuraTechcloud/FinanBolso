import React, { useState, useEffect } from 'react';
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
  Fingerprint
} from 'lucide-react';
import { PaymentIntegrationGuide } from './PaymentIntegrationGuide';
import { formatBRL, formatDateBR } from '../services/exportService';
import { UserSubscription } from '../types/finance';
import { ActivationService } from '../services/activationService';
import { StorageService } from '../services/storage';
import { motion, AnimatePresence } from 'motion/react';

interface Subscriber {
  id: string;
  name: string;
  email: string;
  plan: 'Pro Mensal' | 'Pro Anual' | 'Enterprise' | 'Gratuito';
  durationDays?: 30 | 365;
  activationId?: string;
  status: 'Ativo' | 'Pendente' | 'Expirado';
  expiresAt: string;
  managedAssetsValue: number;
  deviceId?: string;
  platform?: string;
}

interface ManagerPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceProGlobal: (planName: string, durationDays: 30 | 365, activationId?: string) => void;
  onResetSubscriptionGlobal?: () => void;
  subscription: UserSubscription;
}

const INITIAL_SUBSCRIBERS: Subscriber[] = [];

export const ManagerPanelModal: React.FC<ManagerPanelModalProps> = ({
  isOpen,
  onClose,
  onForceProGlobal,
  onResetSubscriptionGlobal,
  subscription,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>(() => {
    try {
      const saved = localStorage.getItem('finanbolso_admin_subscribers_v1');
      const parsed = saved ? JSON.parse(saved) : [];
      if (!parsed || parsed.length === 0) {
        localStorage.setItem('finanbolso_admin_subscribers_v1', JSON.stringify(INITIAL_SUBSCRIBERS));
        return INITIAL_SUBSCRIBERS;
      }
      return parsed;
    } catch {
      return INITIAL_SUBSCRIBERS;
    }
  });

  const [activeTab, setActiveTab] = useState<'subscribers' | 'keygen' | 'assets' | 'gateway'>('subscribers');
  
  // New subscriber form state
  const [newSubName, setNewSubName] = useState('');
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubPlan, setNewSubPlan] = useState<'Pro Mensal' | 'Pro Anual' | 'Enterprise' | 'Gratuito'>('Pro Mensal');
  const [newSubAssets, setNewSubAssets] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Key generator state
  const [generatedKeys, setGeneratedKeys] = useState<Array<{ id: string; key: string; duration: 30 | 365; createdAt: string }>>(() => {
    return ActivationService.getAuthorizedKeys().map((k, i) => ({
      id: `key-${i}-${k.key}`,
      key: k.key,
      duration: k.durationDays,
      createdAt: k.label || `Chave ${k.durationDays}d`,
    }));
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('finanbolso_admin_subscribers_v1', JSON.stringify(subscribers));
    } catch {}
  }, [subscribers]);

  // Real-time server fetch function to ensure instant list sync
  const fetchAllSubscribers = async () => {
    setIsSyncing(true);
    let remoteSubs: any[] = [];
    try {
      const res = await fetch('/api/subscription/subscribers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          remoteSubs = data;
        }
      }
    } catch {}

    let localSubs: any[] = [];
    try {
      const saved = localStorage.getItem('finanbolso_admin_subscribers_v1');
      if (saved) {
        localSubs = JSON.parse(saved);
      }
    } catch {}

    const devInfo = StorageService.getDeviceInfo();
    const currentSub = StorageService.getSubscription();
    const userGoals = StorageService.getSavingsGoals();
    const userAssets = userGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);

    const currentEntry = {
      id: devInfo.deviceId,
      deviceId: devInfo.deviceId,
      name: `Aparelho ${devInfo.platform} (${devInfo.deviceId.slice(-6)})`,
      email: `aparelho_${devInfo.deviceId.toLowerCase().replace(/[^a-z0-9]/g, '')}@finanbolso.app`,
      plan: currentSub.isPro ? currentSub.planName : 'Gratuito',
      durationDays: currentSub.durationDays || (currentSub.isPro ? 30 : 0),
      activationId: currentSub.activationId || (currentSub.isPro ? 'PRO-ACTIVE' : 'FREE-DEVICE'),
      status: currentSub.isPro ? ('Ativo' as const) : ('Expirado' as const),
      expiresAt: currentSub.expiresAt ? new Date(currentSub.expiresAt).toISOString().slice(0, 10) : '2027-12-31',
      managedAssetsValue: userAssets,
      platform: devInfo.platform,
      resolution: devInfo.screenResolution,
    };

    const combinedMap = new Map<string, any>();
    [currentEntry, ...remoteSubs, ...localSubs].forEach(s => {
      const key = s.deviceId || s.id;
      if (key && !combinedMap.has(key)) {
        combinedMap.set(key, s);
      }
    });

    const finalSubs = Array.from(combinedMap.values());
    setSubscribers(finalSubs);
    try {
      localStorage.setItem('finanbolso_admin_subscribers_v1', JSON.stringify(finalSubs));
    } catch {}

    const nowTime = new Date().toLocaleTimeString();
    setLastSyncedAt(nowTime);
    setTimeout(() => setIsSyncing(false), 400);
  };

  // Real-time server polling mechanism every 4 seconds while modal is open & authenticated
  useEffect(() => {
    if (isOpen) {
      fetchAllSubscribers();
      if (isAuthenticated) {
        const intervalId = setInterval(() => {
          fetchAllSubscribers();
        }, 4000);
        return () => clearInterval(intervalId);
      }
    }
  }, [isOpen, isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '2026' || pinInput === 'admin' || pinInput === '0000') {
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

  const handleGenerateKey = (durationDays: 30 | 365) => {
    const key = ActivationService.generateActivationId(durationDays);
    const newEntry = {
      id: `gen-${Date.now()}`,
      key,
      duration: durationDays,
      createdAt: new Date().toLocaleTimeString(),
    };
    setGeneratedKeys([newEntry, ...generatedKeys]);
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    showMsg(`✓ Chave ${durationDays} dias gerada e copiada: ${key}`);
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const handleDeleteGeneratedKey = (keyToDelete: string) => {
    setGeneratedKeys(generatedKeys.filter(k => k.key !== keyToDelete));
    ActivationService.deleteAuthorizedKey(keyToDelete);
    showMsg(`✓ Chave ${keyToDelete} excluída com sucesso.`);
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const durationDays: 30 | 365 = newSubPlan === 'Pro Mensal' ? 30 : 365;
    const activationId = ActivationService.generateActivationId(durationDays);
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

    const updated = [newSub, ...subscribers];
    setSubscribers(updated);
    setNewSubName('');
    setNewSubEmail('');
    setNewSubAssets('');

    // Persist to server
    try {
      await fetch('/api/subscription/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSub),
      });
    } catch {}

    showMsg(`Assinante ${newSub.name} cadastrado e salvo no servidor com ID ${activationId}!`);
  };

  // Revoke Pro Plan for a specific subscriber device ID
  const handleRevokePro = async (sub: Subscriber) => {
    const updatedSub: Subscriber = {
      ...sub,
      plan: 'Gratuito',
      status: 'Expirado',
      activationId: 'FREE-DEVICE',
      durationDays: undefined,
    };

    const updatedList = subscribers.map(s => (s.id === sub.id || (sub.deviceId && s.deviceId === sub.deviceId)) ? updatedSub : s);
    setSubscribers(updatedList);

    // Save to server
    try {
      await fetch('/api/subscription/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSub),
      });
    } catch {}

    // If it's the current local device, update local app state
    const devInfo = StorageService.getDeviceInfo();
    if (sub.deviceId === devInfo.deviceId || sub.id === devInfo.deviceId) {
      onResetSubscriptionGlobal?.();
    }

    showMsg(`✓ Plano Pro do aparelho (${sub.name}) foi REVOGADO para Gratuito.`);
  };

  // Renew or Grant Pro Plan for 30d or 365d for a specific subscriber device ID
  const handleRenewPro = async (sub: Subscriber, durationDays: 30 | 365) => {
    const newActivationId = ActivationService.generateActivationId(durationDays, `Renovação ADM ${sub.name}`);
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

    const updatedList = subscribers.map(s => (s.id === sub.id || (sub.deviceId && s.deviceId === sub.deviceId)) ? updatedSub : s);
    setSubscribers(updatedList);

    // Save to server
    try {
      await fetch('/api/subscription/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSub),
      });
    } catch {}

    // If it's the current local device, update local app state
    const devInfo = StorageService.getDeviceInfo();
    if (sub.deviceId === devInfo.deviceId || sub.id === devInfo.deviceId) {
      onForceProGlobal(planTitle, durationDays, newActivationId);
    }

    showMsg(`✓ Plano ${planTitle} (${durationDays}d) ATIVADO/RENOVADO para ${sub.name}! ID: ${newActivationId}`);
  };

  const handleDeleteSubscriber = async (id: string) => {
    setSubscribers(subscribers.filter(sub => sub.id !== id && sub.deviceId !== id));

    // Delete from server
    try {
      await fetch(`/api/subscription/subscribers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch {}

    showMsg('Aparelho removido do servidor e do painel ADM.');
  };

  // Calculate stats
  const totalSubscribersCount = subscribers.length;
  const activeProCount = subscribers.filter(s => s.status === 'Ativo' && s.plan !== 'Gratuito').length;
  const totalAssetsUnderManagement = subscribers.reduce((acc, s) => acc + s.managedAssetsValue, 0);
  const simulatedMRR = subscribers.reduce((acc, s) => {
    if (s.status !== 'Ativo') return acc;
    if (s.plan === 'Pro Mensal') return acc + 29.90;
    if (s.plan === 'Pro Anual') return acc + 199.90 / 12;
    if (s.plan === 'Enterprise') return acc + 99.90;
    return acc;
  }, 0);

  const remainingDays = ActivationService.calculateRemainingDays(subscription.expiresAt);

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
                Painel do Gestor & Administração
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Admin Master
                </span>
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Gerenciamento de licenças 30d/365d, assinantes e ativos</span>
                {lastSyncedAt && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    • Sync: {lastSyncedAt}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAllSubscribers}
              disabled={isSyncing}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-[11px] rounded-xl border border-slate-700 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
              title="Forçar Re-leitura e Sincronização com o Servidor"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Not authenticated state (PIN Lock) */}
        {!isAuthenticated ? (
          <div className="p-8 flex flex-col items-center justify-center space-y-5 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-lg">
              <Lock className="w-8 h-8" />
            </div>
            <div className="text-center space-y-1 max-w-sm">
              <h3 className="text-base font-bold text-white">Área Restrita do Gestor</h3>
              <p className="text-xs text-slate-400">
                Insira a senha de acesso administrativo para gerenciar os planos, assinantes e chaves do sistema.
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3">
              <input
                type="password"
                placeholder="Digite a Senha de Acesso"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-center text-white text-sm font-mono tracking-widest focus:outline-none focus:border-emerald-500 transition"
              />
              {pinError && (
                <p className="text-xs text-red-400 text-center font-semibold">Senha incorreta. Acesso negado.</p>
              )}
              <button
                type="submit"
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-2xl shadow-lg shadow-emerald-500/20 transition active:scale-95"
              >
                Acessar Painel Gestor
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Content */
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
            
            {/* Success Toast */}
            {successToast && (
              <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successToast}</span>
              </div>
            )}

            {/* Manager KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Assinantes</span>
                  <Users className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-lg font-extrabold text-white">{totalSubscribersCount}</div>
                <div className="text-[10px] text-emerald-400 font-medium">Cadastrados</div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Planos Pro Ativos</span>
                  <Award className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-lg font-extrabold text-white">{activeProCount}</div>
                <div className="text-[10px] text-blue-400 font-medium">Licenças ativas</div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>MRR Estimado</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-lg font-extrabold text-emerald-400">{formatBRL(simulatedMRR)}</div>
                <div className="text-[10px] text-slate-400 font-medium">Receita mensal</div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span>Ativos (AUM)</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-base font-extrabold text-amber-300 truncate">{formatBRL(totalAssetsUnderManagement)}</div>
                <div className="text-[10px] text-slate-400 font-medium">Sob custódia</div>
              </div>
            </div>

            {/* Device Pro License Quick Activation (30d and 365d) */}
            {/* Device Pro License & Hardware Identification (30d and 365d) */}
            <div className="p-4 bg-slate-950/90 border border-emerald-500/30 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs flex items-center gap-2">
                      <span>Status do Aparelho Atual:</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        subscription.isPro 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {subscription.isPro ? `Pro Ativo (${subscription.planName})` : 'Plano Gratuito'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {subscription.isPro ? (
                        <span>
                          {remainingDays} dias restantes • Licença:{' '}
                          <strong className="text-emerald-400 font-mono">{subscription.activationId || 'N/A'}</strong>
                        </span>
                      ) : (
                        'Nenhuma licença Pro vinculada a este aparelho.'
                      )}
                    </div>
                  </div>
                </div>

                {/* Instant Buttons to activate 30 days, 365 days, or revoke Pro */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const id = ActivationService.generateActivationId(30);
                      onForceProGlobal('Pro Mensal (Admin Master)', 30, id);
                      showMsg(`✓ Licença Pro de 30 Dias ativada com ID: ${id}`);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition active:scale-95 flex items-center gap-1.5 shadow"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Ativar 30d</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const id = ActivationService.generateActivationId(365);
                      onForceProGlobal('Pro Anual (Admin Master)', 365, id);
                      showMsg(`✓ Licença Pro de 365 Dias ativada com ID: ${id}`);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition active:scale-95 shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Ativar 365d</span>
                  </button>

                  {subscription.isPro && (
                    <button
                      type="button"
                      onClick={() => {
                        onResetSubscriptionGlobal?.();
                        showMsg('✓ Plano Pro revogado. Este aparelho voltou ao Gratuito.');
                      }}
                      className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold rounded-xl text-xs transition active:scale-95 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                      <span>Revogar Pro</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Hardware Device Identification Sub-Box */}
              {(() => {
                const devInfo = StorageService.getDeviceInfo();
                const activeDevId = subscription.deviceId || devInfo.deviceId;
                return (
                  <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                        <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                        ID Único deste Aparelho (Hardware):
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Identificado & Registrado
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                      <span className="font-mono text-emerald-400 text-xs font-bold tracking-wider select-all">
                        {activeDevId}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeDevId);
                          showMsg('✓ ID do aparelho copiado para a área de transferência!');
                        }}
                        className="text-[11px] text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 flex items-center gap-1 transition"
                      >
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copiar</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span>Plataforma: <strong className="text-slate-300">{devInfo.platform}</strong></span>
                      <span>Resolução: <strong className="text-slate-300">{devInfo.screenResolution}</strong></span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('subscribers')}
                className={`flex-1 py-2 px-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'subscribers' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Assinantes</span>
              </button>
              <button
                onClick={() => setActiveTab('keygen')}
                className={`flex-1 py-2 px-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'keygen' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Gerador de IDs (30d/365d)</span>
              </button>
              <button
                onClick={() => setActiveTab('assets')}
                className={`flex-1 py-2 px-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'assets' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Ativos (AUM)</span>
              </button>
              <button
                onClick={() => setActiveTab('gateway')}
                className={`flex-1 py-2 px-2.5 rounded-xl font-semibold transition flex items-center justify-center gap-1.5 ${
                  activeTab === 'gateway' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Guia Gateway</span>
              </button>
            </div>

            {/* Tab 1: Subscribers & Plans */}
            {activeTab === 'subscribers' && (
              <div className="space-y-4">
                
                {/* Add Subscriber Form */}
                <form onSubmit={handleAddSubscriber} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    Adicionar Novo Assinante / Cliente
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Nome completo"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      required
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="email"
                      placeholder="E-mail de contato"
                      value={newSubEmail}
                      onChange={(e) => setNewSubEmail(e.target.value)}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <select
                      value={newSubPlan}
                      onChange={(e: any) => setNewSubPlan(e.target.value)}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Pro Mensal">Plano Pro Mensal (30 Dias)</option>
                      <option value="Pro Anual">Plano Pro Anual (365 Dias)</option>
                      <option value="Enterprise">Plano Enterprise</option>
                      <option value="Gratuito">Plano Gratuito</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Valor dos Ativos (R$) ex: 50000"
                      value={newSubAssets}
                      onChange={(e) => setNewSubAssets(e.target.value)}
                      className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Assinante e Emitir ID</span>
                  </button>
                </form>

                {/* Subscribers List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Lista de Assinantes Cadastrados ({subscribers.length})
                    </h4>
                    {subscribers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubscribers([]);
                          localStorage.removeItem('finanbolso_admin_subscribers_v1');
                          localStorage.removeItem('finanbolso_authorized_keys_v1');
                          showMsg('✓ Todos os registros e chaves Pro foram limpos com sucesso.');
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2.5 py-1 rounded-lg transition font-semibold"
                      >
                        Limpar / Zerar Lista
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {subscribers.map((sub) => {
                      const isPro = sub.status === 'Ativo' && sub.plan !== 'Gratuito';
                      return (
                        <div
                          key={sub.id}
                          className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 relative overflow-hidden ${
                            isPro 
                              ? 'bg-slate-950/90 border-emerald-500/30 hover:border-emerald-500/50 shadow-lg shadow-emerald-950/20' 
                              : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {/* Background Glow for Active Pro Devices */}
                          {isPro && (
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                          )}

                          {/* Card Header: Device Info & Status Badge */}
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                  isPro ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                                }`}>
                                  <Smartphone className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <h5 className="font-bold text-white text-xs truncate flex items-center gap-1.5">
                                    <span>{sub.name}</span>
                                  </h5>
                                  <p className="text-[10px] text-slate-400 truncate">{sub.email}</p>
                                </div>
                              </div>

                              {/* Glowing Status Badge (Ativo / Expirado) */}
                              <div className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 shrink-0 border ${
                                isPro 
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-sm' 
                                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isPro ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                <span>{isPro ? 'Pro Ativo' : 'Gratuito / Expirado'}</span>
                              </div>
                            </div>

                            {/* Sub Details Grid */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                              <div className="bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block">Plano Atual</span>
                                <span className={`font-semibold ${isPro ? 'text-emerald-400' : 'text-slate-300'}`}>
                                  {sub.plan}
                                </span>
                              </div>

                              <div className="bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-slate-800/80">
                                <span className="text-[9px] uppercase font-bold text-slate-500 block">Validade</span>
                                <span className="text-slate-300 font-mono text-[10px]">
                                  {sub.expiresAt || 'Indeterminada'}
                                </span>
                              </div>
                            </div>

                            {/* Hardware Device ID & Activation License ID */}
                            <div className="space-y-1">
                              {sub.deviceId && (
                                <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
                                  <span className="text-slate-500 font-sans">Aparelho:</span>
                                  <span className="text-emerald-300 font-bold select-all truncate ml-2">{sub.deviceId}</span>
                                </div>
                              )}

                              {sub.activationId && (
                                <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
                                  <span className="text-slate-500 font-sans">Licença:</span>
                                  <span className="text-slate-200 select-all truncate ml-2">{sub.activationId}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Action Buttons Row */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 flex-1">
                              {/* Fast Renew +30 Days */}
                              <button
                                type="button"
                                onClick={() => handleRenewPro(sub, 30)}
                                title="Ativar ou Renovar Plano Pro Mensal (30 Dias)"
                                className="flex-1 py-1.5 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/40 text-blue-300 rounded-xl text-[11px] font-bold transition active:scale-95 flex items-center justify-center gap-1"
                              >
                                <Award className="w-3.5 h-3.5 text-blue-400" />
                                <span>+30d</span>
                              </button>

                              {/* Fast Renew +365 Days */}
                              <button
                                type="button"
                                onClick={() => handleRenewPro(sub, 365)}
                                title="Ativar ou Renovar Plano Pro Anual (365 Dias)"
                                className="flex-1 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 rounded-xl text-[11px] font-bold transition active:scale-95 flex items-center justify-center gap-1 shadow-sm"
                              >
                                <Award className="w-3.5 h-3.5 text-emerald-400" />
                                <span>+365d</span>
                              </button>

                              {/* Fast Revoke / Lock Pro */}
                              {isPro && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokePro(sub)}
                                  title="Bloquear/Revogar Plano Pro e Voltar ao Gratuito"
                                  className="py-1.5 px-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 rounded-xl text-[11px] font-bold transition active:scale-95 flex items-center justify-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5 text-red-400" />
                                  <span>Bloquear</span>
                                </button>
                              )}
                            </div>

                            {/* Delete device entry */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSubscriber(sub.id)}
                              title="Excluir Aparelho do Banco do Servidor"
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* Tab: Key Generator (30d and 365d) */}
            {activeTab === 'keygen' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Gerador de Chaves / IDs de Ativação
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Gere códigos únicos de ativação de 30 dias ou 365 dias para fornecer aos clientes ou testar no app.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleGenerateKey(30)}
                      className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Gerar ID 30 Dias</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGenerateKey(365)}
                      className="p-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-emerald-500/20"
                    >
                      <KeyRound className="w-4 h-4" />
                      <span>Gerar ID 365 Dias</span>
                    </button>
                  </div>
                </div>

                {/* List of generated keys */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Chaves Emitidas Recentemente ({generatedKeys.length})
                  </h4>

                  <div className="space-y-2">
                    {generatedKeys.map((k) => (
                      <div
                        key={k.id}
                        className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-white flex items-center gap-2">
                            <span>{k.key}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-bold ${
                              k.duration === 365 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-blue-500/20 text-blue-300'
                            }`}>
                              {k.duration} dias
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500">Emitido: {k.createdAt}</div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(k.key);
                              setCopiedKey(k.key);
                              showMsg(`Chave ${k.key} copiada!`);
                              setTimeout(() => setCopiedKey(null), 2500);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 active:scale-95"
                          >
                            {copiedKey === k.key ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteGeneratedKey(k.key)}
                            title="Excluir Chave Não Utilizada"
                            className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Asset Management (AUM) */}
            {activeTab === 'assets' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-300 space-y-2">
                  <h4 className="font-bold text-emerald-300 text-sm flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-400" />
                    Gestão Consolidada de Ativos dos Clientes (AUM)
                  </h4>
                  <p className="text-slate-400 leading-relaxed">
                    Como gestor, você possui visão consolidada de todos os ativos sob gestão dos assinantes do FinanBolso. 
                    Você pode acompanhar o volume financeiro total alocado por carteira e status de rentabilidade.
                  </p>
                </div>

                <div className="space-y-2">
                  {subscribers.map((sub) => (
                    <div
                      key={`asset-${sub.id}`}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-white">{sub.name}</div>
                        <div className="text-[11px] text-slate-400">Plano: <span className="text-emerald-400">{sub.plan}</span></div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-extrabold text-amber-400">{formatBRL(sub.managedAssetsValue)}</div>
                        <div className="text-[10px] text-slate-400">Ativos Custodiados</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Total Geral Sob Gestão</span>
                  <span className="text-base font-extrabold text-emerald-400">{formatBRL(totalAssetsUnderManagement)}</span>
                </div>
              </div>
            )}

            {/* Tab 4: Gateway Technical Integration Guide */}
            {activeTab === 'gateway' && <PaymentIntegrationGuide />}

          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">FinanBolso Gestor Core v2.5</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition"
          >
            Fechar Painel
          </button>
        </div>
      </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

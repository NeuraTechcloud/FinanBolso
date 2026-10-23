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
  Lock
} from 'lucide-react';
import { PaymentIntegrationGuide } from './PaymentIntegrationGuide';
import { CreditCard } from 'lucide-react';
import { formatBRL } from '../services/exportService';

interface Subscriber {
  id: string;
  name: string;
  email: string;
  plan: 'Pro Mensal' | 'Pro Anual' | 'Enterprise' | 'Gratuito';
  status: 'Ativo' | 'Pendente' | 'Expirado';
  expiresAt: string;
  managedAssetsValue: number;
}

interface ManagerPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onForceProGlobal: (planName: string) => void;
  currentIsPro: boolean;
  currentPlanName: string;
}

const INITIAL_SUBSCRIBERS: Subscriber[] = [
  { id: 'sub-1', name: 'Carlos Eduardo (Você - Gestor)', email: 'carlos@finanbolso.app', plan: 'Pro Anual', status: 'Ativo', expiresAt: '2027-12-31', managedAssetsValue: 142500.00 },
  { id: 'sub-2', name: 'Mariana Souza', email: 'mariana.souza@gmail.com', plan: 'Pro Mensal', status: 'Ativo', expiresAt: '2026-05-15', managedAssetsValue: 48900.00 },
  { id: 'sub-3', name: 'Roberto Alcantara', email: 'roberto.invest@outlook.com', plan: 'Enterprise', status: 'Ativo', expiresAt: '2027-01-10', managedAssetsValue: 850000.00 },
  { id: 'sub-4', name: 'Juliana Mendes', email: 'ju.mendes@yahoo.com.br', plan: 'Gratuito', status: 'Expirado', expiresAt: '2026-01-01', managedAssetsValue: 12400.00 },
];

export const ManagerPanelModal: React.FC<ManagerPanelModalProps> = ({
  isOpen,
  onClose,
  onForceProGlobal,
  currentIsPro,
  currentPlanName,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>(() => {
    try {
      const saved = localStorage.getItem('finanbolso_admin_subscribers_v1');
      return saved ? JSON.parse(saved) : INITIAL_SUBSCRIBERS;
    } catch {
      return INITIAL_SUBSCRIBERS;
    }
  });

  const [activeTab, setActiveTab] = useState<'subscribers' | 'assets' | 'gateway'>('subscribers');
  
  // New subscriber form state
  const [newSubName, setNewSubName] = useState('');
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubPlan, setNewSubPlan] = useState<'Pro Mensal' | 'Pro Anual' | 'Enterprise' | 'Gratuito'>('Pro Mensal');
  const [newSubAssets, setNewSubAssets] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('finanbolso_admin_subscribers_v1', JSON.stringify(subscribers));
    } catch {}
  }, [subscribers]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Default manager PIN is 2026 or admin
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

  const handleAddSubscriber = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;

    const newSub: Subscriber = {
      id: `sub-${Date.now()}`,
      name: newSubName.trim(),
      email: newSubEmail.trim() || 'cliente@finanbolso.app',
      plan: newSubPlan,
      status: newSubPlan === 'Gratuito' ? 'Expirado' : 'Ativo',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10),
      managedAssetsValue: parseFloat(newSubAssets) || 15000.00,
    };

    const updated = [newSub, ...subscribers];
    setSubscribers(updated);
    setNewSubName('');
    setNewSubEmail('');
    setNewSubAssets('');
    showMsg(`Assinante ${newSub.name} cadastrado com sucesso!`);
  };

  const handleToggleStatus = (id: string) => {
    setSubscribers(subscribers.map(sub => {
      if (sub.id === id) {
        const nextStatus = sub.status === 'Ativo' ? 'Expirado' : 'Ativo';
        return { ...sub, status: nextStatus };
      }
      return sub;
    }));
    showMsg('Status do assinante atualizado.');
  };

  const handleDeleteSubscriber = (id: string) => {
    setSubscribers(subscribers.filter(sub => sub.id !== id));
    showMsg('Assinante removido do painel.');
  };

  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        
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
              <p className="text-xs text-slate-400">Gerenciamento de planos ativos, assinaturas e ativos sob custódia</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
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
                Insira a senha de acesso administrativo para gerenciar os planos, assinantes e ativos do sistema. (Dica: digite <span className="text-emerald-400 font-mono font-bold">2026</span>)
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full max-w-xs space-y-3">
              <input
                type="password"
                placeholder="Senha PIN (ex: 2026)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-center text-white text-sm font-mono tracking-widest focus:outline-none focus:border-emerald-500 transition"
              />
              {pinError && (
                <p className="text-xs text-red-400 text-center font-semibold">Senha incorreta. Tente 2026.</p>
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

            {/* Quick Master License Action for this Device */}
            <div className="p-3.5 bg-slate-950/90 border border-emerald-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span>Licença deste Aparelho:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      currentIsPro 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {currentIsPro ? `Pro Ativo (${currentPlanName})` : 'Plano Gratuito'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Ative ou renove os recursos Pro instantaneamente com permissão Master</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onForceProGlobal('Pro Anual (Admin Master)');
                    showMsg('Licença Pro Anual Master ativada neste dispositivo!');
                  }}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition active:scale-95 shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{currentIsPro ? 'Renovar Pro Master (1 Ano)' : 'Ativar Pro Neste Aparelho'}</span>
                </button>
              </div>
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
                <span>Guia Gateway Pix</span>
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
                      <option value="Pro Mensal">Plano Pro Mensal (R$ 29,90/mês)</option>
                      <option value="Pro Anual">Plano Pro Anual (R$ 199,90/ano)</option>
                      <option value="Enterprise">Plano Enterprise (R$ 99,90/mês)</option>
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
                    <span>Cadastrar e Ativar Licença</span>
                  </button>
                </form>

                {/* Subscribers List */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Lista de Assinantes Cadastrados ({subscribers.length})
                  </h4>

                  <div className="space-y-2">
                    {subscribers.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{sub.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'Ativo' 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {sub.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-3">
                            <span>{sub.email}</span>
                            <span className="text-emerald-400 font-semibold">• {sub.plan}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleStatus(sub.id)}
                            title="Alternar Status"
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubscriber(sub.id)}
                            title="Excluir"
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
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

            {/* Tab 2: Asset Management (AUM) */}
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

            {/* Tab 3: Gateway Technical Integration Guide */}
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

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ShieldCheck, Crown, Lock, Percent, AlertTriangle, Zap, CheckCircle2 } from 'lucide-react';
import { Transaction, Category } from '../types/finance';
import { formatBRL } from '../services/exportService';

interface DebtQuittancePlannerProps {
  transactions: Transaction[];
  categories: Category[];
  isPro: boolean;
  onOpenSubscription: () => void;
}

export const DebtQuittancePlanner: React.FC<DebtQuittancePlannerProps> = ({
  transactions,
  categories,
  isPro,
  onOpenSubscription,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'steps' | 'rates'>('overview');

  // If not Pro, show locked card
  if (!isPro) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 p-5 shadow-xl">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Crown className="w-20 h-20 text-amber-400" />
        </div>
        <div className="flex items-start gap-3.5 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Planejador de Quitação por Etapas (Pro)</h4>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                PRO VIP
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Vincula automaticamente seus lançamentos e faturas de cartões, organizando por prioridades com cálculo detalhado do subvalor real e do valor final com juros da taxa institucional.
            </p>
            <button
              onClick={onOpenSubscription}
              className="mt-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 active:scale-95"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Desbloquear Planejador com Clube Pro</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Automatic Income Calculation from actual transactions
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  // Helper to detect bank and interest rate automatically
  const analyzeDebtItem = (t: Transaction) => {
    const descLower = t.description.toLowerCase();
    let bankName = 'Banco Geral';
    let interestRate = 5.0; // default base rate (%)
    let isPriority1 = t.paymentMethod === 'credit_card' || descLower.includes('banco') || descLower.includes('fatura') || descLower.includes('cartão') || descLower.includes('empréstimo');

    if (descLower.includes('nubank') || descLower.includes('nu')) {
      bankName = 'Nubank';
      interestRate = 15.0;
    } else if (descLower.includes('itaú') || descLower.includes('itau') || descLower.includes('linx')) {
      bankName = 'Itaú';
      interestRate = 9.5;
    } else if (descLower.includes('pan') || descLower.includes('banco pan')) {
      bankName = 'Banco PAN';
      interestRate = 9.0;
    } else if (descLower.includes('jeitto')) {
      bankName = 'Jeitto';
      interestRate = 27.6;
    } else if (t.paymentMethod === 'credit_card') {
      bankName = 'Cartão de Crédito';
      interestRate = 12.0;
    }

    const finalAmountWithRate = t.amount * (1 + interestRate / 100);

    return {
      id: t.id,
      name: t.description,
      amount: t.amount,
      priority: (isPriority1 ? 1 : 2) as 1 | 2,
      bankName,
      interestRate,
      finalAmountWithRate,
      date: t.date,
    };
  };

  const allLinkedDebts = transactions
    .filter(t => t.type === 'expense')
    .map(analyzeDebtItem);

  const priority1Debts = allLinkedDebts.filter(d => d.priority === 1);
  const priority2Debts = allLinkedDebts.filter(d => d.priority === 2);

  const totalPriority1Sub = priority1Debts.reduce((acc, d) => acc + d.amount, 0);
  const totalPriority1Final = priority1Debts.reduce((acc, d) => acc + d.finalAmountWithRate, 0);

  const totalPriority2 = priority2Debts.reduce((acc, d) => acc + d.amount, 0);
  const totalGeral = totalPriority1Final + totalPriority2;

  const leftoverAfterPriority1 = Math.max(0, totalIncome - totalPriority1Final);
  const deficitPriority2 = Math.max(0, totalPriority2 - leftoverAfterPriority1);

  return (
    <div className="rounded-3xl bg-slate-900 border border-emerald-500/30 p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Planejador de Quitação Automática</h3>
            <p className="text-[10px] text-emerald-400 font-medium">Subvalor real & Valor final com juros</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
          <Crown className="w-3.5 h-3.5 text-amber-400" /> Pro Ativo
        </span>
      </div>

      {/* Navigation sub-tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 rounded-xl font-semibold transition ${activeTab === 'overview' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Resumo Vinculado
        </button>
        <button
          onClick={() => setActiveTab('steps')}
          className={`py-2 rounded-xl font-semibold transition ${activeTab === 'steps' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Etapas IA
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`py-2 rounded-xl font-semibold transition ${activeTab === 'rates' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Taxas Bancárias
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-3 animate-in fade-in">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Renda Total Calculada</p>
              <p className="text-base font-extrabold text-emerald-400">{formatBRL(totalIncome)}</p>
            </div>
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-semibold">Total com Juros</p>
              <p className="text-base font-extrabold text-red-400">{formatBRL(totalGeral)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Priority 1 Card */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span>🔴 PRIORIDADE 1 (Bancos/Cartões)</span>
                <span>{formatBRL(totalPriority1Final)}</span>
              </div>
              {priority1Debts.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-2">Nenhum lançamento de cartão ou banco identificado. Adicione despesas com cartão.</p>
              ) : (
                <div className="space-y-1 divide-y divide-slate-800/60 text-[11px] max-h-36 overflow-y-auto no-scrollbar">
                  {priority1Debts.map((d) => (
                    <div key={d.id} className="pt-1.5 flex justify-between items-center text-slate-300">
                      <div>
                        <span className="font-semibold text-white">{d.name}</span>
                        <div className="text-[9px] text-amber-400">{d.bankName} • Taxa: {d.interestRate}% a.m.</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-white">{formatBRL(d.finalAmountWithRate)}</div>
                        <div className="text-[9px] text-slate-400">Sub: {formatBRL(d.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority 2 Card */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                <span>🔵 PRIORIDADE 2 (Contas Essenciais)</span>
                <span>{formatBRL(totalPriority2)}</span>
              </div>
              {priority2Debts.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-2">Nenhuma conta essencial identificada.</p>
              ) : (
                <div className="space-y-1 divide-y divide-slate-800/60 text-[11px] max-h-36 overflow-y-auto no-scrollbar">
                  {priority2Debts.map((d) => (
                    <div key={d.id} className="pt-1.5 flex justify-between items-center text-slate-300">
                      <div>
                        <span className="font-semibold text-white">{d.name}</span>
                        <div className="text-[9px] text-slate-400">{d.bankName}</div>
                      </div>
                      <span className="font-bold text-white">{formatBRL(d.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Steps */}
      {activeTab === 'steps' && (
        <div className="space-y-3 animate-in text-xs fade-in">
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">1</div>
              <span>Etapa 1: Quitar Prioridade 1 (Bancos & Cartões c/ Juros)</span>
            </div>
            <p className="text-slate-300 pl-7 leading-relaxed">
              Utilizando sua renda total de <strong className="text-white">{formatBRL(totalIncome)}</strong> para quitar os bancos ({formatBRL(totalPriority1Final)} com juros inclusos).
            </p>
            <div className="ml-7 p-2 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-300 font-bold">
              Restará após Etapa 1: {formatBRL(leftoverAfterPriority1)}
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-blue-400">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">2</div>
              <span>Etapa 2: Aplicar nas Contas (Prioridade 2)</span>
            </div>
            <p className="text-slate-300 pl-7 leading-relaxed">
              Total de contas: <strong className="text-white">{formatBRL(totalPriority2)}</strong>. Menos o restante ({formatBRL(leftoverAfterPriority1)}):
            </p>
            <div className={`ml-7 p-2 rounded-xl border font-bold flex items-center gap-1.5 ${deficitPriority2 > 0 ? 'bg-red-950/40 border-red-500/30 text-red-300' : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'}`}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{deficitPriority2 > 0 ? `Faltará para quitar Contas: ${formatBRL(deficitPriority2)}` : 'Sua renda cobre integralmente todas as contas!'}</span>
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-r from-emerald-950/50 to-teal-950/50 rounded-2xl border border-emerald-500/40 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-extrabold">✓</div>
              <span>Cálculo de Juros Automático</span>
            </div>
            <p className="text-slate-200 pl-7 leading-relaxed">
              Cada débito exibe o subvalor real e o valor final já calculado com a taxa de juros institucional correspondente.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Rates */}
      {activeTab === 'rates' && (
        <div className="space-y-3 animate-in text-xs fade-in">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { name: 'Banco PAN', rate: '9.0%', color: 'border-blue-500/45 text-blue-400' },
              { name: 'Itaú', rate: '9.5%', color: 'border-amber-500/45 text-amber-400' },
              { name: 'Nubank', rate: '15.0%', color: 'border-purple-500/45 text-purple-400' },
              { name: 'Jeitto', rate: '27.6%', color: 'border-red-500/45 text-red-400' },
            ].map((r, i) => (
              <div key={i} className={`p-3 bg-slate-950 rounded-2xl border ${r.color} text-center space-y-1`}>
                <p className="font-bold text-white">{r.name}</p>
                <p className="text-sm font-extrabold">{r.rate} a.m.</p>
                <p className="text-[9px] text-slate-400">Taxa Aplicada</p>
              </div>
            ))}
          </div>

          <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-slate-300">
            <p className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Percent className="w-4 h-4" /> Transparência nos Custos:
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O sistema multiplica automaticamente o subvalor real pela taxa de juros do banco detectado, exibindo o montante exato que será cobrado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { TrendingUp, Crown, Calendar, Lock, Info } from 'lucide-react';
import { Transaction } from '../types/finance';
import { formatBRL } from '../services/exportService';

interface CashFlowProjectionProps {
  transactions: Transaction[];
  isPro: boolean;
  onOpenSubscription: () => void;
}

export const CashFlowProjection: React.FC<CashFlowProjectionProps> = ({
  transactions,
  isPro,
  onOpenSubscription,
}) => {
  // If not Pro, show locked card
  if (!isPro) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Projeção de Fluxo de Caixa (6 Meses)</h4>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <Lock className="w-3 h-3" /> PRO
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Simule seus saldos futuros com base no seu histórico real de receitas e despesas.
        </p>
        <button
          onClick={onOpenSubscription}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-amber-500/30 transition flex items-center justify-center gap-1.5"
        >
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Liberar Projeções com Clube Pro</span>
        </button>
      </div>
    );
  }

  // Calculate actual history
  const totalInc = transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const totalExp = transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0);
  const currentNet = totalInc - totalExp;

  // Determine distinct months count in transactions
  const uniqueMonths = new Set(transactions.map(t => t.date.slice(0, 7)));
  const monthsCount = Math.max(1, uniqueMonths.size);
  const avgMonthlyNet = transactions.length > 0 ? currentNet / monthsCount : 0;

  const now = new Date();
  const projections = [];
  let runningBalance = currentNet;

  for (let i = 1; i <= 6; i++) {
    const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = futureDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
    runningBalance += avgMonthlyNet;
    projections.push({ label, projectedBalance: runningBalance });
  }

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Projeção de Fluxo de Caixa</h4>
            <p className="text-[10px] text-slate-400">Previsão baseada no seu histórico real ({monthsCount} {monthsCount === 1 ? 'mês' : 'meses'})</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
          Ativo Pro
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-1">
          <Info className="w-4 h-4 text-blue-400 mx-auto" />
          <p className="text-xs text-slate-300 font-medium">Nenhum dado lançado ainda</p>
          <p className="text-[10px] text-slate-500">Adicione suas receitas e despesas para gerar projeções financeiras reais.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {projections.map((p, idx) => (
            <div key={idx} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                <span>{p.label}</span>
              </div>
              <div className={`text-xs font-bold ${p.projectedBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatBRL(p.projectedBalance)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { Sparkles, Crown, Zap, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Transaction, Category } from '../types/finance';
import { formatBRL } from '../services/exportService';

interface AISmartAdvisorProps {
  transactions: Transaction[];
  categories: Category[];
  isPro: boolean;
  onOpenSubscription: () => void;
}

export const AISmartAdvisor: React.FC<AISmartAdvisorProps> = ({
  transactions,
  categories,
  isPro,
  onOpenSubscription,
}) => {
  // If not Pro, show gated locked card
  if (!isPro) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 p-4 shadow-lg">
        <div className="absolute top-0 right-0 p-3 opacity-15">
          <Crown className="w-16 h-16 text-amber-400" />
        </div>
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">IA Financeira (Assistente Pro)</h4>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                PRO VIP
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Desbloqueie análises automáticas inteligentes dos seus hábitos de consumo reais e dicas personalizadas para otimizar sua saúde financeira.
            </p>
            <button
              onClick={onOpenSubscription}
              className="mt-2 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition active:scale-95 flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Desbloquear com Clube Pro</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If Pro is active, analyze actual transactions
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

  let advice = '';
  let adviceType: 'success' | 'warning' | 'danger' | 'info' = 'success';

  if (transactions.length === 0) {
    advice = 'Olá! Sou sua Inteligência Financeira. Ainda não há lançamentos neste período. Adicione receitas e despesas para eu calcular sua taxa de poupança e dar orientações personalizadas.';
    adviceType = 'info';
  } else if (totalIncome === 0 && totalExpense > 0) {
    advice = 'Alerta de Receita: Você possui apenas despesas registradas neste período sem nenhuma receita informada. Cadastre seus ganhos para equilibrar o fluxo.';
    adviceType = 'danger';
  } else if (totalExpense > totalIncome) {
    advice = `Atenção Crítica: Suas despesas (${formatBRL(totalExpense)}) superaram suas receitas (${formatBRL(totalIncome)}) em ${formatBRL(totalExpense - totalIncome)}. Evite novos parcelamentos e revise gastos em categorias de lazer e alimentação fora de casa.`;
    adviceType = 'danger';
  } else if (savingsRate < 10 && totalIncome > 0) {
    advice = `Alerta de Saúde Financeira: Sua taxa de poupança atual é de ${savingsRate.toFixed(1)}% (abaixo da meta recomendada de 20%). Tente reter pelo menos 10% a 20% de sua renda líquida para sua reserva de emergência.`;
    adviceType = 'warning';
  } else if (savingsRate >= 30) {
    advice = `Excelente Gestão! Você está poupando ${savingsRate.toFixed(1)}% da sua renda neste período (${formatBRL(totalIncome - totalExpense)} guardados). Considere direcionar o excedente para investimentos de longo prazo ou acelerar metas de curto prazo.`;
    adviceType = 'success';
  } else {
    advice = `Bom Trabalho! Suas contas estão equilibradas com taxa de poupança de ${savingsRate.toFixed(1)}%. Continue monitorando seus vencimentos para manter a estabilidade.`;
    adviceType = 'success';
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 p-4 shadow-lg space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Assistente IA FinanBolso</h4>
        </div>
        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Ativo
        </span>
      </div>

      <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
        adviceType === 'danger'
          ? 'bg-red-950/30 border-red-500/40 text-red-200'
          : adviceType === 'warning'
          ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
          : adviceType === 'info'
          ? 'bg-blue-950/30 border-blue-500/40 text-blue-200'
          : 'bg-slate-950/60 border-slate-800 text-slate-200'
      }`}>
        {adviceType === 'danger' ? (
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        ) : adviceType === 'warning' ? (
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        ) : (
          <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        )}
        <span>{advice}</span>
      </div>
    </div>
  );
};

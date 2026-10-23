import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Crown, 
  Zap, 
  CheckCircle2, 
  Lightbulb, 
  RefreshCw, 
  Lock,
  DollarSign
} from 'lucide-react';
import { Transaction, Category } from '../types/finance';
import { formatBRL } from '../services/exportService';

interface AIFinancialTip {
  title: string;
  category: string;
  description: string;
  estimatedMonthlySavings: number;
  impact: 'Alto' | 'Médio' | 'Baixo';
}

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
  const [loading, setLoading] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [tips, setTips] = useState<AIFinancialTip[]>([]);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Calculate totals
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);

  const fetchAITips = async () => {
    if (!isPro) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/financial-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomeTotal: totalIncome,
          expenseTotal: totalExpense,
          monthTransactions: transactions,
          categories,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSummaryText(data.summaryText);
        setTips(data.tips || []);
        setHasGenerated(true);
      } else {
        console.error('AI Tips API Error:', data.error || 'Unknown error', data.details || '');
        // If it's a specific AI failure but we have rule-engine fallback on server,
        // it shouldn't reach here unless both failed or server crashed.
      }
    } catch (err) {
      console.error('Network error fetching AI tips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPro && !hasGenerated) {
      fetchAITips();
    }
  }, [isPro, transactions.length]);

  // If NOT Pro, show gated locked VIP feature teaser card
  if (!isPro) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 p-5 shadow-xl">
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-md">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Dicas Financeiras com IA</h3>
                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1 shadow">
                  <Crown className="w-2.5 h-2.5" /> PRO VIP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Análise inteligente mensal de padrões de gastos</p>
            </div>
          </div>

          <div className="p-2 rounded-xl bg-slate-950 border border-amber-500/30 text-amber-400">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Sua inteligência artificial analisa seus lançamentos do mês, identifica gargalos invisíveis de orçamento e sugere formas exatas de economizar dinheiro todos os meses.
        </p>

        {/* Mock Preview Card */}
        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 mb-4 opacity-75 blur-[0.3px] select-none">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Sugestão de Economia Detectada
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Economize +R$ 180,00/mês
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Identificamos que 32% dos seus gastos foram concentrados em pequenos pedidos recorrentes no final de semana...
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenSubscription}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg shadow-amber-500/20 transition active:scale-95 flex items-center justify-center gap-2"
        >
          <Crown className="w-4 h-4" />
          <span>Desbloquear Dicas com IA no Plano Pro</span>
        </button>
      </div>
    );
  }

  // Calculate total possible monthly savings
  const totalPotentialSavings = tips.reduce((sum, t) => sum + (t.estimatedMonthlySavings || 0), 0);

  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-md">
            <Sparkles className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Dicas Financeiras com IA</h3>
              <span className="text-[9px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Ativo
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Sugestões personalizadas de economia para este mês</p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAITips}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50"
          title="Reanalisar com IA"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-300 font-semibold">Analisando seus padrões de gastos com Gemini IA...</p>
        </div>
      ) : (
        <>
          {/* AI Summary Card */}
          {summaryText && (
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/20 text-xs text-slate-200 flex items-start gap-2.5 leading-relaxed">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">{summaryText}</span>
                {totalPotentialSavings > 0 && (
                  <span className="block mt-1 font-extrabold text-emerald-400">
                    Potencial de Economia Total: +{formatBRL(totalPotentialSavings)}/mês
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tips List */}
          <div className="space-y-3">
            {tips.map((tip, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/40 transition space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">{tip.title}</h4>
                      <span className="text-[10px] text-slate-400">{tip.category}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 inline-block">
                      +{formatBRL(tip.estimatedMonthlySavings)}/mês
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-9">
                  {tip.description}
                </p>

                <div className="pt-1.5 pl-9 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">
                    Impacto Estimado:{' '}
                    <strong className={tip.impact === 'Alto' ? 'text-emerald-400' : 'text-amber-400'}>
                      {tip.impact}
                    </strong>
                  </span>
                  <span className="text-slate-500">IA FinanBolso Pro</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

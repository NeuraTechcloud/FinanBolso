import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  Crown, 
  Zap, 
  CheckCircle2, 
  Lightbulb, 
  RefreshCw, 
  Lock,
  ArrowRight
} from 'lucide-react';
import { Transaction, Category } from '../types/finance';
import { formatBRL } from '../services/exportService';
import { generateFinancialTips, FinancialTip } from '../services/financialTipsService';

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
  const [customTips, setCustomTips] = useState<FinancialTip[] | null>(null);
  const [customSummary, setCustomSummary] = useState<string | null>(null);

  // Compute local intelligent tips instantly
  const localAnalysis = useMemo(() => {
    return generateFinancialTips(transactions, categories);
  }, [transactions, categories]);

  // Active tips and summary text (defaults to client-side analysis immediately)
  const tips = customTips ?? localAnalysis.tips;
  const summaryText = customSummary ?? localAnalysis.summaryText;

  // Total possible savings calculated from current tips
  const totalPotentialSavings = useMemo(() => {
    return tips.reduce((sum, t) => sum + (t.estimatedMonthlySavings || 0), 0);
  }, [tips]);

  const refreshTips = useCallback(async () => {
    setLoading(true);
    try {
      // Attempt backend API call if running on local/fullstack environment
      const res = await fetch('/api/ai/financial-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incomeTotal: transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
          expenseTotal: transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
          monthTransactions: transactions,
          categories,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.tips) && data.tips.length > 0) {
          setCustomSummary(data.summaryText);
          setCustomTips(data.tips);
          return;
        }
      }
    } catch {
      // Graceful fallback for static deployments (Vercel) and offline mode:
      // The local rule-based analysis is already active and will update!
    } finally {
      // Re-evaluate client analysis with fresh timing
      const fresh = generateFinancialTips(transactions, categories);
      setCustomSummary(fresh.summaryText);
      setCustomTips(fresh.tips);
      setLoading(false);
    }
  }, [transactions, categories]);

  useEffect(() => {
    // When transactions change, recalculate tips
    const fresh = generateFinancialTips(transactions, categories);
    setCustomSummary(fresh.summaryText);
    setCustomTips(fresh.tips);
  }, [transactions.length, categories.length]);

  if (!isPro) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-md">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Dicas Financeiras Inteligentes (IA)
                </h3>
                <span className="text-[9px] font-extrabold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 shadow">
                  <Crown className="w-2.5 h-2.5" /> PRO VIP
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Análise automatizada de corte de gastos e oportunidades de economia
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/20 text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white">Recurso Exclusivo do Clube Pro</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              Ative o Clube Pro para desbloquear dicas de inteligência artificial personalizadas para os seus gastos mensais.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSubscription}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-lg transition active:scale-95 inline-flex items-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Desbloquear com Clube Pro</span>
          </button>
        </div>
      </div>
    );
  }

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
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Dicas Financeiras Inteligentes
              </h3>
              <span className="text-[9px] font-extrabold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 shadow">
                <Crown className="w-2.5 h-2.5" /> PRO VIP
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sugestões personalizadas de economia para este mês
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshTips}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50"
          title="Atualizar Dicas"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-6 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-300 font-semibold">Analisando seus padrões de gastos...</p>
        </div>
      ) : (
        <>
          {/* Summary Card */}
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
                  <span className="text-slate-500">FinanBolso Inteligente</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

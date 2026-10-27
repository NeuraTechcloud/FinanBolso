import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Sparkles, 
  Crown, 
  Zap, 
  Lightbulb, 
  RefreshCw, 
  Lock,
  ChevronLeft,
  ChevronRight
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
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [refreshSeed, setRefreshSeed] = useState(0);

  // Compute local intelligent tips instantly
  const localAnalysis = useMemo(() => {
    return generateFinancialTips(transactions, categories, undefined, refreshSeed);
  }, [transactions, categories, refreshSeed]);

  const tips = customTips || localAnalysis.tips;
  const summaryText = customSummary || localAnalysis.summaryText;

  const totalPotentialSavings = useMemo(() => {
    return tips.reduce((sum, t) => sum + (t.estimatedMonthlySavings || 0), 0);
  }, [tips]);

  const refreshTips = useCallback(async () => {
    setLoading(true);
    const nextSeed = refreshSeed + 1;
    setRefreshSeed(nextSeed);
    setCustomTips(null);
    setCustomSummary(null);

    try {
      const res = await fetch('/api/ai/financial-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          setCurrentTipIndex(0);
          return;
        }
      }
    } catch {
      // Fallback to local rule-based analysis
    } finally {
      const fresh = generateFinancialTips(transactions, categories, undefined, nextSeed);
      setCustomSummary(fresh.summaryText);
      setCustomTips(fresh.tips);
      setCurrentTipIndex(0);
      setLoading(false);
    }
  }, [transactions, categories, refreshSeed]);

  useEffect(() => {
    const fresh = generateFinancialTips(transactions, categories);
    setCustomSummary(fresh.summaryText);
    setCustomTips(fresh.tips);
    setCurrentTipIndex(0);
  }, [transactions.length, categories.length]);

  if (!isPro) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border border-amber-500/30 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-md">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Estratégia Analítica de Capital AI
                </h3>
                <span className="text-[9px] font-extrabold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 shadow">
                  <Crown className="w-2.5 h-2.5" /> PLANO PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Análise automatizada de corte de gastos e oportunidades de economia
              </p>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/20 text-center space-y-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-white">Recurso Exclusivo do Plano Pro</h4>
            <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              Ative o Plano Pro para desbloquear insights de inteligência artificial personalizados baseados no seu fluxo de caixa.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSubscription}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-xs shadow-lg transition active:scale-95 inline-flex items-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Ativar Plano Pro</span>
          </button>
        </div>
      </div>
    );
  }

  const safeIndex = tips.length > 0 ? (currentTipIndex % tips.length + tips.length) % tips.length : 0;
  const currentTip = tips.length > 0 ? tips[safeIndex] : null;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-emerald-500/30 p-4 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-md">
            <Sparkles className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Estratégia Analítica de Capital AI
              </h3>
              <span className="text-[9px] font-extrabold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 shadow">
                <Crown className="w-2.5 h-2.5" /> PLANO PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
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
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-300 font-semibold">Analisando padrões de gastos...</p>
        </div>
      ) : (
        <>
          {/* Summary Banner */}
          {summaryText && (
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/20 text-[11px] text-slate-200 flex items-start gap-2 leading-relaxed">
              <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">{summaryText}</span>
                {totalPotentialSavings > 0 && (
                  <span className="block mt-0.5 font-extrabold text-emerald-400 text-xs">
                    Potencial de Economia Total: +{formatBRL(totalPotentialSavings)}/mês
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Compact Single Tip Carousel Card */}
          {currentTip && (
            <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-2.5 shadow-lg relative overflow-hidden">
              {/* Tip Header */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                    <Lightbulb className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-xs truncate">
                      {currentTip.title}
                    </h4>
                    <span className="text-[10px] font-medium text-slate-400 block truncate">
                      {currentTip.category}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                  +{formatBRL(currentTip.estimatedMonthlySavings)}/mês
                </span>
              </div>

              {/* Tip Description */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentTip.description}
              </p>

              {/* Navigation Bar & Button */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Impacto:{' '}
                    <strong className={currentTip.impact === 'Alto' ? 'text-emerald-400' : 'text-amber-400'}>
                      {currentTip.impact}
                    </strong>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                    Análise {safeIndex + 1} de {tips.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentTipIndex((prev) => (prev - 1 + tips.length) % tips.length)}
                    className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
                    title="Insight Anterior"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentTipIndex((prev) => (prev + 1) % tips.length)}
                    className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 font-extrabold text-[11px] flex items-center gap-1 transition active:scale-95 shadow"
                    title="Próximo Insight"
                  >
                    <span>Próximo Insight</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

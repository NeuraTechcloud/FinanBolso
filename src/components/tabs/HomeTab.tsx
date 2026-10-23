import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart as PieChartIcon, 
  FileSpreadsheet, 
  ChevronRight, 
  Plus, 
  Wallet,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Zap
} from 'lucide-react';
import { Transaction, Category, PAYMENT_METHOD_LABELS, DEFAULT_QUICK_PRESETS, QuickPreset } from '../../types/finance';
import { formatBRL, formatDateBR } from '../../services/exportService';

interface HomeTabProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: string;
  onOpenAddModal: (prefillType?: 'expense' | 'income') => void;
  onSelectTransaction: (tx: Transaction) => void;
  onGoToTab: (tab: any) => void;
  onLoadDemoData: () => void;
  onQuickAddPreset: (preset: QuickPreset) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  transactions,
  categories,
  selectedMonth,
  onOpenAddModal,
  onSelectTransaction,
  onGoToTab,
  onLoadDemoData,
  onQuickAddPreset,
}) => {
  // Memoized month transactions
  const monthTransactions = useMemo(() => {
    return selectedMonth === 'all'
      ? transactions
      : transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Current month totals memoized
  const { incomeTotal, expenseTotal, netBalance, savingsRate } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (let i = 0; i < monthTransactions.length; i++) {
      const t = monthTransactions[i];
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    }
    const net = inc - exp;
    const rate = inc > 0 ? Math.max(0, ((inc - exp) / inc) * 100) : 0;
    return { incomeTotal: inc, expenseTotal: exp, netBalance: net, savingsRate: rate };
  }, [monthTransactions]);

  // Calculate total monthly budget configured on expense categories
  const { totalBudgetLimit, budgetUsagePercent } = useMemo(() => {
    const limit = categories
      .filter(c => c.type === 'expense' && c.monthlyBudget)
      .reduce((acc, c) => acc + (c.monthlyBudget || 0), 0);
    const usage = limit > 0 ? Math.min(100, Math.round((expenseTotal / limit) * 100)) : 0;
    return { totalBudgetLimit: limit, budgetUsagePercent: usage };
  }, [categories, expenseTotal]);

  // Top spending categories in current month
  const sortedCategories = useMemo(() => {
    const expenseByCategory: Record<string, { total: number; count: number; color: string }> = {};
    for (let i = 0; i < monthTransactions.length; i++) {
      const t = monthTransactions[i];
      if (t.type === 'expense') {
        if (!expenseByCategory[t.category]) {
          const cat = categories.find(c => c.name === t.category);
          expenseByCategory[t.category] = { 
            total: 0, 
            count: 0, 
            color: cat ? cat.color : '#f59e0b' 
          };
        }
        expenseByCategory[t.category].total += t.amount;
        expenseByCategory[t.category].count += 1;
      }
    }
    return Object.entries(expenseByCategory)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 4);
  }, [monthTransactions, categories]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return [...monthTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [monthTransactions]);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in">
      {/* Main Account Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-5 shadow-xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Wallet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Saldo Líquido do Período</span>
          </div>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60">
            {incomeTotal > 0 ? `${savingsRate.toFixed(0)}% Economizado` : 'Sem lançamentos'}
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-4">
          <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${netBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
            {formatBRL(netBalance)}
          </span>
        </div>

        {/* Income & Expense Split Badges */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
          <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Receitas</p>
              <p className="text-sm font-bold text-emerald-400 truncate">{formatBRL(incomeTotal)}</p>
            </div>
          </div>

          <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/60 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Despesas</p>
              <p className="text-sm font-bold text-red-400 truncate">{formatBRL(expenseTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => onOpenAddModal('expense')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-red-500/40 transition active:scale-95 group text-center"
        >
          <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
            <TrendingDown className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Despesa</span>
        </button>

        <button
          onClick={() => onOpenAddModal('income')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition active:scale-95 group text-center"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
            <TrendingUp className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Receita</span>
        </button>

        <button
          onClick={() => onGoToTab('charts')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 transition active:scale-95 group text-center"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
            <PieChartIcon className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Gráficos</span>
        </button>

        <button
          onClick={() => onGoToTab('export')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 transition active:scale-95 group text-center"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Exportar</span>
        </button>
      </div>

      {/* ⚡ One-Tap Fast Presets Carousel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Lançamento Instantâneo (1 Toque)
          </span>
          <span className="text-[10px] text-slate-400">Toque para preencher e salvar</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {DEFAULT_QUICK_PRESETS.slice(0, 6).map((preset) => (
            <button
              key={preset.id}
              onClick={() => onQuickAddPreset(preset)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/80 text-xs text-slate-200 transition whitespace-nowrap active:scale-95 shrink-0"
            >
              <span className="font-medium">{preset.title}</span>
              {preset.defaultAmount && (
                <span className={`text-[11px] font-bold ${preset.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatBRL(preset.defaultAmount)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State / Welcome Guide (Clean data banner) */}
      {transactions.length === 0 && (
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-5 text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Base Limpa & Pronta para Teste!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mt-1">
              Todos os dados fictícios foram removidos. Adicione seus lançamentos reais ou use o botão de demonstração para testar relatórios e gráficos.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              onClick={() => onOpenAddModal('expense')}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Meu Primeiro Gasto</span>
            </button>

            <button
              onClick={onLoadDemoData}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition"
              title="Preenche o app com exemplos de teste"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span>Carregar Dados de Demonstração</span>
            </button>
          </div>
        </div>
      )}

      {/* Budget Limit Progress Bar */}
      {totalBudgetLimit > 0 && expenseTotal > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Teto de Gastos Planejado
            </span>
            <span className="font-medium text-slate-400">
              {formatBRL(expenseTotal)} / {formatBRL(totalBudgetLimit)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                expenseTotal > totalBudgetLimit 
                  ? 'bg-red-500' 
                  : budgetUsagePercent > 80 
                    ? 'bg-amber-400' 
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (expenseTotal / totalBudgetLimit) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className={`${expenseTotal > totalBudgetLimit ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
              {expenseTotal > totalBudgetLimit 
                ? `Excedido em ${formatBRL(expenseTotal - totalBudgetLimit)}`
                : `Resta gastar: ${formatBRL(totalBudgetLimit - expenseTotal)}`
              }
            </span>
            <button
              onClick={() => onGoToTab('goals')}
              className="text-emerald-400 hover:underline flex items-center gap-0.5"
            >
              Ajustar Tetos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Top Spending Categories Preview */}
      {sortedCategories.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Maiores Gastos do Mês
            </h3>
            <button 
              onClick={() => onGoToTab('charts')}
              className="text-xs text-emerald-400 font-medium hover:underline flex items-center gap-1"
            >
              Ver Gráficos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {sortedCategories.map(([catName, stats]) => {
              const pct = expenseTotal > 0 ? ((stats.total / expenseTotal) * 100).toFixed(0) : '0';
              return (
                <div key={catName} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stats.color }} />
                      {catName}
                    </span>
                    <div className="text-right">
                      <span className="font-semibold text-white">{formatBRL(stats.total)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300"
                      style={{ 
                        width: `${pct}%`,
                        backgroundColor: stats.color 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions list */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Últimos Lançamentos
          </h3>
          {recentTransactions.length > 0 && (
            <button 
              onClick={() => onGoToTab('transactions')}
              className="text-xs text-emerald-400 font-medium hover:underline flex items-center gap-1"
            >
              Ver Extrato Completo <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentTransactions.length === 0 ? (
          <div className="py-6 text-center text-slate-400">
            <p className="text-xs">Nenhum lançamento registrado neste período.</p>
            <p className="text-[11px] text-slate-500 mt-1">Toque em qualquer botão de lançamento acima para começar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const cat = categories.find(c => c.name === tx.category);

              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/40 rounded-xl px-2 -mx-2 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {isIncome ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{tx.description}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span 
                          className="w-1.5 h-1.5 rounded-full inline-block"
                          style={{ backgroundColor: cat ? cat.color : '#94a3b8' }}
                        />
                        <span className="truncate">{tx.category}</span>
                        <span>•</span>
                        <span>{formatDateBR(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isIncome ? '+ ' : '- '}{formatBRL(tx.amount)}
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {PAYMENT_METHOD_LABELS[tx.paymentMethod]?.label || tx.paymentMethod}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

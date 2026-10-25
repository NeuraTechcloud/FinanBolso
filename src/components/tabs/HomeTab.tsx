import React, { useMemo, memo } from 'react';
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
  CheckCircle2,
  Zap,
  Utensils,
  CreditCard
} from 'lucide-react';
import { Transaction, Category, PAYMENT_METHOD_LABELS, DEFAULT_QUICK_PRESETS, QuickPreset } from '../../types/finance';
import { formatBRL, formatDateBR } from '../../services/exportService';
import { useMonthTransactions } from '../../hooks/useMonthTransactions';
import { AISmartAdvisor } from '../AISmartAdvisor';
import { DebtQuittancePlanner } from '../DebtQuittancePlanner';
import { DueBillsAlertBanner } from '../DueBillsAlertBanner';
import { NetWorthCard } from '../NetWorthCard';
import { useNetWorth } from '../../hooks/useNetWorth';
import { SavingsGoal, Reminder } from '../../types/finance';

// Helper to identify if a transaction is a Ticket / Benefit voucher (VR/VA)
const isTicketTx = (t: Transaction) => {
  return t.paymentMethod === 'ticket' || 
         t.category.toLowerCase().includes('ticket') || 
         t.category.toLowerCase().includes('vr') || 
         t.category.toLowerCase().includes('va');
};

interface HomeTabProps {
  transactions: Transaction[];
  categories: Category[];
  savingsGoals: SavingsGoal[];
  reminders: Reminder[];
  selectedMonth: string;
  isPro: boolean;
  onOpenSubscription: () => void;
  onOpenAddModal: (prefillType?: 'expense' | 'income') => void;
  onSelectTransaction: (tx: Transaction) => void;
  onGoToTab: (tab: any) => void;
  onQuickAddPreset: (preset: QuickPreset) => void;
  onTogglePaid?: (id: string) => void;
  onNavigateToTransactions?: (view?: 'all' | 'future') => void;
}

interface RecentTxRowProps {
  tx: Transaction;
  categoryColor: string;
  onSelect: (tx: Transaction) => void;
}

const MemoizedRecentTxRow = memo<RecentTxRowProps>(({ tx, categoryColor, onSelect }) => {
  const isIncome = tx.type === 'income';

  return (
    <div
      onClick={() => onSelect(tx)}
      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/40 rounded-xl px-2 -mx-2 transition cursor-pointer gpu-layer"
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
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{tx.description}</p>
            {tx.installmentsTotal && tx.installmentsTotal > 1 ? (
              <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                {tx.installmentNumber}/{tx.installmentsTotal}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span 
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ backgroundColor: categoryColor }}
            />
            <span className="truncate">{tx.category}</span>
            <span>•</span>
            <span>{formatDateBR(tx.date)}</span>
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-xs font-bold tabular-nums ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
          {isIncome ? '+ ' : '- '}{formatBRL(tx.amount)}
        </p>
        <span className="text-[10px] text-slate-500">
          {PAYMENT_METHOD_LABELS[tx.paymentMethod]?.label || tx.paymentMethod}
        </span>
      </div>
    </div>
  );
});

MemoizedRecentTxRow.displayName = 'MemoizedRecentTxRow';

export const HomeTab: React.FC<HomeTabProps> = memo(({
  transactions,
  categories,
  savingsGoals,
  reminders,
  selectedMonth,
  isPro,
  onOpenSubscription,
  onOpenAddModal,
  onSelectTransaction,
  onGoToTab,
  onQuickAddPreset,
  onTogglePaid,
  onNavigateToTransactions,
}) => {
  // Category color lookup map
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (let i = 0; i < categories.length; i++) {
      map[categories[i].name] = categories[i].color;
    }
    return map;
  }, [categories]);

  const netWorthData = useNetWorth(transactions, savingsGoals, reminders);

  const monthTransactions = useMonthTransactions(transactions, selectedMonth);
  // Current month totals memoized - Strictly separated by Liquid Cash (Salary/Bank) vs Ticket (VR/VA)
  const { 
    cashIncome, 
    cashExpense, 
    cashNetBalance, 
    ticketIncome, 
    ticketExpense, 
    ticketNetBalance, 
    incomeTotal,
    expenseTotal,
    savingsRate 
  } = useMemo(() => {
    let cInc = 0;
    let cExp = 0;
    let tInc = 0;
    let tExp = 0;

    for (let i = 0; i < monthTransactions.length; i++) {
      const t = monthTransactions[i];
      const isTicket = isTicketTx(t);

      if (t.type === 'income') {
        if (isTicket) tInc += t.amount;
        else cInc += t.amount;
      } else {
        if (isTicket) tExp += t.amount;
        else cExp += t.amount;
      }
    }

    const cNet = cInc - cExp;
    const tNet = tInc - tExp;
    const totInc = cInc + tInc;
    const totExp = cExp + tExp;
    const rate = cInc > 0 ? Math.max(0, ((cInc - cExp) / cInc) * 100) : 0;

    return { 
      cashIncome: cInc, 
      cashExpense: cExp, 
      cashNetBalance: cNet, 
      ticketIncome: tInc, 
      ticketExpense: tExp, 
      ticketNetBalance: tNet, 
      incomeTotal: totInc,
      expenseTotal: totExp,
      savingsRate: rate 
    };
  }, [monthTransactions]);

  // Cumulative balances (all history) for main cards
  const { totalCashBalance, totalTicketBalance } = useMemo(() => {
    let cBal = 0;
    let tBal = 0;
    const nowStr = new Date().toISOString().slice(0, 10);

    for (const t of transactions) {
      const isTicket = isTicketTx(t);
      const isPaid = t.isPaid || t.type === 'income'; // Income is considered paid for balance
      const isHistorical = t.date <= nowStr;

      if (isPaid && isHistorical) {
        if (t.type === 'income') {
          if (isTicket) tBal += t.amount;
          else cBal += t.amount;
        } else {
          if (isTicket) tBal -= t.amount;
          else cBal -= t.amount;
        }
      }
    }
    return { totalCashBalance: cBal, totalTicketBalance: tBal };
  }, [transactions]);

  // Calculate total monthly budget configured on expense categories
  const { totalBudgetLimit } = useMemo(() => {
    const limit = categories
      .filter(c => c.type === 'expense' && c.monthlyBudget)
      .reduce((acc, c) => acc + (c.monthlyBudget || 0), 0);
    return { totalBudgetLimit: limit };
  }, [categories]);

  // Top spending categories in current month
  const sortedCategories = useMemo(() => {
    const expenseByCategory: Record<string, { total: number; count: number; color: string }> = {};
    for (let i = 0; i < monthTransactions.length; i++) {
      const t = monthTransactions[i];
      if (t.type === 'expense') {
        if (!expenseByCategory[t.category]) {
          expenseByCategory[t.category] = { 
            total: 0, 
            count: 0, 
            color: categoryColorMap[t.category] || '#f59e0b' 
          };
        }
        expenseByCategory[t.category].total += t.amount;
        expenseByCategory[t.category].count += 1;
      }
    }
    return Object.entries(expenseByCategory)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 4);
  }, [monthTransactions, categoryColorMap]);

  // Recent transactions
  const recentTransactions = useMemo(() => {
    return [...monthTransactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [monthTransactions]);

  // Calculate Paid vs Pending for Cash
  const { cashPaidNet, cashPendingExpenses } = useMemo(() => {
    let paidInc = 0;
    let paidExp = 0;
    let pendExp = 0;

    for (let i = 0; i < monthTransactions.length; i++) {
      const t = monthTransactions[i];
      if (isTicketTx(t)) continue;

      if (t.type === 'income') {
        // Income is usually considered "realized" for the month balance unless explicitly marked otherwise
        // For projections, we treat them as expected income to avoid the confusion of -1530 + 1530 = -1530
        paidInc += t.amount;
      } else {
        if (t.isPaid) paidExp += t.amount;
        else pendExp += t.amount;
      }
    }
    return { cashPaidNet: paidInc - paidExp, cashPendingExpenses: pendExp };
  }, [monthTransactions]);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in">
      {/* 🏛️ Net Worth / Visão de Patrimônio */}
      <NetWorthCard {...netWorthData} />

      {/* Top Cards Section: Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Main Account Balance Card (Conta Corrente / Salário Líquido em Dinheiro) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span title="Saldo considerando todas as receitas menos todas as despesas (pagas ou não) e reservas de metas">
                  Saldo Livre Disponível
                </span>
              </div>
              {cashPendingExpenses > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {formatBRL(cashPendingExpenses)} Pendente
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums ${netWorthData.freeBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                {formatBRL(netWorthData.freeBalance)}
              </span>
              {cashPendingExpenses > 0 && (
                <span className="text-[11px] text-slate-500 font-medium italic">
                  (Proj: {formatBRL(netWorthData.freeBalance - cashPendingExpenses)})
                </span>
              )}
            </div>
          </div>

          {/* Income & Expense Split Badges for Cash */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
            <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Salário / Receitas</p>
                <p className="text-sm font-bold text-emerald-400 truncate tabular-nums">{formatBRL(cashIncome)}</p>
              </div>
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-3 border border-slate-800/60 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center shrink-0">
                <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Pago (Despesas)</p>
                <p className="text-sm font-bold text-red-400 truncate tabular-nums">{formatBRL(cashExpense - cashPendingExpenses)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 💳 Dedicated Ticket / Benefícios (VR / VA) Balance Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 shadow-lg flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Saldo em Tickets & Benefícios (VR / VA)
                </h4>
                <p className="text-[10px] text-slate-400">Isolado do dinheiro em conta corrente e salário</p>
              </div>
            </div>

            <div className="text-right">
              <p className={`text-xl font-extrabold tabular-nums ${totalTicketBalance >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                {formatBRL(totalTicketBalance)}
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
            <p className="text-[10px] text-slate-400 font-medium">Uso no mês vigente:</p>
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Créditos de Benefício: <strong className="text-emerald-400 tabular-nums">+{formatBRL(ticketIncome)}</strong></span>
              <span>Refeição & Mercado: <strong className="text-amber-400 tabular-nums">-{formatBRL(ticketExpense)}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Due Bills & Overdue Bills Alert Banner */}
      <DueBillsAlertBanner
        transactions={transactions}
        selectedMonth={selectedMonth}
        onTogglePaid={onTogglePaid}
        onSelectTransaction={onSelectTransaction}
      />

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
                <span className={`text-[11px] font-bold tabular-nums ${preset.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatBRL(preset.defaultAmount)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Pro Features: AI Smart Advisor & Debt Quittance Planner */}
      <AISmartAdvisor
        transactions={monthTransactions}
        categories={categories}
        isPro={isPro}
        onOpenSubscription={onOpenSubscription}
      />

      <DebtQuittancePlanner
        transactions={transactions}
        categories={categories}
        selectedMonth={selectedMonth}
        isPro={isPro}
        onOpenSubscription={onOpenSubscription}
        onTogglePaid={onTogglePaid}
        onNavigateToTransactions={onNavigateToTransactions}
      />

      {/* Empty State / Welcome Guide (Clean data banner) */}
      {transactions.length === 0 && (
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-5 text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Ambiente Pronto para Uso Real</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed mt-1">
              Sua base de dados está limpa e dedicada exclusivamente aos seus registros financeiros reais. Adicione suas receitas e despesas para iniciar o controle e planejamento.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center">
            <button
              onClick={() => onOpenAddModal('expense')}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Meu Primeiro Gasto</span>
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
            <span className="font-medium text-slate-400 tabular-nums">
              {formatBRL(expenseTotal)} / {formatBRL(totalBudgetLimit)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                expenseTotal > totalBudgetLimit 
                  ? 'bg-red-500' 
                  : ((expenseTotal / totalBudgetLimit) * 100) > 80 
                    ? 'bg-amber-400' 
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (expenseTotal / totalBudgetLimit) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2 text-[11px]">
            <span className={`tabular-nums ${expenseTotal > totalBudgetLimit ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
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
                      <span className="font-semibold text-white tabular-nums">{formatBRL(stats.total)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5 tabular-nums">({pct}%)</span>
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
            {recentTransactions.map((tx) => (
              <MemoizedRecentTxRow
                key={tx.id}
                tx={tx}
                categoryColor={categoryColorMap[tx.category] || '#94a3b8'}
                onSelect={onSelectTransaction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

HomeTab.displayName = 'HomeTab';

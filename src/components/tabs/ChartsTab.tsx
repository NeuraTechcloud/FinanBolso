import React, { useState, useMemo } from 'react';
import { 
  PieChart, 
  BarChart3, 
  Calendar, 
  TrendingDown, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  Layers, 
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { Transaction, Category, PAYMENT_METHOD_LABELS, PaymentMethod } from '../../types/finance';
import { formatBRL } from '../../services/exportService';

export interface CategoryStatItem {
  name: string;
  total: number;
  count: number;
  color: string;
  percentage: number;
}

export interface DonutSliceItem extends CategoryStatItem {
  pathData: string;
  startAngle: number;
  endAngle: number;
}

export interface MonthlyCompItem {
  monthKey: string;
  label: string;
  income: number;
  expense: number;
}

interface ChartsTabProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: string;
}

export const ChartsTab: React.FC<ChartsTabProps> = ({
  transactions,
  categories,
  selectedMonth,
}) => {
  const [activeChart, setActiveChart] = useState<'categories' | 'monthly' | 'daily' | 'payment'>('categories');
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);

  // Filter transactions for currently selected month
  const monthTransactions = useMemo(() => {
    return selectedMonth === 'all'
      ? transactions
      : transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const { expenseTransactions, totalExpense, incomeTransactions, totalIncome } = useMemo(() => {
    const expenses: Transaction[] = [];
    const incomes: Transaction[] = [];
    let expTotal = 0;
    let incTotal = 0;

    for (let i = 0; i < monthTransactions.length; i++) {
      const t = monthTransactions[i];
      if (t.type === 'expense') {
        expenses.push(t);
        expTotal += t.amount;
      } else {
        incomes.push(t);
        incTotal += t.amount;
      }
    }
    return {
      expenseTransactions: expenses,
      totalExpense: expTotal,
      incomeTransactions: incomes,
      totalIncome: incTotal,
    };
  }, [monthTransactions]);

  // Group expenses by category
  const { categoryStats, donutSlices } = useMemo(() => {
    const catMap: Record<string, { total: number; count: number; color: string }> = {};

    for (let i = 0; i < expenseTransactions.length; i++) {
      const t = expenseTransactions[i];
      if (!catMap[t.category]) {
        const cat = categories.find(c => c.name === t.category);
        catMap[t.category] = {
          total: 0,
          count: 0,
          color: cat ? cat.color : '#94a3b8',
        };
      }
      catMap[t.category].total += t.amount;
      catMap[t.category].count += 1;
    }

    const stats: CategoryStatItem[] = Object.entries(catMap).map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count,
      color: data.color,
      percentage: totalExpense > 0 ? (data.total / totalExpense) * 100 : 0,
    })).sort((a, b) => b.total - a.total);

    // Generate SVG Donut slices
    let accumulatedAngle = 0;
    const slices: DonutSliceItem[] = stats.map((item: CategoryStatItem) => {
      const angle = (item.percentage / 100) * 360;
      const startAngle = accumulatedAngle;
      const endAngle = accumulatedAngle + angle;
      accumulatedAngle += angle;

      const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
      const x1 = 100 + 70 * Math.cos(toRad(startAngle));
      const y1 = 100 + 70 * Math.sin(toRad(startAngle));
      const x2 = 100 + 70 * Math.cos(toRad(endAngle));
      const y2 = 100 + 70 * Math.sin(toRad(endAngle));

      const largeArc = angle > 180 ? 1 : 0;
      const pathData = `M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return {
        ...item,
        pathData,
        startAngle,
        endAngle,
      };
    });

    return { categoryStats: stats, donutSlices: slices };
  }, [expenseTransactions, totalExpense, categories]);

  // Monthly comparison data for the last 6 months
  const { monthlyComparison, maxMonthVal } = useMemo(() => {
    const list: MonthlyCompItem[] = [];

    const now = new Date();
    const shortLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${y}-${m}`;
      const label = `${shortLabels[d.getMonth()]}/${String(y).slice(2)}`;

      let inc = 0;
      let exp = 0;
      for (let j = 0; j < transactions.length; j++) {
        const t = transactions[j];
        if (t.date.startsWith(monthKey)) {
          if (t.type === 'income') inc += t.amount;
          else exp += t.amount;
        }
      }

      list.push({ monthKey, label, income: inc, expense: exp });
    }

    const maxVal = Math.max(1, ...list.map(m => Math.max(m.income, m.expense)));
    return { monthlyComparison: list, maxMonthVal: maxVal };
  }, [transactions]);

  // Daily distribution for the current month
  const { dailyExpenses, maxDaily, averagePerDay, highestSingleExpense } = useMemo(() => {
    const daily: Record<number, number> = {};
    for (let day = 1; day <= 31; day++) {
      daily[day] = 0;
    }

    let highest: Transaction | null = null;
    let daysWithExpenses = 0;

    for (let i = 0; i < expenseTransactions.length; i++) {
      const t = expenseTransactions[i];
      if (!highest || t.amount > highest.amount) {
        highest = t;
      }
      const parts = t.date.split('-');
      if (parts.length === 3) {
        const dayNum = parseInt(parts[2], 10);
        if (dayNum >= 1 && dayNum <= 31) {
          if (daily[dayNum] === 0) daysWithExpenses++;
          daily[dayNum] += t.amount;
        }
      }
    }

    const maxD = Math.max(1, ...Object.values(daily));
    const avg = totalExpense / (daysWithExpenses || 1);

    return {
      dailyExpenses: daily,
      maxDaily: maxD,
      averagePerDay: avg,
      highestSingleExpense: highest,
    };
  }, [expenseTransactions, totalExpense]);

  // Payment method breakdown
  const sortedPaymentMethods: [string, { total: number; count: number }][] = useMemo(() => {
    const paymentBreakdown: Record<string, { total: number; count: number }> = {};
    for (let i = 0; i < expenseTransactions.length; i++) {
      const t = expenseTransactions[i];
      if (!paymentBreakdown[t.paymentMethod]) {
        paymentBreakdown[t.paymentMethod] = { total: 0, count: 0 };
      }
      paymentBreakdown[t.paymentMethod].total += t.amount;
      paymentBreakdown[t.paymentMethod].count += 1;
    }

    return Object.entries(paymentBreakdown).sort((a, b) => b[1].total - a[1].total);
  }, [expenseTransactions]);

  const selectedCat = categoryStats.find((c: CategoryStatItem) => c.name === selectedCategoryName);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in">
      {/* Sub-nav switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveChart('categories')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeChart === 'categories'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Categorias</span>
        </button>

        <button
          onClick={() => setActiveChart('monthly')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeChart === 'monthly'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Mensal (6m)</span>
        </button>

        <button
          onClick={() => setActiveChart('daily')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeChart === 'daily'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Dias do Mês</span>
        </button>

        <button
          onClick={() => setActiveChart('payment')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeChart === 'payment'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Pagamento</span>
        </button>
      </div>

      {/* 1. CHART VIEW: Categories Donut & Breakdown */}
      {activeChart === 'categories' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Gastos por Categoria</h3>
                <p className="text-xs text-slate-400">Toque em uma fatia ou categoria para filtrar</p>
              </div>
              <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                {formatBRL(totalExpense)}
              </span>
            </div>

            {categoryStats.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhuma despesa registrada neste período para gerar o gráfico.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                {/* SVG Donut */}
                <div className="relative w-48 h-48 shrink-0">
                  <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                    {donutSlices.map((slice) => {
                      const isHighlighted = selectedCategoryName === slice.name;
                      return (
                        <path
                          key={slice.name}
                          d={slice.pathData}
                          fill={slice.color}
                          opacity={selectedCategoryName ? (isHighlighted ? 1 : 0.35) : 0.9}
                          className="cursor-pointer transition-all duration-200 hover:opacity-100"
                          onClick={() => {
                            setSelectedCategoryName(
                              selectedCategoryName === slice.name ? null : slice.name
                            );
                          }}
                        />
                      );
                    })}
                    {/* Inner hole for donut appearance */}
                    <circle cx="100" cy="100" r="48" fill="#0f172a" />
                  </svg>

                  {/* Center Text inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                    <span className="text-[10px] text-slate-400 leading-tight">
                      {selectedCat ? selectedCat.name : 'Total Gasto'}
                    </span>
                    <span className="text-xs font-extrabold text-white leading-tight">
                      {selectedCat ? formatBRL(selectedCat.total) : formatBRL(totalExpense)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      {selectedCat ? `${selectedCat.percentage.toFixed(1)}%` : `${categoryStats.length} itens`}
                    </span>
                  </div>
                </div>

                {/* Category List Breakdown */}
                <div className="w-full space-y-2 max-h-56 overflow-y-auto pr-1">
                  {categoryStats.map((item) => {
                    const isSelected = selectedCategoryName === item.name;
                    return (
                      <div
                        key={item.name}
                        onClick={() => setSelectedCategoryName(isSelected ? null : item.name)}
                        className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs ${
                          isSelected
                            ? 'bg-slate-800 border-emerald-500 shadow-sm'
                            : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-slate-200 truncate">{item.name}</span>
                          <span className="text-[10px] text-slate-400">({item.count})</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-white">{formatBRL(item.total)}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-semibold">
                            {item.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. CHART VIEW: Monthly Bar Chart Comparison */}
      {activeChart === 'monthly' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Evolução Mensal (Últimos 6 Meses)</h3>
              <p className="text-xs text-slate-400">Comparativo de Receitas vs Despesas</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Receita
              </span>
              <span className="flex items-center gap-1 text-red-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Despesa
              </span>
            </div>
          </div>

          {/* Bar Chart Canvas */}
          <div className="pt-6 pb-2">
            <div className="h-44 flex items-end justify-between gap-2 border-b border-slate-800 pb-2">
              {monthlyComparison.map((m) => {
                const incHeight = maxMonthVal > 0 ? (m.income / maxMonthVal) * 100 : 0;
                const expHeight = maxMonthVal > 0 ? (m.expense / maxMonthVal) * 100 : 0;
                const isCurrentMonth = m.monthKey === selectedMonth;

                return (
                  <div key={m.monthKey} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-36">
                      {/* Income Bar */}
                      <div
                        className="w-1/2 max-w-[14px] bg-emerald-500/90 rounded-t-sm transition-all group-hover:brightness-125 relative"
                        style={{ height: `${Math.max(4, incHeight)}%` }}
                        title={`Receitas em ${m.label}: ${formatBRL(m.income)}`}
                      />
                      {/* Expense Bar */}
                      <div
                        className="w-1/2 max-w-[14px] bg-red-500/90 rounded-t-sm transition-all group-hover:brightness-125 relative"
                        style={{ height: `${Math.max(4, expHeight)}%` }}
                        title={`Despesas em ${m.label}: ${formatBRL(m.expense)}`}
                      />
                    </div>
                    {/* Month Label */}
                    <span 
                      className={`text-[10px] mt-2 font-medium truncate ${
                        isCurrentMonth ? 'text-emerald-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary table of monthly evolution */}
          <div className="divide-y divide-slate-800/60 text-xs pt-1">
            {monthlyComparison.map((m) => {
              const net = m.income - m.expense;
              return (
                <div key={m.monthKey} className="py-2 flex items-center justify-between">
                  <span className="font-semibold text-slate-300">{m.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400">{formatBRL(m.income)}</span>
                    <span className="text-red-400">{formatBRL(m.expense)}</span>
                    <span className={`font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {net >= 0 ? '+' : ''}{formatBRL(net)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. CHART VIEW: Daily Spending in Month */}
      {activeChart === 'daily' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Trajetória Diária de Gastos</h3>
              <p className="text-xs text-slate-400">Dias 1 a 31 do mês selecionado</p>
            </div>
            <span className="text-xs text-slate-400">
              Média: <strong className="text-white">{formatBRL(averagePerDay)}/dia</strong>
            </span>
          </div>

          {/* Daily Bar Histogram */}
          <div className="h-40 flex items-end justify-between gap-1 pt-6 border-b border-slate-800 pb-2 overflow-x-auto">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const val = dailyExpenses[day] || 0;
              const heightPct = maxDaily > 0 ? (val / maxDaily) * 100 : 0;
              const hasExpense = val > 0;

              return (
                <div 
                  key={day} 
                  className="flex-1 flex flex-col items-center justify-end h-full group min-w-[7px]"
                  title={`Dia ${day}: ${formatBRL(val)}`}
                >
                  <div
                    className={`w-full rounded-t-xs transition-all ${
                      hasExpense ? 'bg-emerald-500 hover:bg-emerald-300' : 'bg-slate-800'
                    }`}
                    style={{ height: `${hasExpense ? Math.max(8, heightPct) : 3}%` }}
                  />
                  {day % 5 === 0 && (
                    <span className="text-[9px] text-slate-500 mt-1 font-mono">
                      {day}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
            <span>Maior gasto pontual:</span>
            <span className="font-bold text-red-400">
              {highestSingleExpense ? `${highestSingleExpense.description} (${formatBRL(highestSingleExpense.amount)})` : 'Nenhum'}
            </span>
          </div>
        </div>
      )}

      {/* 4. CHART VIEW: Payment Methods Breakdown */}
      {activeChart === 'payment' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white">Formas de Pagamento Mais Utilizadas</h3>
            <p className="text-xs text-slate-400">Divisão das despesas por meio de liquidação</p>
          </div>

          <div className="space-y-3">
            {sortedPaymentMethods.map(([methodKey, stats]) => {
              const label = PAYMENT_METHOD_LABELS[methodKey as PaymentMethod]?.label || methodKey;
              const pct = totalExpense > 0 ? (stats.total / totalExpense) * 100 : 0;

              return (
                <div key={methodKey} className="space-y-1.5 p-3 rounded-2xl bg-slate-950/50 border border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      {label}
                      <span className="text-[10px] text-slate-400 font-normal">({stats.count}x)</span>
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-white">{formatBRL(stats.total)}</span>
                      <span className="text-xs text-slate-400 ml-2 font-semibold">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Financial Health Summary Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-emerald-950/30 border border-emerald-500/20 text-xs text-slate-300 flex items-start gap-3">
        <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Análise Inteligente de Gastos</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Seu maior centro de custo no período é <strong className="text-slate-200">{categoryStats[0]?.name || 'nenhum'}</strong> correspondendo a <strong className="text-slate-200">{categoryStats[0]?.percentage.toFixed(0) || 0}%</strong> de todas as despesas.
            {totalIncome > totalExpense && ' Você está operando com superávit financeiro positivo.'}
          </p>
        </div>
      </div>
    </div>
  );
};

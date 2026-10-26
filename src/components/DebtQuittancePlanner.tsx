import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Crown, 
  Lock, 
  Percent, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Circle,
  ArrowRight,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { Transaction, Category } from '../types/finance';
import { formatBRL, formatDateBR } from '../services/exportService';

interface DebtQuittancePlannerProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonth?: string;
  isPro: boolean;
  onOpenSubscription: () => void;
  onTogglePaid?: (id: string) => void;
  onNavigateToTransactions?: (view?: 'all' | 'future') => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const DebtQuittancePlanner: React.FC<DebtQuittancePlannerProps> = ({
  transactions,
  categories: _categories,
  selectedMonth,
  isPro,
  onOpenSubscription,
  onTogglePaid,
  onNavigateToTransactions,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'simulator' | 'rates'>('overview');
  const [simTitle, setSimTitle] = useState('Smartphone Novo');
  const [simAmount, setSimAmount] = useState('2500');
  const [simInstallments, setSimInstallments] = useState(10);
  const [hidePaidDebts, setHidePaidDebts] = useState(false);

  // Determine effective reference month YYYY-MM
  const effectiveMonth = useMemo(() => {
    if (selectedMonth && selectedMonth !== 'all') {
      return selectedMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const monthLabel = useMemo(() => {
    const [yStr, mStr] = effectiveMonth.split('-');
    const mIdx = parseInt(mStr, 10) - 1;
    return `${MONTH_NAMES[mIdx] || 'Mês Atual'} de ${yStr}`;
  }, [effectiveMonth]);

  // Helper to detect bank and interest rate automatically
  const analyzeDebtItem = (t: Transaction) => {
    const descLower = t.description.toLowerCase();
    let bankName = 'Banco Geral';
    let interestRate = 5.0; // default base rate (%)
    const isPriority1 = t.paymentMethod === 'credit_card' || 
                      descLower.includes('banco') || 
                      descLower.includes('fatura') || 
                      descLower.includes('cartão') || 
                      descLower.includes('cartao') || 
                      descLower.includes('empréstimo') ||
                      descLower.includes('emprestimo');

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

    const finalAmountWithRate = isPriority1 ? t.amount * (1 + interestRate / 100) : t.amount;

    return {
      id: t.id,
      name: t.description,
      amount: t.amount,
      priority: (isPriority1 ? 1 : 2) as 1 | 2,
      bankName,
      interestRate,
      finalAmountWithRate,
      date: t.date,
      installmentNumber: t.installmentNumber,
      installmentsTotal: t.installmentsTotal,
      isRecurring: t.isRecurring,
      isPaid: Boolean(t.isPaid),
    };
  };

  // Helper to detect if a transaction is a Ticket / Benefit voucher (VR/VA)
  const isTicketTx = (t: Transaction) => {
    return t.paymentMethod === 'ticket' || 
           t.category.toLowerCase().includes('ticket') || 
           t.category.toLowerCase().includes('vr') || 
           t.category.toLowerCase().includes('va');
  };

  // 1. Calculate Monthly Cash Income (Salary/Bank) for Reference Month
  const { totalIncome, isFallbackIncome } = useMemo(() => {
    const monthIncomes = transactions.filter(t => t.type === 'income' && !isTicketTx(t) && t.date.startsWith(effectiveMonth));
    const currentMonthInc = monthIncomes.reduce((acc, t) => acc + t.amount, 0);

    if (currentMonthInc > 0) {
      return { totalIncome: currentMonthInc, isFallbackIncome: false };
    }

    // Fallback to average monthly cash income if user hasn't registered cash income for this specific month
    const allIncomes = transactions.filter(t => t.type === 'income' && !isTicketTx(t));
    if (allIncomes.length === 0) {
      return { totalIncome: 0, isFallbackIncome: false };
    }
    const uniqueIncomeMonths = new Set(allIncomes.map(t => t.date.slice(0, 7)));
    const avgInc = allIncomes.reduce((acc, t) => acc + t.amount, 0) / Math.max(1, uniqueIncomeMonths.size);
    return { totalIncome: avgInc, isFallbackIncome: true };
  }, [transactions, effectiveMonth]);

  // 2. Strict Filter: Only expenses belonging to the REFERENCE MONTH
  const referenceMonthDebts = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(effectiveMonth))
      .map(analyzeDebtItem);
  }, [transactions, effectiveMonth]);

  // 3. Count future installments to let user know they are safely managed in Extrato
  const futureCount = useMemo(() => {
    return transactions.filter(t => t.type === 'expense' && t.date > `${effectiveMonth}-31`).length;
  }, [transactions, effectiveMonth]);

  // Priority splits for the reference month
  const priority1Debts = referenceMonthDebts.filter(d => d.priority === 1);
  const priority2Debts = referenceMonthDebts.filter(d => d.priority === 2);

  const displayedPriority1 = hidePaidDebts ? priority1Debts.filter(d => !d.isPaid) : priority1Debts;
  const displayedPriority2 = hidePaidDebts ? priority2Debts.filter(d => !d.isPaid) : priority2Debts;

  const totalPriority1Final = priority1Debts.reduce((acc, d) => acc + d.finalAmountWithRate, 0);
  const totalPriority2 = priority2Debts.reduce((acc, d) => acc + d.amount, 0);

  // Paid and remaining breakdowns
  const paidPriority1 = priority1Debts.filter(d => d.isPaid).reduce((acc, d) => acc + d.finalAmountWithRate, 0);
  const paidPriority2 = priority2Debts.filter(d => d.isPaid).reduce((acc, d) => acc + d.amount, 0);
  const totalPaidMes = paidPriority1 + paidPriority2;

  const remainingPriority1 = totalPriority1Final - paidPriority1;
  const remainingPriority2 = totalPriority2 - paidPriority2;
  const totalRemainingMes = remainingPriority1 + remainingPriority2;

  // Total payable in this reference month
  const totalGeralMes = totalPriority1Final + totalPriority2;
  const saldoLivreMes = totalIncome - totalGeralMes;
  const paidCount = referenceMonthDebts.filter(d => d.isPaid).length;

  const leftoverAfterPriority1 = Math.max(0, totalIncome - remainingPriority1);
  const deficitPriority2 = Math.max(0, remainingPriority2 - leftoverAfterPriority1);

  return (
    <div className="rounded-3xl bg-slate-900 border border-emerald-500/30 p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                Planejador de Quitação
              </h3>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <Calendar className="w-2.5 h-2.5" /> {monthLabel}
              </span>
            </div>
            <p className="text-[10px] text-emerald-400 font-medium truncate mt-0.5">
              Cálculo das contas e prioridades do mês atual
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {referenceMonthDebts.length > 0 && (
            <span className="text-[10px] font-bold text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
              {paidCount}/{referenceMonthDebts.length} pagas
            </span>
          )}
          {paidCount > 0 && (
            <button
              type="button"
              onClick={() => setHidePaidDebts(!hidePaidDebts)}
              className="text-[10px] font-bold text-slate-300 hover:text-white bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60 transition active:scale-95"
            >
              {hidePaidDebts ? 'Mostrar pagas' : 'Ocultar pagas'}
            </button>
          )}
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-400" /> Pro Ativo
          </span>
        </div>
      </div>

      {/* Navigation sub-tabs (3 tabs only: Overview, Steps, Rates) */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-[11px]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-1.5 rounded-xl font-semibold transition ${activeTab === 'overview' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Contas do Mês
        </button>
        <button
          onClick={() => setActiveTab('simulator')}
          className={`py-1.5 rounded-xl font-semibold transition flex items-center justify-center gap-1 ${activeTab === 'simulator' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Simulador ("Posso Comprar?")</span>
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`py-1.5 rounded-xl font-semibold transition ${activeTab === 'rates' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
        >
          Taxas dos Bancos
        </button>
      </div>

      {/* Tab 1: Overview (Only Reference Month with Payment Toggle) */}
      {activeTab === 'overview' && (
        <div className="space-y-3.5 animate-in fade-in">
          {/* Main Month KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-[9px] text-slate-400 uppercase font-semibold">Renda do Mês</p>
              <p className="text-sm font-extrabold text-emerald-400 truncate">{formatBRL(totalIncome)}</p>
              {isFallbackIncome && (
                <span className="text-[8px] text-slate-500 block truncate">Renda estimada</span>
              )}
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-[9px] text-slate-400 uppercase font-semibold">Total do Mês</p>
              <p className="text-sm font-extrabold text-amber-400 truncate">{formatBRL(totalGeralMes)}</p>
              <span className="text-[8px] text-slate-500 block truncate">c/ juros aplicados</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-[9px] text-slate-400 uppercase font-semibold">Já Pago</p>
              <p className="text-sm font-extrabold text-emerald-400 truncate">{formatBRL(totalPaidMes)}</p>
              <span className="text-[8px] text-slate-400 block truncate">{paidCount} conta(s)</span>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
              <p className="text-[9px] text-slate-400 uppercase font-semibold">Falta Pagar</p>
              <p className={`text-sm font-extrabold truncate ${totalRemainingMes === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {formatBRL(totalRemainingMes)}
              </p>
              <span className="text-[8px] text-slate-500 block truncate">
                {totalRemainingMes === 0 ? 'Tudo quitado!' : `${referenceMonthDebts.length - paidCount} pendente(s)`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Priority 1 Card (Bancos / Cartões c/ Juros) */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  PRIORIDADE 1 (Bancos/Cartões)
                </span>
                <span className="tabular-nums">{formatBRL(totalPriority1Final)}</span>
              </div>

              {displayedPriority1.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-3 text-center">
                  {hidePaidDebts && priority1Debts.length > 0
                    ? '✓ Todas as contas de Prioridade 1 foram quitadas!'
                    : 'Nenhum débito com juros ou cartão neste mês.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto nested-scroll pr-0.5">
                  {displayedPriority1.map((d) => (
                    <div 
                      key={d.id} 
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                        d.isPaid 
                          ? 'bg-slate-900/40 border-emerald-500/20 opacity-75' 
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold text-xs truncate ${d.isPaid ? 'line-through text-slate-400' : 'text-white'}`}>
                            {d.name}
                          </span>
                          {d.installmentsTotal && d.installmentsTotal > 1 && (
                            <span className="text-[8px] font-bold px-1 rounded bg-blue-500/20 text-blue-400 shrink-0">
                              {d.installmentNumber}/{d.installmentsTotal}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-amber-400 flex items-center gap-1 mt-0.5">
                          <span>{d.bankName}</span>
                          <span>•</span>
                          <span>+{d.interestRate}% a.m.</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <div className={`text-xs font-bold tabular-nums ${d.isPaid ? 'text-emerald-400' : 'text-white'}`}>
                            {formatBRL(d.finalAmountWithRate)}
                          </div>
                          <div className="text-[8px] text-slate-500 tabular-nums">Sub: {formatBRL(d.amount)}</div>
                        </div>

                        {/* Interactive toggle button */}
                        <button
                          onClick={() => onTogglePaid?.(d.id)}
                          className={`p-1.5 rounded-lg border transition text-[10px] font-bold flex items-center gap-1 active:scale-95 shrink-0 ${
                            d.isPaid
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40'
                          }`}
                          title={d.isPaid ? 'Clique para marcar como pendente' : 'Clique para marcar como pago'}
                        >
                          {d.isPaid ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="hidden xs:inline">Pago</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5 text-slate-400" />
                              <span className="hidden xs:inline">Pagar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Priority 2 Card (Contas Essenciais do Mês) */}
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-blue-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                  PRIORIDADE 2 (Contas do Mês)
                </span>
                <span className="tabular-nums">{formatBRL(totalPriority2)}</span>
              </div>

              {displayedPriority2.length === 0 ? (
                <p className="text-[11px] text-slate-500 py-3 text-center">
                  {hidePaidDebts && priority2Debts.length > 0
                    ? '✓ Todas as contas de Prioridade 2 foram quitadas!'
                    : 'Nenhuma conta essencial identificada para este mês.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto nested-scroll pr-0.5">
                  {displayedPriority2.map((d) => (
                    <div 
                      key={d.id} 
                      className={`p-2.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                        d.isPaid 
                          ? 'bg-slate-900/40 border-emerald-500/20 opacity-75' 
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold text-xs truncate ${d.isPaid ? 'line-through text-slate-400' : 'text-white'}`}>
                            {d.name}
                          </span>
                          {d.installmentsTotal && d.installmentsTotal > 1 && (
                            <span className="text-[8px] font-bold px-1 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                              {d.installmentNumber}/{d.installmentsTotal}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5 text-slate-500" />
                          <span>{formatDateBR(d.date)}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <span className={`text-xs font-bold tabular-nums ${d.isPaid ? 'text-emerald-400' : 'text-white'}`}>
                          {formatBRL(d.amount)}
                        </span>

                        {/* Interactive toggle button */}
                        <button
                          onClick={() => onTogglePaid?.(d.id)}
                          className={`p-1.5 rounded-lg border transition text-[10px] font-bold flex items-center gap-1 active:scale-95 shrink-0 ${
                            d.isPaid
                              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40'
                          }`}
                          title={d.isPaid ? 'Clique para marcar como pendente' : 'Clique para marcar como pago'}
                        >
                          {d.isPaid ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="hidden xs:inline">Pago</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3.5 h-3.5 text-slate-400" />
                              <span className="hidden xs:inline">Pagar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Reference month scoping note & Extrato Link */}
          <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Calculando apenas lançamentos de {monthLabel}. Toque em "Pagar" para dar baixa.</span>
            </span>

            {futureCount > 0 && onNavigateToTransactions && (
              <button 
                onClick={() => onNavigateToTransactions('future')}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 shrink-0 self-start sm:self-auto hover:underline"
              >
                <span>Ver {futureCount} parcelas futuras no Extrato</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Simulador de Compra Parcelada ("Posso Comprar?") */}
      {activeTab === 'simulator' && (
        !isPro ? (
          <div className="p-6 text-center bg-slate-950 border border-amber-500/30 rounded-2xl space-y-3 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                EXCLUSIVO PRO
              </span>
              <h4 className="text-sm font-bold text-white mt-1">Simulador de Compra "Posso Comprar?"</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Simule parcelas e planeje suas compras futuras sem comprometer o orçamento. Disponível no Clube Pro.
              </p>
            </div>
            <button
              onClick={onOpenSubscription}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition"
            >
              Desbloquear Simulador com Clube Pro
            </button>
          </div>
        ) : (
          <div className="space-y-3.5 animate-in text-xs fade-in">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Simulador "Posso Comprar?"
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Exclusivo Pro
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed text-[11px]">
              Simule o impacto de uma nova compra parcelada nas suas contas de {monthLabel} e verifique se o seu saldo livre suporta o compromisso sem ficar no vermelho.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">O que deseja comprar?</label>
                <input
                  type="text"
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  placeholder="Ex: Smartphone, Notebook"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Valor Total (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Parcelas (X vezes):</label>
                <select
                  value={simInstallments}
                  onChange={(e) => setSimInstallments(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                >
                  {[1, 2, 3, 4, 5, 6, 10, 12, 18, 24, 36].map(n => (
                    <option key={n} value={n}>{n}x {n > 1 ? 'vezes' : 'à vista'}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Simulation Results Breakdown */}
            {(() => {
              const totalVal = parseFloat(simAmount.replace(',', '.')) || 0;
              const monthlyInst = simInstallments > 0 ? totalVal / simInstallments : totalVal;
              const remainingAfterSim = saldoLivreMes - monthlyInst;
              const canAfford = remainingAfterSim >= 0;

              return (
                <div className={`p-3.5 rounded-2xl border space-y-2 ${
                  canAfford 
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider">
                      Parcela Mensal: <strong className="text-white">{formatBRL(monthlyInst)}</strong> ({simInstallments}x de {formatBRL(monthlyInst)})
                    </span>
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${canAfford ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'}`}>
                      {canAfford ? '✓ Compra Viável' : '⚠️ Orçamento Estourado'}
                    </span>
                  </div>

                  <p className="text-[11px] leading-relaxed">
                    {canAfford
                      ? `Sim! O item "${simTitle}" cabe no seu orçamento. Após pagar a parcela de ${formatBRL(monthlyInst)}, ainda restará uma folga de ${formatBRL(remainingAfterSim)} no seu saldo livre de ${monthLabel}.`
                      : `Atenção: A parcela de ${formatBRL(monthlyInst)} excede sua folga atual. Seu orçamento ficaria negativo em ${formatBRL(Math.abs(remainingAfterSim))} em ${monthLabel}.`}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )
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
              O sistema identifica o banco automaticamente e aplica a taxa institucional correspondente, exibindo exatamente o montante necessário para quitação do mês.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

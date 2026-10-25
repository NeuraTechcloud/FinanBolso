import React, { useState, useMemo, memo } from 'react';
import { 
  Search, 
  Filter, 
  TrendingDown, 
  TrendingUp, 
  X, 
  Plus,
  Lock,
  Crown,
  Calendar,
  CheckCircle,
  Circle,
  Layers,
  Clock,
  Sparkles,
  Printer,
  FileText
} from 'lucide-react';
import { Transaction, Category, PAYMENT_METHOD_LABELS } from '../../types/finance';
import { formatBRL, formatDateBR } from '../../services/exportService';

interface TransactionsTabProps {
  transactions: Transaction[];
  categories: Category[];
  selectedMonth: string;
  onSelectTransaction: (tx: Transaction) => void;
  onOpenAddModal: () => void;
  isPro?: boolean;
  onOpenSubscription?: () => void;
  defaultSubTab?: 'history' | 'future';
  onTogglePaid?: (id: string) => void;
}

interface TransactionRowProps {
  tx: Transaction;
  categoryColor: string;
  onSelect: (tx: Transaction) => void;
  onTogglePaid?: (id: string) => void;
}

const MemoizedTransactionRow = memo<TransactionRowProps>(({ tx, categoryColor, onSelect, onTogglePaid }) => {
  const isIncome = tx.type === 'income';

  return (
    <div
      onClick={() => onSelect(tx)}
      className={`border rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition active:scale-[0.99] shadow-sm gpu-layer ${
        tx.isPaid 
          ? 'bg-slate-900/60 border-slate-800/60 opacity-80' 
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700/80'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            isIncome ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
          }`}
        >
          {isIncome ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className={`text-xs font-bold truncate ${tx.isPaid ? 'line-through text-slate-400' : 'text-white'}`}>
              {tx.description}
            </p>
            {tx.installmentsTotal && tx.installmentsTotal > 1 ? (
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 shrink-0">
                {tx.installmentNumber}/{tx.installmentsTotal}
              </span>
            ) : tx.isRecurring ? (
              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 shrink-0">
                Fixo
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
            <span
              className="w-2 h-2 rounded-full inline-block shrink-0"
              style={{ backgroundColor: categoryColor }}
            />
            <span className="truncate">{tx.category}</span>
            <span>•</span>
            <span>{formatDateBR(tx.date)}</span>
          </div>
          {tx.notes && (
            <p className="text-[10px] text-slate-500 truncate mt-0.5 italic">
              "{tx.notes}"
            </p>
          )}
        </div>
      </div>

      <div className="text-right shrink-0 flex items-center gap-2.5">
        <div>
          <p className={`text-sm font-extrabold tabular-nums ${isIncome ? 'text-emerald-400' : tx.isPaid ? 'text-emerald-400' : 'text-red-400'}`}>
            {isIncome ? '+ ' : '- '}{formatBRL(tx.amount)}
          </p>
          <span className="text-[10px] font-medium text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
            {PAYMENT_METHOD_LABELS[tx.paymentMethod]?.label || tx.paymentMethod}
          </span>
        </div>

        {/* Quick Paid/Pendente Toggle for expenses */}
        {!isIncome && onTogglePaid && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePaid(tx.id);
            }}
            className={`p-1.5 rounded-xl border transition active:scale-95 shrink-0 ${
              tx.isPaid
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-emerald-300 hover:border-slate-700'
            }`}
            title={tx.isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
          >
            {tx.isPaid ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : (
              <Circle className="w-4 h-4 text-slate-500" />
            )}
          </button>
        )}
      </div>
    </div>
  );
});

MemoizedTransactionRow.displayName = 'MemoizedTransactionRow';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const TransactionsTab: React.FC<TransactionsTabProps> = memo(({
  transactions,
  categories,
  selectedMonth,
  onSelectTransaction,
  onOpenAddModal,
  isPro = false,
  onOpenSubscription,
  defaultSubTab = 'history',
  onTogglePaid,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'future'>(defaultSubTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [paidStatusFilter, setPaidStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  // Category colors lookup map
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (let i = 0; i < categories.length; i++) {
      map[categories[i].name] = categories[i].color;
    }
    return map;
  }, [categories]);

  // Reference month determination
  const effectiveMonth = useMemo(() => {
    if (selectedMonth && selectedMonth !== 'all') {
      return selectedMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  // Regular month transaction list
  const baseList = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Future installments & scheduled commitments strictly beyond effective month
  const futureList = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && t.date > `${effectiveMonth}-31`)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, effectiveMonth]);

  // Group future transactions by month (YYYY-MM)
  const groupedFutureList = useMemo(() => {
    const groups: Record<string, { monthKey: string; monthLabel: string; items: Transaction[]; total: number }> = {};
    for (let i = 0; i < futureList.length; i++) {
      const tx = futureList[i];
      const mKey = tx.date.slice(0, 7);
      if (!groups[mKey]) {
        const [yStr, mStr] = mKey.split('-');
        const mIdx = parseInt(mStr, 10) - 1;
        groups[mKey] = {
          monthKey: mKey,
          monthLabel: `${MONTH_NAMES[mIdx] || mKey} de ${yStr}`,
          items: [],
          total: 0,
        };
      }
      groups[mKey].items.push(tx);
      groups[mKey].total += tx.amount;
    }
    return Object.values(groups).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [futureList]);

  const totalFutureAmount = useMemo(() => {
    return futureList.reduce((acc, t) => acc + t.amount, 0);
  }, [futureList]);

  // Filtered & Sorted list for the main history tab
  const filteredList = useMemo(() => {
    return baseList.filter(t => {
      // Search text
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchDesc = t.description.toLowerCase().includes(query);
        const matchCat = t.category.toLowerCase().includes(query);
        const matchNotes = t.notes?.toLowerCase().includes(query);
        if (!matchDesc && !matchCat && !matchNotes) return false;
      }

      // Type filter
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

      // Payment Method filter
      if (methodFilter !== 'all' && t.paymentMethod !== methodFilter) return false;

      // Paid status filter
      if (paidStatusFilter === 'paid' && !t.isPaid) return false;
      if (paidStatusFilter === 'pending' && t.isPaid) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
  }, [baseList, searchTerm, typeFilter, categoryFilter, methodFilter, paidStatusFilter, sortBy]);

  // Filtered totals
  const { totalFilteredIncome, totalFilteredExpense } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (let i = 0; i < filteredList.length; i++) {
      if (filteredList[i].type === 'income') inc += filteredList[i].amount;
      else exp += filteredList[i].amount;
    }
    return { totalFilteredIncome: inc, totalFilteredExpense: exp };
  }, [filteredList]);

  // Distinct category list for dropdown
  const distinctCategories = useMemo(() => Array.from(new Set(baseList.map(t => t.category))), [baseList]);

  return (
    <div className="space-y-4 pb-28 animate-in fade-in">
      {/* Sub-tabs header: Extrato vs Parcelas Futuras */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-sm text-xs">
        <button
          onClick={() => setActiveSubTab('history')}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
            activeSubTab === 'history'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Lançamentos</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
            activeSubTab === 'history' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
          }`}>
            {baseList.length}
          </span>
        </button>

        <button
          onClick={() => {
            if (!isPro) {
              onOpenSubscription?.();
              return;
            }
            setActiveSubTab('future');
          }}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'future'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Parcelas Futuras</span>
          {!isPro && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
          {futureList.length > 0 && isPro && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {futureList.length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: REGULAR TRANSACTIONS */}
      {activeSubTab === 'history' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Fechamento Mensal & Relatório PDF Card */}
          <div className="p-4 bg-slate-900 border border-emerald-500/30 rounded-3xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Fechamento Mensal & Relatório
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Balanço consolidado do período selecionado
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition active:scale-95 shadow"
                title="Imprimir ou baixar relatório PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Baixar PDF</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-400 uppercase font-semibold">Receitas</p>
                <p className="text-xs font-extrabold text-emerald-400 truncate">{formatBRL(totalFilteredIncome)}</p>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-400 uppercase font-semibold">Despesas</p>
                <p className="text-xs font-extrabold text-red-400 truncate">{formatBRL(totalFilteredExpense)}</p>
              </div>
              <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                <p className="text-[9px] text-slate-400 uppercase font-semibold">Resultado</p>
                <p className={`text-xs font-extrabold truncate ${totalFilteredIncome - totalFilteredExpense >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatBRL(totalFilteredIncome - totalFilteredExpense)}
                </p>
              </div>
            </div>
          </div>
          {/* Search & Filter Bar */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por descrição ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-2xl border transition flex items-center justify-center shrink-0 ${
                  showFilters || categoryFilter !== 'all' || methodFilter !== 'all' || typeFilter !== 'all' || paidStatusFilter !== 'all'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title="Filtros avançados"
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Type & Status Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                  typeFilter === 'all'
                    ? 'bg-slate-200 text-slate-900 font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Todos ({baseList.length})
              </button>
              <button
                onClick={() => setTypeFilter('expense')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                  typeFilter === 'expense'
                    ? 'bg-red-500 text-white font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Despesas</span>
              </button>
              <button
                onClick={() => setTypeFilter('income')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                  typeFilter === 'income'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Receitas</span>
              </button>

              <span className="w-px h-4 bg-slate-800 mx-1 shrink-0" />

              <button
                onClick={() => setPaidStatusFilter(paidStatusFilter === 'pending' ? 'all' : 'pending')}
                className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                  paidStatusFilter === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400'
                }`}
              >
                Apenas Pendentes
              </button>
              <button
                onClick={() => setPaidStatusFilter(paidStatusFilter === 'paid' ? 'all' : 'paid')}
                className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                  paidStatusFilter === 'paid'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400'
                }`}
              >
                Apenas Pagas
              </button>
            </div>

            {/* Advanced Filters Drawer */}
            {showFilters && (
              <div className="p-3.5 bg-slate-900/95 border border-slate-800 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-1 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1">Categoria:</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">Todas as categorias</option>
                      {distinctCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Pagamento:</label>
                    <select
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">Todos os meios</option>
                      {Object.entries(PAYMENT_METHOD_LABELS).map(([k, item]) => (
                        <option key={k} value={k}>{item.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Ordenar por:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="date-desc">Mais recentes primeiro</option>
                      <option value="date-asc">Mais antigos primeiro</option>
                      <option value="amount-desc">Maior valor primeiro</option>
                      <option value="amount-asc">Menor valor primeiro</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setTypeFilter('all');
                      setCategoryFilter('all');
                      setMethodFilter('all');
                      setPaidStatusFilter('all');
                      setSortBy('date-desc');
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline"
                  >
                    Limpar todos os filtros
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Summary indicator */}
          <div className="flex items-center justify-between text-xs px-1 text-slate-400">
            <span>{filteredList.length} registro(s) no período</span>
            <div className="flex items-center gap-2">
              {totalFilteredIncome > 0 && (
                <span className="text-emerald-400 font-semibold tabular-nums">+{formatBRL(totalFilteredIncome)}</span>
              )}
              {totalFilteredExpense > 0 && (
                <span className="text-red-400 font-semibold tabular-nums">-{formatBRL(totalFilteredExpense)}</span>
              )}
            </div>
          </div>

          {/* Transaction List */}
          {filteredList.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
              <p className="text-sm font-medium text-slate-300">Nenhum lançamento encontrado</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Tente remover os filtros ou adicione uma nova transação.
              </p>
              <button
                onClick={onOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition"
              >
                <Plus className="w-4 h-4" /> Novo Lançamento
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredList.map((tx) => (
                <MemoizedTransactionRow
                  key={tx.id}
                  tx={tx}
                  categoryColor={categoryColorMap[tx.category] || '#94a3b8'}
                  onSelect={onSelectTransaction}
                  onTogglePaid={onTogglePaid}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: FUTURE & SCHEDULED INSTALLMENTS */}
      {activeSubTab === 'future' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Future Commitments Card */}
          <div className="p-4 bg-slate-900 border border-blue-500/30 rounded-3xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Compromissos Programados
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Parcelas futuras que vencerão após o mês atual
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[9px] text-slate-400 uppercase font-semibold">Total Futuro</p>
                <p className="text-base font-extrabold text-blue-400 tabular-nums">
                  {formatBRL(totalFutureAmount)}
                </p>
              </div>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Estas parcelas não sobrecarregam o mês atual; elas aparecem aqui para você planejar os meses seguintes com antecedência.
              </span>
            </div>
          </div>

          {/* Grouped installments list */}
          {groupedFutureList.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-3">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Nenhuma parcela futura registrada</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Quando você adicionar compras parceladas ou gastos mensais futuros, eles serão organizados cronologicamente aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedFutureList.map(group => (
                <div key={group.monthKey} className="space-y-2">
                  {/* Month group header */}
                  <div className="flex items-center justify-between px-2 pt-1 text-xs">
                    <span className="font-extrabold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      {group.monthLabel}
                    </span>
                    <span className="font-bold text-slate-300 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800 tabular-nums">
                      {formatBRL(group.total)} ({group.items.length})
                    </span>
                  </div>

                  {/* Month group items */}
                  <div className="space-y-2">
                    {group.items.map(tx => (
                      <MemoizedTransactionRow
                        key={tx.id}
                        tx={tx}
                        categoryColor={categoryColorMap[tx.category] || '#94a3b8'}
                        onSelect={onSelectTransaction}
                        onTogglePaid={onTogglePaid}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

TransactionsTab.displayName = 'TransactionsTab';

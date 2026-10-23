import React, { useState, useMemo, memo } from 'react';
import { 
  Search, 
  Filter, 
  TrendingDown, 
  TrendingUp, 
  X, 
  Plus,
  Lock,
  Crown
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
}

interface TransactionRowProps {
  tx: Transaction;
  categoryColor: string;
  onSelect: (tx: Transaction) => void;
}

const MemoizedTransactionRow = memo<TransactionRowProps>(({ tx, categoryColor, onSelect }) => {
  const isIncome = tx.type === 'income';

  return (
    <div
      onClick={() => onSelect(tx)}
      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 cursor-pointer transition active:scale-[0.99] shadow-sm gpu-layer"
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
          <p className="text-xs font-bold text-white truncate">{tx.description}</p>
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

      <div className="text-right shrink-0">
        <p className={`text-sm font-extrabold tabular-nums ${isIncome ? 'text-emerald-400' : 'text-red-400'}`}>
          {isIncome ? '+ ' : '- '}{formatBRL(tx.amount)}
        </p>
        <span className="text-[10px] font-medium text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
          {PAYMENT_METHOD_LABELS[tx.paymentMethod]?.label || tx.paymentMethod}
        </span>
      </div>
    </div>
  );
});

MemoizedTransactionRow.displayName = 'MemoizedTransactionRow';

export const TransactionsTab: React.FC<TransactionsTabProps> = memo(({
  transactions,
  categories,
  selectedMonth,
  onSelectTransaction,
  onOpenAddModal,
  isPro = false,
  onOpenSubscription,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  // Map category colors for instant lookup without .find inside iteration
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (let i = 0; i < categories.length; i++) {
      map[categories[i].name] = categories[i].color;
    }
    return map;
  }, [categories]);

  // Month filter base
  const baseList = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Filtered & Sorted list
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

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
  }, [baseList, searchTerm, typeFilter, categoryFilter, methodFilter, sortBy]);

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

  // If not Pro, show locked screen
  if (!isPro) {
    return (
      <div className="p-6 text-center bg-slate-900 border border-amber-500/30 rounded-3xl space-y-4 shadow-xl animate-in fade-in my-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-400" /> RECURSO PRO EXCLUSIVO
          </span>
          <h3 className="text-base font-extrabold text-white mt-2">Extrato Financeiro Completo</h3>
          <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed mt-1">
            A visualização consolidada, busca detalhada e filtros avançados do seu Extrato são exclusivos para membros do Clube Pro.
          </p>
        </div>
        <button
          onClick={onOpenSubscription}
          className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-2xl shadow-xl transition active:scale-95 flex items-center justify-center gap-2 mx-auto"
        >
          <Crown className="w-4 h-4 text-slate-950" />
          <span>Desbloquear Extrato com Clube Pro</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 animate-in fade-in">
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
              showFilters || categoryFilter !== 'all' || methodFilter !== 'all' || typeFilter !== 'all'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Filtros avançados"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Type Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
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
        <span>{filteredList.length} registro(s) encontrado(s)</span>
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
            Tente remover os filtros ou adicione uma nova transação clicando no botão abaixo.
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
            />
          ))}
        </div>
      )}
    </div>
  );
});

TransactionsTab.displayName = 'TransactionsTab';

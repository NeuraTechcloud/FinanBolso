import React, { useState, memo } from 'react';
import { 
  Target, 
  Plus, 
  ShieldCheck, 
  Sparkles, 
  TrendingUp, 
  Check, 
  Edit3, 
  Trash2, 
  X,
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  FolderPlus,
  Tag,
  History,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SavingsGoal, Category, Transaction, Reminder, PaymentMethod, GoalHistoryEntry } from '../../types/finance';
import { formatBRL, formatDateBR } from '../../services/exportService';
import { motion, AnimatePresence } from 'motion/react';
import { GoalSimulator } from '../GoalSimulator';

interface GoalsTabProps {
  savingsGoals: SavingsGoal[];
  categories: Category[];
  transactions: Transaction[];
  reminders: Reminder[];
  selectedMonth: string;
  onUpdateGoals: (goals: SavingsGoal[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdateReminders: (reminders: Reminder[]) => void;
  onAddTransaction?: (txData: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

const MemoizedGoalItem = memo<{
  goal: SavingsGoal;
  onDeposit: (goal: SavingsGoal) => void;
  onEdit: (goal: SavingsGoal) => void;
}>(({ goal, onDeposit, onEdit }) => {
  const percent = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  const isComplete = percent >= 100;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-lg relative overflow-hidden group gpu-layer"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-inner"
            style={{ backgroundColor: goal.color }}
          >
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition">{goal.title}</h3>
            {goal.deadline && (
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3 text-slate-500" />
                Prazo: {formatDateBR(goal.deadline)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDeposit(goal)}
            className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-bold rounded-lg transition active:scale-95"
          >
            + Guardar
          </button>
          <button
            onClick={() => onEdit(goal)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Editar"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1 mt-3">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-emerald-400">{formatBRL(goal.currentAmount)}</span>
          <span className="text-slate-400">Meta: {formatBRL(goal.targetAmount)} ({percent}%)</span>
        </div>
        <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${percent}%`, 
              backgroundColor: goal.color 
            }}
          />
          {/* Milestone markers */}
          {[25, 50, 75].map(m => (
            <div 
              key={m} 
              className="absolute top-0 bottom-0 w-[1px] bg-slate-800/60" 
              style={{ left: `${m}%` }} 
            />
          ))}
        </div>
      </div>

      {isComplete && (
        <div className="mt-2.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Meta Alcançada com Sucesso! Parabéns!</span>
        </div>
      )}
    </motion.div>
  );
});

MemoizedGoalItem.displayName = 'MemoizedGoalItem';

const MemoizedReminderItem = memo<{
  rem: Reminder;
  todayStr: string;
  onTogglePaid: (rem: Reminder) => void;
  onDelete: (id: string) => void;
}>(({ rem, todayStr, onTogglePaid, onDelete }) => {
  const isPastDue = !rem.isPaid && rem.dueDate < todayStr;
  const isToday = !rem.isPaid && rem.dueDate === todayStr;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3.5 bg-slate-900 border rounded-2xl shadow-sm flex items-center justify-between gap-3 transition gpu-layer ${
        rem.isPaid 
          ? 'border-slate-800 opacity-60 bg-slate-900/50' 
          : isPastDue 
          ? 'border-red-500/50 bg-red-950/10' 
          : isToday 
          ? 'border-amber-500/50 bg-amber-950/10' 
          : 'border-slate-800'
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => onTogglePaid(rem)}
          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition shrink-0 ${
            rem.isPaid 
              ? 'bg-emerald-500 border-emerald-500 text-slate-950' 
              : 'border-slate-700 bg-slate-950 hover:border-emerald-500'
          }`}
          title={rem.isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
        >
          {rem.isPaid && <Check className="w-4 h-4 stroke-[3]" />}
        </button>

        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${rem.isPaid ? 'line-through text-slate-400' : 'text-white'}`}>
              {rem.title}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md">
              {rem.category}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              Vencimento: {formatDateBR(rem.dueDate)}
            </span>
            {!rem.isPaid && isPastDue && (
              <span className="text-red-400 font-bold">Vencido!</span>
            )}
            {!rem.isPaid && isToday && (
              <span className="text-amber-400 font-bold">Vence hoje!</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-xs font-bold ${rem.isPaid ? 'text-slate-400' : 'text-emerald-400'}`}>
          {formatBRL(rem.amount)}
        </span>
        <button
          onClick={() => onDelete(rem.id)}
          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg transition"
          title="Excluir"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
});

MemoizedReminderItem.displayName = 'MemoizedReminderItem';

export const GoalsTab: React.FC<GoalsTabProps> = memo(({
  savingsGoals,
  categories,
  transactions,
  reminders,
  selectedMonth,
  onUpdateGoals,
  onUpdateCategories,
  onUpdateReminders,
  onAddTransaction,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'savings' | 'budgets' | 'reminders'>('savings');

  // Modal for new/edit savings goal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalCurrentStr, setGoalCurrentStr] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalColor, setGoalColor] = useState('#10b981');
  const [isConfirmingGoalDelete, setIsConfirmingGoalDelete] = useState(false);

  // Modal for quick deposit into savings goal
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmountStr, setDepositAmountStr] = useState('');

  // Editing category budget limit inline
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [budgetLimitStr, setBudgetLimitStr] = useState('');

  // Modal for New Category Creation
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catBudgetStr, setCatBudgetStr] = useState('');
  const [catColor, setCatColor] = useState('#3b82f6');

  // Modal for New Reminder / Contas a Vencer
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [remTitle, setRemTitle] = useState('');
  const [remAmountStr, setRemAmountStr] = useState('');
  const [remDueDate, setRemDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [remCategory, setRemCategory] = useState(categories[0]?.name || 'Moradia & Contas');
  const [remPaymentMethod, setRemPaymentMethod] = useState<PaymentMethod>('pix');
  const [remNotes, setRemNotes] = useState('');

  // Lock body scroll when any modal is open
  React.useEffect(() => {
    const isAnyModalOpen = isGoalModalOpen || isCategoryModalOpen || isReminderModalOpen || !!depositGoal;
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isGoalModalOpen, isCategoryModalOpen, isReminderModalOpen, depositGoal]);

  // Month transactions for budget comparisons
  const monthTransactions = selectedMonth === 'all'
    ? transactions
    : transactions.filter(t => t.date.startsWith(selectedMonth));

  // Category spending in current month
  const categorySpentMap: Record<string, number> = {};
  monthTransactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      categorySpentMap[t.category] = (categorySpentMap[t.category] || 0) + t.amount;
    });

  // Open Create/Edit Goal
  const handleOpenGoalModal = (goal?: SavingsGoal) => {
    setIsConfirmingGoalDelete(false);
    if (goal) {
      setEditingGoal(goal);
      setGoalTitle(goal.title);
      setGoalTargetStr(String(goal.targetAmount));
      setGoalCurrentStr(String(goal.currentAmount));
      setGoalDeadline(goal.deadline || '');
      setGoalColor(goal.color);
    } else {
      setEditingGoal(null);
      setGoalTitle('');
      setGoalTargetStr('');
      setGoalCurrentStr('0');
      setGoalDeadline('');
      setGoalColor('#10b981');
    }
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTargetStr.replace(',', '.'));
    const current = parseFloat(goalCurrentStr.replace(',', '.')) || 0;

    if (!goalTitle.trim() || isNaN(target) || target <= 0) return;

    if (editingGoal) {
      const updated = savingsGoals.map(g => 
        g.id === editingGoal.id 
          ? {
              ...g,
              title: goalTitle.trim(),
              targetAmount: target,
              currentAmount: current,
              deadline: goalDeadline || undefined,
              color: goalColor,
            }
          : g
      );
      onUpdateGoals(updated);
    } else {
      const newGoal: SavingsGoal = {
        id: `goal-${Date.now()}`,
        title: goalTitle.trim(),
        targetAmount: target,
        currentAmount: current,
        deadline: goalDeadline || undefined,
        color: goalColor,
        icon: 'Target',
      };
      onUpdateGoals([...savingsGoals, newGoal]);
    }

    setIsGoalModalOpen(false);
  };

  const handleDeleteGoal = (id: string) => {
    onUpdateGoals(savingsGoals.filter(g => g.id !== id));
    setIsConfirmingGoalDelete(false);
    setIsGoalModalOpen(false);
  };

  const handleApplyDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoal) return;
    const added = parseFloat(depositAmountStr.replace(',', '.'));
    if (isNaN(added) || added <= 0) return;

    const newAmount = depositGoal.currentAmount + added;
    const hitTarget = newAmount >= depositGoal.targetAmount && depositGoal.currentAmount < depositGoal.targetAmount;

    const today = new Date().toISOString().slice(0, 10);
    const newHistory: GoalHistoryEntry = { date: today, amount: added };
    
    const updated = savingsGoals.map(g => 
      g.id === depositGoal.id 
        ? { 
            ...g, 
            currentAmount: newAmount,
            history: [...(g.history || []), newHistory]
          }
        : g
    );
    onUpdateGoals(updated);

    // Also record a transaction for this deposit if the handler exists
    if (onAddTransaction) {
      onAddTransaction({
        type: 'expense',
        amount: added,
        description: `Depósito Meta: ${depositGoal.title}`,
        category: 'Outros Gastos', // Or maybe a dedicated 'Metas' category
        date: today,
        paymentMethod: 'bank_transfer',
        notes: `Aporte planejado para a meta ${depositGoal.title}`,
        isPaid: true
      });
    }

    if (hitTarget) {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }

    setDepositGoal(null);
    setDepositAmountStr('');
  };

  const handleSaveCategoryBudget = (catId: string) => {
    const val = parseFloat(budgetLimitStr.replace(',', '.'));
    const updated = categories.map(c => 
      c.id === catId ? { ...c, monthlyBudget: isNaN(val) ? undefined : val } : c
    );
    onUpdateCategories(updated);
    setEditingCategoryId(null);
  };

  // Save New Category
  const handleSaveNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const budgetVal = parseFloat(catBudgetStr.replace(',', '.')) || undefined;
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: catName.trim(),
      type: catType,
      color: catColor,
      icon: catType === 'expense' ? 'Tag' : 'TrendingUp',
      monthlyBudget: catType === 'expense' ? budgetVal : undefined,
    };
    onUpdateCategories([...categories, newCat]);
    setIsCategoryModalOpen(false);
    setCatName('');
    setCatBudgetStr('');
  };

  // Save Reminder
  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(remAmountStr.replace(',', '.'));
    if (!remTitle.trim() || isNaN(amt) || amt <= 0) return;

    const chosenCat = remCategory && categories.some(c => c.name === remCategory)
      ? remCategory
      : (categories.find(c => c.type === 'expense')?.name || categories[0]?.name || 'Moradia & Contas');

    const newRem: Reminder = {
      id: `rem-${Date.now()}`,
      title: remTitle.trim(),
      amount: amt,
      dueDate: remDueDate,
      category: chosenCat,
      isPaid: false,
      paymentMethod: remPaymentMethod,
      notes: remNotes.trim() || undefined,
    };
    onUpdateReminders([newRem, ...reminders]);
    setIsReminderModalOpen(false);
    setRemTitle('');
    setRemAmountStr('');
    setRemNotes('');
  };

  const handleToggleReminderPaid = (rem: Reminder) => {
    const updated = reminders.map(r => {
      if (r.id === rem.id) {
        const nextPaid = !r.isPaid;
        // If marking as paid, optionally record transaction
        if (nextPaid && onAddTransaction) {
          onAddTransaction({
            type: 'expense',
            amount: r.amount,
            description: `Pagamento: ${r.title}`,
            category: r.category,
            date: new Date().toISOString().slice(0, 10),
            paymentMethod: r.paymentMethod || 'pix',
            notes: r.notes,
          });
        }
        return { ...r, isPaid: nextPaid };
      }
      return r;
    });
    onUpdateReminders(updated);
  };

  const handleDeleteReminder = (id: string) => {
    onUpdateReminders(reminders.filter(r => r.id !== id));
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4 pb-24 animate-in fade-in">
      {/* Sub tabs: Metas, Orçamentos, Lembretes */}
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          onClick={() => setActiveSubTab('savings')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition ${
            activeSubTab === 'savings'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Metas</span>
        </button>
        <button
          onClick={() => setActiveSubTab('budgets')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition ${
            activeSubTab === 'budgets'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUpIcon className="w-3.5 h-3.5" />
          <span className="truncate">Orçamentos</span>
        </button>
        <button
          onClick={() => setActiveSubTab('reminders')}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition ${
            activeSubTab === 'reminders'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Lembretes</span>
        </button>
      </div>

      {/* SUB-TAB 1: SAVINGS GOALS */}
      {activeSubTab === 'savings' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Objetivos de Acumulação</h2>
              <p className="text-[11px] text-slate-400">Gerenciamento de reservas e metas de capital</p>
            </div>
            <button
              onClick={() => handleOpenGoalModal()}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Nova Meta</span>
            </button>
          </div>

          {savingsGoals.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
              <Award className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
              <p className="text-xs text-slate-300">Nenhuma meta cadastrada ainda.</p>
              <button
                onClick={() => handleOpenGoalModal()}
                className="px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl"
              >
                Criar Primeira Meta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {savingsGoals.map(goal => (
                <MemoizedGoalItem
                  key={goal.id}
                  goal={goal}
                  onDeposit={setDepositGoal}
                  onEdit={handleOpenGoalModal}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: BUDGETS & CATEGORIES */}
      {activeSubTab === 'budgets' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Planejamento Orçamentário por Categoria</h2>
              <p className="text-[11px] text-slate-400">Defina e monitore objetivos de gastos mensais</p>
            </div>
            <button
              onClick={() => {
                setCatName('');
                setCatType('expense');
                setCatBudgetStr('');
                setCatColor('#3b82f6');
                setIsCategoryModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-md active:scale-95"
            >
              <FolderPlus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Nova Categoria</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {categories.filter(c => c.type === 'expense').map(cat => {
              const spent = categorySpentMap[cat.name] || 0;
              const limit = cat.monthlyBudget || 0;
              const hasLimit = limit > 0;
              const percent = hasLimit ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
              const isOver = hasLimit && spent > limit;

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={cat.id}
                  className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm space-y-2 gpu-layer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: cat.color }} 
                      />
                      <span className="text-xs font-bold text-white">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{formatBRL(spent)}</span>
                      {hasLimit && (
                        <span className="text-[11px] text-slate-400">/ {formatBRL(limit)}</span>
                      )}
                      <button
                        onClick={() => {
                          setEditingCategoryId(cat.id);
                          setBudgetLimitStr(cat.monthlyBudget ? String(cat.monthlyBudget) : '');
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                        title="Definir Teto"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Edit Budget Form */}
                  {editingCategoryId === cat.id ? (
                    <div className="pt-2 flex items-center gap-2 border-t border-slate-800">
                      <input
                        type="number"
                        step="10"
                        placeholder="Teto mensal (R$)"
                        value={budgetLimitStr}
                        onChange={(e) => setBudgetLimitStr(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                      />
                      <button
                        onClick={() => handleSaveCategoryBudget(cat.id)}
                        className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => setEditingCategoryId(null)}
                        className="p-1.5 text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : hasLimit ? (
                    <div className="space-y-1">
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            isOver ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {isOver && (
                        <p className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Teto ultrapassado em {formatBRL(spent - limit)}!
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-500 italic">Nenhum teto definido (clique no lápis para definir)</p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: REMINDERS / CONTAS A VENCER */}
      {activeSubTab === 'reminders' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Gestão de Compromissos & Vencimentos</h2>
              <p className="text-[11px] text-slate-400">Monitoramento de faturas e obrigações financeiras</p>
            </div>
            <button
              onClick={() => {
                setRemTitle('');
                setRemAmountStr('');
                setRemDueDate(new Date().toISOString().slice(0, 10));
                setRemNotes('');
                const defaultCat = categories.find(c => c.type === 'expense')?.name || categories[0]?.name || 'Moradia & Contas';
                setRemCategory(defaultCat);
                setIsReminderModalOpen(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Novo Lembrete</span>
            </button>
          </div>

          {reminders.length === 0 ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-3">
              <Bell className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
              <p className="text-xs text-slate-300">Nenhum lembrete de conta cadastrado.</p>
              <button
                onClick={() => {
                  setRemTitle('');
                  setRemAmountStr('');
                  setRemDueDate(new Date().toISOString().slice(0, 10));
                  setRemNotes('');
                  const defaultCat = categories.find(c => c.type === 'expense')?.name || categories[0]?.name || 'Moradia & Contas';
                  setRemCategory(defaultCat);
                  setIsReminderModalOpen(true);
                }}
                className="px-4 py-2 bg-emerald-500 text-slate-950 text-xs font-bold rounded-xl"
              >
                Adicionar Lembrete
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reminders.map(rem => (
                <MemoizedReminderItem
                  key={rem.id}
                  rem={rem}
                  todayStr={todayStr}
                  onTogglePaid={handleToggleReminderPaid}
                  onDelete={handleDeleteReminder}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85dvh] sm:max-h-[90dvh] overflow-hidden gpu-layer"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-emerald-400" />
                  Criar Nova Categoria
                </h3>
                <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 text-slate-400 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNewCategory} className="p-5 overflow-y-auto mobile-scroll space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nome da Categoria</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Pet / Animais, Streaming, etc."
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCatType('expense')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        catType === 'expense' 
                          ? 'bg-red-500/10 border-red-500 text-red-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Despesa
                    </button>
                    <button
                      type="button"
                      onClick={() => setCatType('income')}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        catType === 'income' 
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      Receita
                    </button>
                  </div>
                </div>

                {catType === 'expense' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Teto de Gasto Mensal (R$) (Opcional)</label>
                    <input
                      type="number"
                      step="50"
                      placeholder="Ex: 400,00"
                      value={catBudgetStr}
                      onChange={(e) => setCatBudgetStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cor Identificadora</label>
                  <div className="flex items-center gap-2">
                    {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCatColor(color)}
                        className={`w-7 h-7 rounded-full border-2 transition ${
                          catColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95"
                >
                  Salvar Categoria
                </button>
                <div className="h-6 shrink-0" /> {/* Extra bottom padding for scroll */}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: NEW REMINDER */}
      <AnimatePresence>
        {isReminderModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85dvh] sm:max-h-[90dvh] overflow-hidden gpu-layer"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-400" />
                  Novo Lembrete de Conta
                </h3>
                <button onClick={() => setIsReminderModalOpen(false)} className="p-1 text-slate-400 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveReminder} className="p-5 overflow-y-auto mobile-scroll space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Título / Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Conta de Luz, Aluguel, etc."
                    value={remTitle}
                    onChange={(e) => setRemTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 150,00"
                    value={remAmountStr}
                    onChange={(e) => setRemAmountStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Data de Vencimento</label>
                  <input
                    type="date"
                    required
                    value={remDueDate}
                    onChange={(e) => setRemDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoria</label>
                  <select
                    value={remCategory}
                    onChange={(e) => setRemCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    {categories.filter(c => c.type === 'expense').map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95"
                >
                  Salvar Lembrete
                </button>
                <div className="h-6 shrink-0" /> {/* Extra bottom padding for scroll */}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: EDIT/CREATE SAVINGS GOAL */}
      <AnimatePresence>
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85dvh] sm:max-h-[90dvh] overflow-hidden gpu-layer"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
                <h3 className="text-sm font-bold text-white">
                  {editingGoal ? 'Editar Meta de Economia' : 'Nova Meta de Economia'}
                </h3>
                <button onClick={() => setIsGoalModalOpen(false)} className="p-1 text-slate-400 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="p-5 overflow-y-auto mobile-scroll space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Título da Meta</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Viagem de Férias"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                {editingGoal && (
                  <GoalSimulator 
                    targetAmount={parseFloat(goalTargetStr) || 0} 
                    currentAmount={parseFloat(goalCurrentStr) || 0} 
                  />
                )}

                {editingGoal && editingGoal.history && editingGoal.history.length > 0 && (
                  <div className="bg-slate-950/40 border border-slate-800/50 rounded-2xl p-3 space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <History className="w-3 h-3" />
                      Histórico de Aportes
                    </div>
                    {editingGoal.history.slice().reverse().map((h, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/30 last:border-0">
                        <span className="text-slate-400">{formatDateBR(h.date)}</span>
                        <span className="text-emerald-400 font-bold">+{formatBRL(h.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Valor Alvo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 5000"
                      value={goalTargetStr}
                      onChange={(e) => setGoalTargetStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Já Guardado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 1000"
                      value={goalCurrentStr}
                      onChange={(e) => setGoalCurrentStr(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Prazo Final (Opcional)</label>
                  <input
                    type="date"
                    value={goalDeadline}
                    onChange={(e) => setGoalDeadline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Cor</label>
                  <div className="flex items-center gap-2">
                    {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'].map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setGoalColor(color)}
                        className={`w-7 h-7 rounded-full border-2 transition ${
                          goalColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-3">
                  {isConfirmingGoalDelete ? (
                    <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-2xl flex items-center justify-between gap-2">
                      <span className="text-xs text-red-300 font-semibold">Excluir esta meta?</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => editingGoal && handleDeleteGoal(editingGoal.id)}
                          className="px-3 py-1.5 bg-red-600 text-white font-bold text-xs rounded-xl"
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsConfirmingGoalDelete(false)}
                          className="px-2.5 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-xl"
                        >
                          Não
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {editingGoal && (
                        <button
                          type="button"
                          onClick={() => setIsConfirmingGoalDelete(true)}
                          className="p-2.5 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition flex items-center gap-1.5"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="text-xs font-semibold">Excluir</span>
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95"
                      >
                        Salvar Meta
                      </button>
                    </div>
                  )}
                </div>
                <div className="h-6 shrink-0" /> {/* Extra bottom padding for scroll */}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK DEPOSIT MODAL */}
      <AnimatePresence>
        {depositGoal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85dvh] sm:max-h-[90dvh] overflow-hidden gpu-layer"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
                <div>
                  <h3 className="text-sm font-bold text-white">Depositar na Meta</h3>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    Alvo: <strong className="text-emerald-400">{depositGoal.title}</strong>
                  </p>
                </div>
                <button onClick={() => setDepositGoal(null)} className="p-1 text-slate-400 hover:text-white transition">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleApplyDeposit} className="p-5 overflow-y-auto mobile-scroll space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Quanto você guardou? (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="Ex: 250,00"
                    value={depositAmountStr}
                    onChange={(e) => setDepositAmountStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {['50', '100', '250'].map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setDepositAmountStr(chip)}
                      className="py-1 text-[11px] bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition active:scale-95"
                    >
                      + R$ {chip}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition active:scale-95"
                >
                  Confirmar Depósito
                </button>
                <div className="h-6 shrink-0" /> {/* Extra bottom padding for scroll */}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
});

GoalsTab.displayName = 'GoalsTab';

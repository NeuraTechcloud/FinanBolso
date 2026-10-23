import React, { useState } from 'react';
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
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SavingsGoal, Category, Transaction } from '../../types/finance';
import { formatBRL, formatDateBR } from '../../services/exportService';

interface GoalsTabProps {
  savingsGoals: SavingsGoal[];
  categories: Category[];
  transactions: Transaction[];
  selectedMonth: string;
  onUpdateGoals: (goals: SavingsGoal[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
}

export const GoalsTab: React.FC<GoalsTabProps> = ({
  savingsGoals,
  categories,
  transactions,
  selectedMonth,
  onUpdateGoals,
  onUpdateCategories,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'savings' | 'budgets'>('savings');

  // Modal for new/edit savings goal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalCurrentStr, setGoalCurrentStr] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalColor, setGoalColor] = useState('#10b981');

  // Modal for quick deposit into savings goal
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmountStr, setDepositAmountStr] = useState('');

  // Editing category budget limit inline
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [budgetLimitStr, setBudgetLimitStr] = useState('');
  const [isConfirmingGoalDelete, setIsConfirmingGoalDelete] = useState(false);

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

    if (!goalTitle.trim() || isNaN(target) || target <= 0) {
      return;
    }

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

  // Quick Deposit Handler
  const handleApplyDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositGoal) return;
    const added = parseFloat(depositAmountStr.replace(',', '.'));
    if (isNaN(added) || added <= 0) return;

    const newAmount = depositGoal.currentAmount + added;
    const hitTarget = newAmount >= depositGoal.targetAmount && depositGoal.currentAmount < depositGoal.targetAmount;

    const updated = savingsGoals.map(g => 
      g.id === depositGoal.id 
        ? { ...g, currentAmount: newAmount }
        : g
    );
    onUpdateGoals(updated);

    if (hitTarget) {
      // Fire confetti celebration!
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    setDepositGoal(null);
    setDepositAmountStr('');
  };

  // Update Category Budget
  const handleSaveCategoryBudget = (catId: string) => {
    const val = parseFloat(budgetLimitStr.replace(',', '.'));
    const updated = categories.map(c => 
      c.id === catId ? { ...c, monthlyBudget: isNaN(val) ? undefined : val } : c
    );
    onUpdateCategories(updated);
    setEditingCategoryId(null);
  };

  return (
    <div className="space-y-4 pb-24 animate-in fade-in">
      {/* Sub tabs: Metas de Poupança vs Tetos de Gastos */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
        <button
          onClick={() => setActiveSubTab('savings')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'savings'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Metas de Economia</span>
        </button>
        <button
          onClick={() => setActiveSubTab('budgets')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'budgets'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Tetos por Categoria</span>
        </button>
      </div>

      {/* 1. METAS DE ECONOMIA */}
      {activeSubTab === 'savings' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Sonhos & Metas Financeiras</h3>
              <p className="text-xs text-slate-400">Acompanhe seu progresso de poupança</p>
            </div>
            <button
              onClick={() => handleOpenGoalModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 text-xs font-semibold active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Meta</span>
            </button>
          </div>

          {savingsGoals.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
              <Award className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-medium text-white">Nenhuma meta cadastrada</p>
              <p className="text-xs text-slate-400">Defina objetivos como Viagem, Reserva ou Aquisição de bens.</p>
              <button
                onClick={() => handleOpenGoalModal()}
                className="mt-3 px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                Criar Primeira Meta
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {savingsGoals.map((goal) => {
                const progressPct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                const isCompleted = goal.currentAmount >= goal.targetAmount;

                return (
                  <div
                    key={goal.id}
                    className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm space-y-3 relative overflow-hidden"
                  >
                    {isCompleted && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-bold text-emerald-400">
                        <Check className="w-3 h-3 stroke-[3]" /> Concluída!
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: goal.color }} />
                          <h4 className="text-sm font-bold text-white">{goal.title}</h4>
                        </div>
                        {goal.deadline && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Prazo: {formatDateBR(goal.deadline)}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => handleOpenGoalModal(goal)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                        title="Editar Meta"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-white">{formatBRL(goal.currentAmount)}</span>
                        <span className="text-slate-400">de {formatBRL(goal.targetAmount)} ({progressPct}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progressPct}%`,
                            backgroundColor: goal.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick deposit button */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-400">
                        {isCompleted
                          ? 'Parabéns! Meta atingida com sucesso!'
                          : `Faltam ${formatBRL(goal.targetAmount - goal.currentAmount)}`
                        }
                      </span>
                      <button
                        onClick={() => {
                          setDepositGoal(goal);
                          setDepositAmountStr('');
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 border border-slate-700 transition active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Depositar</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. TETOS DE GASTOS POR CATEGORIA */}
      {activeSubTab === 'budgets' && (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-bold text-white">Tetos de Gastos Mensais</h3>
            <p className="text-xs text-slate-400">
              Defina limites para não estourar seu orçamento em cada categoria.
            </p>
          </div>

          <div className="space-y-2.5">
            {categories.filter(c => c.type === 'expense').map((cat) => {
              const spent = categorySpentMap[cat.name] || 0;
              const limit = cat.monthlyBudget || 0;
              const hasLimit = limit > 0;
              const pct = hasLimit ? Math.round((spent / limit) * 100) : 0;
              const isOver = hasLimit && spent > limit;
              const isEditing = editingCategoryId === cat.id;

              return (
                <div
                  key={cat.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-xs font-bold text-white">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="50"
                            placeholder="Limite R$"
                            value={budgetLimitStr}
                            onChange={(e) => setBudgetLimitStr(e.target.value)}
                            className="w-24 bg-slate-950 border border-emerald-500 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveCategoryBudget(cat.id)}
                            className="p-1 bg-emerald-500 text-slate-950 rounded-lg"
                            title="Salvar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingCategoryId(null)}
                            className="p-1 bg-slate-800 text-slate-400 rounded-lg"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-300">
                            {hasLimit ? `Teto: ${formatBRL(limit)}` : 'Sem teto'}
                          </span>
                          <button
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setBudgetLimitStr(cat.monthlyBudget ? String(cat.monthlyBudget) : '');
                            }}
                            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition"
                            title="Ajustar limite"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Gasto: <strong className="text-white">{formatBRL(spent)}</strong></span>
                      {hasLimit && (
                        <span className={isOver ? 'text-red-400 font-bold' : pct > 80 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                          {isOver ? `Estourado (+${formatBRL(spent - limit)})` : `${pct}% do teto`}
                        </span>
                      )}
                    </div>
                    {hasLimit && (
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isOver ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goal Create/Edit Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white">
                {editingGoal ? 'Editar Meta' : 'Nova Meta de Economia'}
              </h3>
              <button
                onClick={() => setIsGoalModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Título da Meta</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reserva Financeira, Carro Novo"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Valor Alvo (R$)</label>
                  <input
                    type="number"
                    step="10"
                    required
                    placeholder="10000"
                    value={goalTargetStr}
                    onChange={(e) => setGoalTargetStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Guardado Atual (R$)</label>
                  <input
                    type="number"
                    step="10"
                    placeholder="0"
                    value={goalCurrentStr}
                    onChange={(e) => setGoalCurrentStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Data Limite (opcional)</label>
                <input
                  type="date"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Cor</label>
                <div className="flex items-center gap-2">
                  {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setGoalColor(color)}
                      className={`w-7 h-7 rounded-full border-2 transition ${
                        goalColor === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-3">
                {isConfirmingGoalDelete ? (
                  <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-2xl flex items-center justify-between gap-2 animate-in fade-in">
                    <span className="text-xs text-red-300 font-semibold">Excluir esta meta?</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => editingGoal && handleDeleteGoal(editingGoal.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
                      >
                        Sim, Excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingGoalDelete(false)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {editingGoal && (
                      <button
                        type="button"
                        onClick={() => setIsConfirmingGoalDelete(true)}
                        className="p-2.5 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition active:scale-95 flex items-center gap-1.5"
                        title="Excluir meta"
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
            </form>
          </div>
        </div>
      )}

      {/* Quick Deposit Modal */}
      {depositGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Depositar na Meta</h3>
              <button
                onClick={() => setDepositGoal(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-3">
              Guardar valor para: <strong className="text-emerald-400">{depositGoal.title}</strong>
            </p>

            <form onSubmit={handleApplyDeposit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Quanto você guardou? (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  autoFocus
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
                    className="py-1 text-[11px] bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                  >
                    + R$ {chip}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition"
              >
                Confirmar Depósito
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

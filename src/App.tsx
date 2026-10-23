import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storage';
import { Transaction, Category, SavingsGoal, QuickPreset, TransactionType, Reminder, UserSubscription } from './types/finance';
import { ActivationService } from './services/activationService';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TransactionModal } from './components/TransactionModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { ManagerPanelModal } from './components/ManagerPanelModal';
import { HomeTab } from './components/tabs/HomeTab';
import { ChartsTab } from './components/tabs/ChartsTab';
import { TransactionsTab } from './components/tabs/TransactionsTab';
import { GoalsTab } from './components/tabs/GoalsTab';
import { ExportTab } from './components/tabs/ExportTab';
import { Wifi, Battery, Signal, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatBRL } from './services/exportService';
import { TransactionEffectOverlay, EffectType } from './components/TransactionEffectOverlay';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription>(() => StorageService.getSubscription());
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [isPhoneFrame, setIsPhoneFrame] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>('expense');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Quick Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Distinct Effects State for Income vs Expense
  const [activeEffect, setActiveEffect] = useState<{
    type: EffectType;
    amount: number;
    description: string;
  }>({ type: null, amount: 0, description: '' });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Expose subscription and manager modal openers globally
  useEffect(() => {
    (window as any)._openSubscriptionModal = () => setIsSubscriptionModalOpen(true);
    (window as any)._openManagerModal = () => setIsManagerModalOpen(true);
    return () => {
      delete (window as any)._openSubscriptionModal;
      delete (window as any)._openManagerModal;
    };
  }, []);

  // Load from local offline storage on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedTx = StorageService.getTransactions();
    const loadedCats = StorageService.getCategories();
    const loadedGoals = StorageService.getSavingsGoals();
    const loadedRem = StorageService.getReminders();
    setTransactions(loadedTx);
    setCategories(loadedCats);
    setSavingsGoals(loadedGoals);
    setReminders(loadedRem);
  };

  // Save/Update transaction
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id' | 'createdAt'>,
    existingId?: string
  ) => {
    let updated: Transaction[];
    if (existingId) {
      updated = transactions.map(t => 
        t.id === existingId 
          ? { ...t, ...txData }
          : t
      );
      showToast('Lançamento atualizado com sucesso!');
    } else {
      const newTx: Transaction = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
      };
      updated = [newTx, ...transactions];
      setActiveEffect({
        type: txData.type,
        amount: txData.amount,
        description: txData.description,
      });
      showToast(`${txData.type === 'income' ? 'Receita' : 'Despesa'} de ${formatBRL(txData.amount)} salva!`);
    }
    setTransactions(updated);
    StorageService.saveTransactions(updated);
    setEditingTransaction(null);
  };

  // Quick 1-Tap Preset Addition
  const handleQuickAddPreset = (preset: QuickPreset) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: preset.type,
      amount: preset.defaultAmount || 25,
      description: preset.title,
      category: preset.category,
      date: todayStr,
      paymentMethod: preset.paymentMethod,
      createdAt: Date.now(),
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    StorageService.saveTransactions(updated);
    setActiveEffect({
      type: preset.type,
      amount: newTx.amount,
      description: preset.title,
    });
    showToast(`✓ ${preset.title} (${formatBRL(newTx.amount)}) lançado no celular!`);
  };



  // Delete transaction
  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    StorageService.saveTransactions(updated);
    setEditingTransaction(null);
    showToast('Lançamento excluído.');
  };

  // Update Savings Goals
  const handleUpdateGoals = (newGoals: SavingsGoal[]) => {
    setSavingsGoals(newGoals);
    StorageService.saveSavingsGoals(newGoals);
  };

  // Update Categories & Budgets
  const handleUpdateCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    StorageService.saveCategories(newCategories);
  };

  // Update Reminders
  const handleUpdateReminders = (newReminders: Reminder[]) => {
    setReminders(newReminders);
    StorageService.saveReminders(newReminders);
  };

  // Activate Pro Subscription with duration (30 or 365 days) and distinct activationId
  const handleActivatePro = (planName: string, durationDays: 30 | 365 = 365, activationId?: string) => {
    const days: 30 | 365 = durationDays === 30 ? 30 : 365;
    const newSub = ActivationService.buildSubscription(days, activationId);
    newSub.planName = planName;
    setSubscription(newSub);
    StorageService.saveSubscription(newSub);
    ActivationService.recordSubscriber(newSub);
    showToast(`✓ Plano Pro (${days} Dias) Ativado! ID: ${newSub.activationId}`);
  };

  const handleResetSubscription = () => {
    const freeSub: UserSubscription = {
      isPro: false,
      planName: 'Plano Gratuito',
      planType: 'free',
      expiresAt: 0,
    };
    setSubscription(freeSub);
    StorageService.saveSubscription(freeSub);
    showToast('✓ Plano Pro removido. Aparelho redefinido para o Gratuito.');
  };

  // Open modal for editing
  const handleSelectTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setModalType(tx.type);
    setIsModalOpen(true);
  };

  // Open modal for creating
  const handleOpenAddModal = (prefillType: TransactionType = 'expense') => {
    setEditingTransaction(null);
    setModalType(prefillType);
    setIsModalOpen(true);
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center overflow-hidden antialiased selection:bg-emerald-500 selection:text-white">
      {/* Offline Alert Banner */}
      <OfflineIndicator />

      {/* Floating Instant Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-emerald-500 text-slate-950 font-bold px-4 py-2 rounded-2xl shadow-2xl text-xs animate-in fade-in slide-in-from-top-3 gpu-layer">
          <CheckCircle2 className="w-4 h-4 shrink-0 stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Distinct Visual/Audio Effect Overlay for Income vs Expense */}
      <TransactionEffectOverlay
        effectType={activeEffect.type}
        amount={activeEffect.amount}
        description={activeEffect.description}
        onClear={() => setActiveEffect({ type: null, amount: 0, description: '' })}
      />

      {/* Container: Smartphone frame or full width with strict viewport height for smooth scrolling */}
      <div 
        className={`w-full transition-all duration-300 flex flex-col relative h-[100dvh] overflow-hidden ${
          isPhoneFrame 
            ? 'max-w-md md:h-[860px] md:max-h-[92vh] md:rounded-[42px] md:border-[10px] md:border-slate-800 md:shadow-2xl md:shadow-emerald-950/40 bg-slate-950' 
            : 'max-w-4xl bg-slate-950'
        }`}
      >
        {/* Mobile Phone Mockup Status Bar on Desktop */}
        {isPhoneFrame && (
          <div className="hidden md:flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-slate-400 bg-slate-950 select-none shrink-0">
            <span>9:41</span>
            {/* Dynamic Island / Speaker Pill */}
            <div className="w-20 h-4 bg-slate-900 rounded-full border border-slate-800 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        )}

        {/* App Header (shrink-0 so it never collapses) */}
        <div className="shrink-0">
          <Header
            selectedMonth={selectedMonth}
            onSelectMonth={setSelectedMonth}
            isPhoneFrame={isPhoneFrame}
            onTogglePhoneFrame={() => setIsPhoneFrame(!isPhoneFrame)}
            isPro={subscription.isPro}
            expiresAt={subscription.expiresAt}
            activationId={subscription.activationId}
          />
        </div>

        {/* Tab Content with min-h-0 and overflow-y-auto so scrolling is 100% smooth */}
        <main 
          id="app-main-scroll"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-scroll px-4 pt-3 pb-24"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
              className="w-full"
            >
              {currentTab === 'home' && (
                <HomeTab
                  transactions={transactions}
                  categories={categories}
                  selectedMonth={selectedMonth}
                  isPro={subscription.isPro}
                  onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
                  onOpenAddModal={handleOpenAddModal}
                  onSelectTransaction={handleSelectTransaction}
                  onGoToTab={setCurrentTab}
                  onQuickAddPreset={handleQuickAddPreset}
                />
              )}

              {currentTab === 'charts' && (
                <ChartsTab
                  transactions={transactions}
                  categories={categories}
                  selectedMonth={selectedMonth}
                />
              )}

              {currentTab === 'transactions' && (
                <TransactionsTab
                  transactions={transactions}
                  categories={categories}
                  selectedMonth={selectedMonth}
                  onSelectTransaction={handleSelectTransaction}
                  onOpenAddModal={() => handleOpenAddModal('expense')}
                  isPro={subscription.isPro}
                  onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
                />
              )}

              {currentTab === 'goals' && (
                <GoalsTab
                  savingsGoals={savingsGoals}
                  categories={categories}
                  transactions={transactions}
                  reminders={reminders}
                  selectedMonth={selectedMonth}
                  onUpdateGoals={handleUpdateGoals}
                  onUpdateCategories={handleUpdateCategories}
                  onUpdateReminders={handleUpdateReminders}
                  onAddTransaction={handleSaveTransaction}
                />
              )}

              {currentTab === 'export' && (
                <ExportTab
                  transactions={transactions}
                  categories={categories}
                  savingsGoals={savingsGoals}
                  selectedMonth={selectedMonth}
                  onRefreshData={loadData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          onOpenAddModal={() => handleOpenAddModal('expense')}
        />

        {/* Transaction Create / Edit Modal */}
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
          categories={categories}
          editingTransaction={editingTransaction}
          initialType={modalType}
          isPro={subscription.isPro}
          onOpenSubscription={() => setIsSubscriptionModalOpen(true)}
        />

        {/* Subscription Modal */}
        <SubscriptionModal
          isOpen={isSubscriptionModalOpen}
          onClose={() => setIsSubscriptionModalOpen(false)}
          subscription={subscription}
          onActivatePro={handleActivatePro}
          onResetSubscription={handleResetSubscription}
        />

        {/* Manager & Admin Panel Modal */}
        <ManagerPanelModal
          isOpen={isManagerModalOpen}
          onClose={() => setIsManagerModalOpen(false)}
          onForceProGlobal={handleActivatePro}
          subscription={subscription}
        />
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from './services/storage';
import { Transaction, Category, SavingsGoal, QuickPreset, TransactionType, Reminder, UserSubscription } from './types/finance';
import { ActivationService } from './services/activationService';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { OfflineIndicator } from './components/OfflineIndicator';
import { TransactionModal } from './components/TransactionModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { ManagerPanelModal } from './components/ManagerPanelModal';
import { EmailAuthModal } from './components/EmailAuthModal';
import { HomeTab } from './components/tabs/HomeTab';
import { ChartsTab } from './components/tabs/ChartsTab';
import { TransactionsTab } from './components/tabs/TransactionsTab';
import { GoalsTab } from './components/tabs/GoalsTab';
import { ExportTab } from './components/tabs/ExportTab';
import { Wifi, Battery, Signal, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatBRL } from './services/exportService';
import { TransactionEffectOverlay, EffectType } from './components/TransactionEffectOverlay';
import { NotificationService } from './services/notificationService';
import { FirebaseProvider, useFirebase } from './contexts/FirebaseContext';
import { FirestoreService } from './services/firestore';

function AppContent() {
  const { user, signIn, logout, isSyncing } = useFirebase();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  
  // 3. Setup Notifications
  useEffect(() => {
    NotificationService.requestPermission();
  }, []);

  useEffect(() => {
    if (reminders.length > 0) {
      NotificationService.checkAndNotify(reminders);
    }
  }, [reminders]);
  const [subscription, setSubscription] = useState<UserSubscription>(() => StorageService.getSubscription());
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isEmailAuthModalOpen, setIsEmailAuthModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [transactionsSubTab, setTransactionsSubTab] = useState<'history' | 'future'>('history');
  const [isPhoneFrame, setIsPhoneFrame] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return false;
    }
    return true;
  });

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

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const loadData = useCallback(() => {
    const loadedTx = StorageService.getTransactions();
    const loadedCats = StorageService.getCategories();
    const loadedGoals = StorageService.getSavingsGoals();
    const loadedRem = StorageService.getReminders();
    setTransactions(loadedTx);
    setCategories(loadedCats);
    setSavingsGoals(loadedGoals);
    setReminders(loadedRem);
  }, []);

  // Expose subscription and manager modal openers globally
  useEffect(() => {
    (window as any)._openSubscriptionModal = () => setIsSubscriptionModalOpen(true);
    (window as any)._openManagerModal = () => setIsManagerModalOpen(true);
    (window as any)._openEmailAuthModal = () => setIsEmailAuthModalOpen(true);
    return () => {
      delete (window as any)._openSubscriptionModal;
      delete (window as any)._openManagerModal;
      delete (window as any)._openEmailAuthModal;
    };
  }, []);

  // 1. Load from local offline storage on mount & dismiss splash preloader smoothly
  useEffect(() => {
    loadData();

    // Smooth fade-out transition for the HTML splash preloader
    const splash = document.getElementById('app-splash');
    if (splash) {
      requestAnimationFrame(() => {
        splash.classList.add('fade-out');
        const timer = setTimeout(() => {
          splash.remove();
        }, 650);
        return () => clearTimeout(timer);
      });
    }
  }, [loadData]);

  // 2. Register device presence and sync Pro plan on launch or when user changes
  useEffect(() => {
    let isMounted = true;
    const initDevice = async () => {
      try {
        const currentSub = StorageService.getSubscription();
        const updatedSub = await ActivationService.registerDevicePresence(currentSub);
        if (isMounted && updatedSub) {
          setSubscription(updatedSub);
        }
      } catch (err) {
        console.error('Device registration failed:', err);
      }
    };

    initDevice();
    return () => {
      isMounted = false;
    };
  }, [user?.uid]);

  // Firestore Real-time Sync
  useEffect(() => {
    if (!user) return;

    // Use a single cleanup for all listeners to ensure zero memory leaks
    const unsubs: Array<() => void> = [];

    // Subscribe to User document to automatically sync Pro subscription by email
    unsubs.push(FirestoreService.subscribeUserDoc(user.uid, (userData) => {
      if (userData && userData.subscription && userData.subscription.isPro) {
        const cloudSub: UserSubscription = userData.subscription;
        StorageService.saveSubscription(cloudSub);
        setSubscription(cloudSub);
      } else {
        const currentLocal = StorageService.getSubscription();
        if (currentLocal && currentLocal.isPro) {
          FirestoreService.saveUserSubscription(user.uid, currentLocal);
        }
      }
    }));

    unsubs.push(FirestoreService.subscribeTransactions(user.uid, (txs) => {
      setTransactions(txs.sort((a, b) => b.createdAt - a.createdAt));
      StorageService.saveTransactions(txs);
    }));

    unsubs.push(FirestoreService.subscribeCategories(user.uid, (cats) => {
      if (cats.length > 0) {
        setCategories(cats);
        StorageService.saveCategories(cats);
      }
    }));

    unsubs.push(FirestoreService.subscribeGoals(user.uid, (goals) => {
      setSavingsGoals(goals);
      StorageService.saveSavingsGoals(goals);
    }));

    unsubs.push(FirestoreService.subscribeReminders(user.uid, (rems) => {
      setReminders(rems);
      StorageService.saveReminders(rems);
    }));

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [user]);

  // Save/Update transaction
  const handleSaveTransaction = useCallback((
    txData: Omit<Transaction, 'id' | 'createdAt'> | Array<Omit<Transaction, 'id' | 'createdAt'>>,
    existingId?: string
  ) => {
    if (Array.isArray(txData)) {
      const newTxs: Transaction[] = txData.map((item, idx) => ({
        ...item,
        id: `tx-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now() + idx,
      }));

      // 1. Optimistic update in local state and offline storage
      const updated = [...newTxs, ...transactions];
      setTransactions(updated);
      StorageService.saveTransactions(updated);

      // 2. Sync to Firestore if user logged in
      if (user) {
        newTxs.forEach(t => {
          FirestoreService.saveTransaction(user.uid, t).catch(err => {
            console.error('Erro ao salvar no Firestore:', err);
          });
        });
      }

      setActiveEffect({
        type: newTxs[0].type,
        amount: newTxs[0].amount,
        description: newTxs[0].description,
      });
      showToast(`✓ ${newTxs.length} lançamentos mensais criados com sucesso!`);
      setEditingTransaction(null);
      return;
    }

    let newTx: Transaction;
    if (existingId) {
      const existing = transactions.find(t => t.id === existingId);
      newTx = { 
        ...existing!,
        ...txData,
        updatedAt: Date.now()
      };
      showToast('Lançamento atualizado com sucesso!');
    } else {
      newTx = {
        ...txData,
        id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: Date.now(),
      };
      setActiveEffect({
        type: txData.type,
        amount: txData.amount,
        description: txData.description,
      });
      showToast(`${txData.type === 'income' ? 'Receita' : 'Despesa'} de ${formatBRL(txData.amount)} salva!`);
    }

    // 1. Optimistic update in local state and offline storage
    const updated = existingId 
      ? transactions.map(t => t.id === existingId ? newTx : t)
      : [newTx, ...transactions];
    setTransactions(updated);
    StorageService.saveTransactions(updated);

    // 2. Sync to Firestore if user is authenticated
    if (user) {
      FirestoreService.saveTransaction(user.uid, newTx).catch(err => {
        console.error('Erro ao salvar no Firestore:', err);
      });
    }

    setEditingTransaction(null);
  }, [transactions, showToast, user]);

  // Quick 1-Tap Preset Addition
  const handleQuickAddPreset = useCallback((preset: QuickPreset) => {
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

    if (user) {
      FirestoreService.saveTransaction(user.uid, newTx).catch(err => {
        console.error('Erro ao salvar preset no Firestore:', err);
      });
    }

    setActiveEffect({
      type: preset.type,
      amount: newTx.amount,
      description: preset.title,
    });
    showToast(`✓ ${preset.title} (${formatBRL(newTx.amount)}) lançado no celular!`);
  }, [transactions, showToast, user]);

  // Delete transaction
  const handleDeleteTransaction = useCallback((id: string, deleteEntireGroup: boolean = false) => {
    const txToDelete = transactions.find(t => t.id === id);
    if (deleteEntireGroup && txToDelete?.recurringGroupId) {
      const groupTxs = transactions.filter(t => t.recurringGroupId === txToDelete.recurringGroupId);
      const updated = transactions.filter(t => t.recurringGroupId !== txToDelete.recurringGroupId);
      setTransactions(updated);
      StorageService.saveTransactions(updated);

      if (user) {
        groupTxs.forEach(t => {
          FirestoreService.deleteTransaction(user.uid, t.id).catch(err => {
            console.error('Erro ao deletar grupo no Firestore:', err);
          });
        });
      }
      showToast(`✓ Todas as ${groupTxs.length} parcelas do grupo foram excluídas.`);
    } else {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      StorageService.saveTransactions(updated);

      if (user) {
        FirestoreService.deleteTransaction(user.uid, id).catch(err => {
          console.error('Erro ao deletar no Firestore:', err);
        });
      }
      showToast('Lançamento excluído.');
    }
    setEditingTransaction(null);
  }, [transactions, showToast, user]);

  // Toggle paid status on transaction
  const handleTogglePaid = useCallback((id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    const newPaidStatus = !tx.isPaid;
    const updatedTx: Transaction = {
      ...tx,
      isPaid: newPaidStatus,
      updatedAt: Date.now(),
    };

    // Immediate optimistic update
    const updated = transactions.map(t => t.id === id ? updatedTx : t);
    setTransactions(updated);
    StorageService.saveTransactions(updated);

    // Sync to Firestore if authenticated
    if (user) {
      FirestoreService.saveTransaction(user.uid, updatedTx).catch(err => {
        console.error('Erro ao atualizar status pago no Firestore:', err);
      });
    }

    showToast(newPaidStatus ? `✓ "${tx.description}" marcada como paga!` : `"${tx.description}" marcada como pendente.`);
  }, [transactions, user, showToast]);

  // Navigate to transactions tab with requested subtab view
  const handleNavigateToTransactions = useCallback((view?: 'all' | 'future') => {
    setTransactionsSubTab(view === 'future' ? 'future' : 'history');
    setCurrentTab('transactions');
  }, []);

  // Update Savings Goals
  const handleUpdateGoals = useCallback((newGoals: SavingsGoal[]) => {
    if (user) {
      // In a real app we might only sync the changed one, but for simplicity:
      newGoals.forEach(g => FirestoreService.saveGoal(user.uid, g));
    } else {
      setSavingsGoals(newGoals);
      StorageService.saveSavingsGoals(newGoals);
    }
  }, [user]);

  // Update Categories & Budgets
  const handleUpdateCategories = useCallback((newCategories: Category[]) => {
    if (user) {
      newCategories.forEach(c => FirestoreService.saveCategory(user.uid, c));
    } else {
      setCategories(newCategories);
      StorageService.saveCategories(newCategories);
    }
  }, [user]);

  // Update Reminders
  const handleUpdateReminders = useCallback((newReminders: Reminder[]) => {
    if (user) {
      newReminders.forEach(r => FirestoreService.saveReminder(user.uid, r));
    } else {
      setReminders(newReminders);
      StorageService.saveReminders(newReminders);
    }
  }, [user]);

  // Activate Pro Subscription
  const handleActivatePro = useCallback(async (planName: string, durationDays: 30 | 365 = 365, activationId?: string) => {
    const days: 30 | 365 = durationDays === 30 ? 30 : 365;
    const newSub = await ActivationService.buildSubscription(days, activationId);
    newSub.planName = planName;
    setSubscription(newSub);
    StorageService.saveSubscription(newSub);
    ActivationService.recordSubscriber(newSub);

    // Sync to Firestore User level if logged in
    if (user) {
      await FirestoreService.saveUserSubscription(user.uid, newSub);
    }

    showToast(`✓ Plano Pro (${days} Dias) Ativado! ID: ${newSub.activationId}`);
  }, [showToast, user]);

  const handleResetSubscription = useCallback(async () => {
    const freeSub: UserSubscription = {
      isPro: false,
      planName: 'Plano Gratuito',
      durationDays: 0,
      expiresAt: 0,
      deviceId: subscription.deviceId,
    };
    setSubscription(freeSub);
    StorageService.saveSubscription(freeSub);

    // Sync to Firestore User level if logged in
    if (user) {
      await FirestoreService.saveUserSubscription(user.uid, freeSub);
    }

    showToast('✓ Plano Pro removido. Aparelho redefinido para o Gratuito.');
  }, [showToast, user, subscription.deviceId]);

  // Open modal for editing
  const handleSelectTransaction = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    setModalType(tx.type);
    setIsModalOpen(true);
  }, []);

  // Open modal for creating
  const handleOpenAddModal = useCallback((prefillType: TransactionType = 'expense') => {
    setEditingTransaction(null);
    setModalType(prefillType);
    setIsModalOpen(true);
  }, []);

  // Memoized handlers for modals to avoid redundant re-renders
  const handleOpenSubscriptionModal = useCallback(() => setIsSubscriptionModalOpen(true), []);
  const handleCloseSubscriptionModal = useCallback(() => setIsSubscriptionModalOpen(false), []);
  const handleOpenManagerModal = useCallback(() => setIsManagerModalOpen(true), []);
  const handleCloseManagerModal = useCallback(() => setIsManagerModalOpen(false), []);
  const handleOpenEmailAuthModal = useCallback(() => setIsEmailAuthModalOpen(true), []);
  const handleCloseEmailAuthModal = useCallback(() => setIsEmailAuthModalOpen(false), []);
  const handleCloseTransactionModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  }, []);
  const handleTogglePhoneFrame = useCallback(() => setIsPhoneFrame(prev => !prev), []);

  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center overflow-hidden antialiased selection:bg-emerald-500 selection:text-white">
      {/* Offline Alert Banner */}
      <OfflineIndicator />

      {/* Syncing Overlay */}
      {isSyncing && (
        <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <p className="text-emerald-400 font-bold animate-pulse">Sincronizando seus dados...</p>
        </div>
      )}

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
            : 'max-w-6xl xl:max-w-7xl md:h-[95vh] md:max-h-[920px] md:my-auto md:rounded-3xl md:border md:border-slate-800 md:shadow-2xl md:shadow-emerald-950/30 bg-slate-950'
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
            onTogglePhoneFrame={handleTogglePhoneFrame}
            isPro={subscription.isPro}
            expiresAt={subscription.expiresAt}
            activationId={subscription.activationId}
            user={user}
            onSignIn={signIn}
            onLogout={logout}
          />
        </div>

        {/* Tab Content with min-h-0 and overflow-y-auto so scrolling is 100% smooth */}
        <main 
          id="app-main-scroll"
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain mobile-scroll px-4 pt-3 pb-36"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="w-full gpu-layer"
            >
              {currentTab === 'home' && (
                <HomeTab
                  transactions={transactions}
                  categories={categories}
                  savingsGoals={savingsGoals}
                  reminders={reminders}
                  selectedMonth={selectedMonth}
                  isPro={subscription.isPro}
                  onOpenSubscription={handleOpenSubscriptionModal}
                  onOpenAddModal={handleOpenAddModal}
                  onSelectTransaction={handleSelectTransaction}
                  onGoToTab={setCurrentTab}
                  onQuickAddPreset={handleQuickAddPreset}
                  onTogglePaid={handleTogglePaid}
                  onNavigateToTransactions={handleNavigateToTransactions}
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
                  onOpenSubscription={handleOpenSubscriptionModal}
                  defaultSubTab={transactionsSubTab}
                  onTogglePaid={handleTogglePaid}
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
          onClose={handleCloseTransactionModal}
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
          categories={categories}
          editingTransaction={editingTransaction}
          initialType={modalType}
          isPro={subscription.isPro}
          onOpenSubscription={handleOpenSubscriptionModal}
        />

        {/* Subscription Modal */}
        <SubscriptionModal
          isOpen={isSubscriptionModalOpen}
          onClose={handleCloseSubscriptionModal}
          subscription={subscription}
          onActivatePro={handleActivatePro}
          onResetSubscription={handleResetSubscription}
        />

        {/* Manager & Admin Panel Modal */}
        <ManagerPanelModal
          isOpen={isManagerModalOpen}
          onClose={handleCloseManagerModal}
          onForceProGlobal={handleActivatePro}
          onResetSubscriptionGlobal={handleResetSubscription}
          subscription={subscription}
        />
        {/* Email Auth Modal */}
        <EmailAuthModal
          isOpen={isEmailAuthModalOpen}
          onClose={handleCloseEmailAuthModal}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}

import { useMemo } from 'react';
import { Transaction, SavingsGoal, Reminder } from '../types/finance';

const isTicketTx = (t: Transaction) => {
  return t.paymentMethod === 'ticket' || 
         t.category.toLowerCase().includes('ticket') || 
         t.category.toLowerCase().includes('vr') || 
         t.category.toLowerCase().includes('va');
};

export const useNetWorth = (transactions: Transaction[], goals: SavingsGoal[], reminders: Reminder[]) => {
  return useMemo(() => {
    // 1. Calculate Liquid Cash (Historical Income - Historical Paid Expense)
    // Filter out tickets (isolated meal/food benefit) and goal transfers
    let totalCashIncome = 0;
    let totalPaidCashExpense = 0;
    let unpaidHistoricalExpense = 0;
    let futureLiabilities = 0;

    const nowStr = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      if (isTicketTx(t)) continue;

      const isGoalDeposit = t.description.toLowerCase().includes('depósito meta') || 
                            t.description.toLowerCase().includes('deposito meta') || 
                            t.category.toLowerCase().includes('meta');

      if (t.type === 'income') {
        totalCashIncome += t.amount;
      } else {
        // If it's an internal transfer to a goal, it's stored in goals, not spent into thin air
        if (isGoalDeposit) {
          continue;
        }

        if (t.date <= nowStr) {
          if (t.isPaid) {
            totalPaidCashExpense += t.amount;
          } else {
            unpaidHistoricalExpense += t.amount;
          }
        } else {
          // Future expenses only count as liabilities when NOT paid
          if (!t.isPaid) {
            futureLiabilities += t.amount;
          }
        }
      }
    }

    // 2. Sum of all money in goals (Asset - Patrimônio Guardado)
    const totalGoalsAmount = goals.reduce((acc, g) => acc + (g.currentAmount || 0), 0);

    // 3. Unpaid reminders (near term liabilities not yet recorded as transactions)
    const unpaidReminders = reminders
      .filter(r => !r.isPaid)
      .reduce((acc, r) => acc + r.amount, 0);

    // Liquid Cash: What you actually have in checking/cash (cannot be arbitrarily negative)
    const liquidCash = Math.max(0, totalCashIncome - totalPaidCashExpense);

    // Total Assets: Liquid Cash in account + Money saved in Goals
    const totalAssets = liquidCash + totalGoalsAmount;

    // Total Liabilities: ONLY remaining unpaid debts (decreases automatically as each debt is paid!)
    const totalLiabilities = unpaidHistoricalExpense + futureLiabilities + unpaidReminders;

    // Net Worth: Total Assets - Remaining Liabilities (surplus after debts)
    const netWorth = totalAssets - totalLiabilities;

    // Free balance: Cash income remaining after all historical and pending debts are covered
    const freeBalance = Math.max(0, totalCashIncome - (totalPaidCashExpense + unpaidHistoricalExpense));

    return {
      liquidCash,
      freeBalance,
      totalGoalsAmount,
      totalAssets,
      totalLiabilities,
      netWorth,
      unpaidReminders,
      futureLiabilities,
      unpaidHistoricalExpense
    };
  }, [transactions, goals, reminders]);
};


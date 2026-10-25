import { useMemo } from 'react';
import { Transaction, SavingsGoal, Reminder } from '../types/finance';

export const useNetWorth = (transactions: Transaction[], goals: SavingsGoal[], reminders: Reminder[]) => {
  return useMemo(() => {
    // 1. Calculate Liquid Cash (Historical Income - Historical Expense)
    // We only count transactions that are NOT in goals (if we had goal transactions)
    // For now, let's assume transactions are all liquid cash movements.
    let totalIncome = 0;
    let totalExpense = 0;
    let futureLiabilities = 0;

    const nowStr = new Date().toISOString().slice(0, 10);

    transactions.forEach(t => {
      // Historical balance
      if (t.date <= nowStr) {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
      } else {
        // Future liabilities (installments or recurring projected)
        if (t.type === 'expense' && !t.isPaid) {
          futureLiabilities += t.amount;
        }
      }
    });

    // 2. Sum of all money in goals
    const totalGoalsAmount = goals.reduce((acc, g) => acc + g.currentAmount, 0);

    // 3. Unpaid reminders (near term liabilities)
    const unpaidReminders = reminders
      .filter(r => !r.isPaid)
      .reduce((acc, r) => acc + r.amount, 0);

    const liquidCash = totalIncome - totalExpense;
    const totalAssets = liquidCash + totalGoalsAmount;
    const totalLiabilities = futureLiabilities + unpaidReminders;
    const netWorth = totalAssets - totalLiabilities;

    return {
      liquidCash,
      totalGoalsAmount,
      totalAssets,
      totalLiabilities,
      netWorth,
      unpaidReminders,
      futureLiabilities
    };
  }, [transactions, goals, reminders]);
};

import { useMemo } from 'react';
import { Transaction, SavingsGoal, Reminder } from '../types/finance';

export const useNetWorth = (transactions: Transaction[], goals: SavingsGoal[], reminders: Reminder[]) => {
  return useMemo(() => {
    // 1. Calculate Liquid Cash (Historical Income - Historical Expense)
    // We only count transactions that are NOT in goals (if we had goal transactions)
    // For now, let's assume transactions are all liquid cash movements.
    let totalIncome = 0;
    let totalPaidExpense = 0;
    let unpaidHistoricalExpense = 0;
    let futureLiabilities = 0;

    const nowStr = new Date().toISOString().slice(0, 10);

    transactions.forEach(t => {
      if (t.type === 'income') {
        // We assume income is realized once added, or we could also check isPaid if needed
        totalIncome += t.amount;
      } else {
        // Expense
        if (t.date <= nowStr) {
          if (t.isPaid) {
            totalPaidExpense += t.amount;
          } else {
            unpaidHistoricalExpense += t.amount;
          }
        } else {
          // Future expenses (always counts as liability if not paid)
          if (!t.isPaid) {
            futureLiabilities += t.amount;
          }
        }
      }
    });

    // 2. Sum of all money in goals (also an asset)
    const totalGoalsAmount = goals.reduce((acc, g) => acc + g.currentAmount, 0);

    // 3. Unpaid reminders (near term liabilities not yet recorded as transactions)
    const unpaidReminders = reminders
      .filter(r => !r.isPaid)
      .reduce((acc, r) => acc + r.amount, 0);

    // Liquid Cash: What you actually have right now (Total Income - Total Paid Out)
    const liquidCash = totalIncome - totalPaidExpense;
    
    // Free Balance (Requested): Money left after PAYING all current debts
    const freeBalance = totalIncome - (totalPaidExpense + unpaidHistoricalExpense);

    // Total Assets: Liquid Cash + Goal Savings
    const totalAssets = liquidCash + totalGoalsAmount;
    
    // Total Liabilities: Unpaid history + Future installments + Unpaid reminders
    const totalLiabilities = unpaidHistoricalExpense + futureLiabilities + unpaidReminders;
    
    // Net Worth: Total Assets - Total Liabilities
    const netWorth = totalAssets - totalLiabilities;

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

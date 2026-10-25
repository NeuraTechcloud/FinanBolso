import { useMemo } from 'react';
import { Transaction } from '../types/finance';

export const useMonthTransactions = (transactions: Transaction[], selectedMonth: string) => {
  return useMemo(() => {
    if (selectedMonth === 'all') return transactions;

    // Use a Map to ensure each transaction ID (or recurring group) is only added once per month.
    const resultsMap = new Map<string, Transaction>();

    // 1. Process all existing transactions that already match the month
    transactions.forEach(t => {
      if (t.date.startsWith(selectedMonth)) {
        resultsMap.set(t.id, t);
      }
    });

    // 2. Project recurring transactions that started before this month and haven't been added yet
    transactions.forEach(t => {
      if (t.isRecurring && t.date < `${selectedMonth}-01`) {
        // Only project if this specific recurring group/transaction hasn't been added yet for this month
        // We check by:
        // 1. Same ID (already handled by Map but just in case)
        // 2. Same recurring group ID
        // 3. Same description AND amount AND category (to catch "Indefinite" manual duplicates)
        const alreadyExists = Array.from(resultsMap.values()).some(existing => {
          const sameGroup = t.recurringGroupId && existing.recurringGroupId === t.recurringGroupId;
          const sameIdentity = existing.description === t.description && existing.amount === t.amount && existing.category === t.category;
          return sameGroup || sameIdentity;
        });

        if (!alreadyExists) {
          const groupKey = t.recurringGroupId || t.id;
          const uniqueKey = `projected-${groupKey}-${selectedMonth}`;
          const day = t.date.split('-')[2] || '01';
          const dateStr = `${selectedMonth}-${day.padStart(2, '0')}`;
          
          resultsMap.set(uniqueKey, {
            ...t,
            id: uniqueKey,
            date: dateStr,
            isPaid: false 
          });
        }
      }
    });
    
    return Array.from(resultsMap.values());
  }, [transactions, selectedMonth]);
};

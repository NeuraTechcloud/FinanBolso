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
        // Use group ID if available, otherwise fallback to transaction ID for unique key per month
        const groupKey = t.recurringGroupId || t.id;
        const uniqueKey = `${groupKey}-${selectedMonth}`;

        // Only add if this specific recurring group/transaction hasn't been added yet for this month
        // AND no other transaction from this group has been added
        const alreadyAddedInGroup = Array.from(resultsMap.values()).some(existing => 
          (existing.id === t.id || (t.recurringGroupId && existing.recurringGroupId === t.recurringGroupId)) 
          && existing.date.startsWith(selectedMonth)
        );

        if (!alreadyAddedInGroup) {
          const day = t.date.split('-')[2] || '01';
          const dateStr = `${selectedMonth}-${day.padStart(2, '0')}`;
          
          resultsMap.set(uniqueKey, {
            ...t,
            id: uniqueKey, // Use uniqueKey as ID to avoid collision
            date: dateStr,
            isPaid: false // Indefinite recurring are unpaid in subsequent months
          });
        }
      }
    });
    
    return Array.from(resultsMap.values());
  }, [transactions, selectedMonth]);
};

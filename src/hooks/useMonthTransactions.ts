import { useMemo } from 'react';
import { Transaction } from '../types/finance';

export const useMonthTransactions = (transactions: Transaction[], selectedMonth: string) => {
  return useMemo(() => {
    if (selectedMonth === 'all') return transactions;

    const results: Transaction[] = [];
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const lastDayOfSelectedMonth = new Date(selYear, selMonth, 0).getDate();
    const lastDateOfSelectedMonth = new Date(selYear, selMonth - 1, lastDayOfSelectedMonth);

    transactions.forEach(t => {
      const txDate = new Date(t.date);
      
      // 1. Existing instance in the month
      if (t.date.startsWith(selectedMonth)) {
        results.push(t);
      }
      // 2. Indefinite recurring transaction active before/in this month
      else if (t.isRecurring && txDate <= lastDateOfSelectedMonth) {
        console.log('Recurring found:', t.description, t.date, selectedMonth);
        // Create new instance for selected month
        const day = t.date.split('-')[2] || '01';
        
        // Ensure day is valid for this month
        const validDay = Math.min(parseInt(day, 10), lastDayOfSelectedMonth);
        const dateStr = `${selectedMonth}-${String(validDay).padStart(2, '0')}`;
        
        results.push({
          ...t,
          id: `${t.id}-${selectedMonth}`,
          date: dateStr,
          isPaid: false // Indefinite recurring are unpaid in subsequent months
        });
      }
    });
    return results;
  }, [transactions, selectedMonth]);
};

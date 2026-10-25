import React, { useMemo } from 'react';
import { AlertTriangle, Clock, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Transaction } from '../types/finance';
import { formatBRL, formatDateBR } from '../services/exportService';

interface DueBillsAlertBannerProps {
  transactions: Transaction[];
  selectedMonth: string;
  onTogglePaid?: (id: string) => void;
  onSelectTransaction?: (tx: Transaction) => void;
}

export const DueBillsAlertBanner: React.FC<DueBillsAlertBannerProps> = ({
  transactions,
  selectedMonth,
  onTogglePaid,
  onSelectTransaction,
}) => {
  const { overdueList, upcomingList, totalOverdue, totalUpcoming } = useMemo(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Target 3 days from now
    const targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 3);
    const target3DaysStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

    const effectiveMonthPrefix = selectedMonth && selectedMonth !== 'all'
      ? selectedMonth
      : todayStr.slice(0, 7);

    // Unpaid expenses belonging to current month or past
    const unpaidExpenses = transactions.filter(t => 
      t.type === 'expense' && 
      !t.isPaid && 
      (selectedMonth === 'all' || t.date.startsWith(effectiveMonthPrefix))
    );

    const overdue = unpaidExpenses
      .filter(t => t.date < todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const upcoming = unpaidExpenses
      .filter(t => t.date >= todayStr && t.date <= target3DaysStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    const overdueSum = overdue.reduce((sum, t) => sum + t.amount, 0);
    const upcomingSum = upcoming.reduce((sum, t) => sum + t.amount, 0);

    return {
      overdueList: overdue,
      upcomingList: upcoming,
      totalOverdue: overdueSum,
      totalUpcoming: upcomingSum,
    };
  }, [transactions, selectedMonth]);

  if (overdueList.length === 0 && upcomingList.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 gpu-layer animate-in fade-in">
      {/* 🔴 Overdue Bills Alert Banner */}
      {overdueList.length > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-red-950/90 via-slate-900 to-slate-900 border border-red-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Atenção: Contas Atrasadas</span>
                  <span className="px-2 py-0.2 rounded-full bg-red-500 text-white font-black text-[10px]">
                    {overdueList.length}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Total pendente de pagamento: <strong className="text-red-400">{formatBRL(totalOverdue)}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5 mobile-scroll">
            {overdueList.map((tx) => (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction?.(tx)}
                className="p-2.5 rounded-2xl bg-slate-950/80 border border-red-500/20 hover:border-red-500/40 transition flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{tx.description}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-red-400 mt-0.5 font-medium">
                    <Clock className="w-3 h-3 text-red-400 shrink-0" />
                    <span>Venceu em: {formatDateBR(tx.date)}</span>
                    <span>•</span>
                    <span className="text-slate-400">{tx.category}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <span className="text-xs font-black text-red-400 tabular-nums">
                    {formatBRL(tx.amount)}
                  </span>
                  {onTogglePaid && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePaid(tx.id);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-extrabold text-[10px] transition active:scale-95 shadow flex items-center gap-1 shrink-0"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Dar Baixa</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🟡 Upcoming Bills Alert Banner (Next 3 Days) */}
      {upcomingList.length > 0 && (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Clock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>Próximas Contas a Vencer (3 Dias)</span>
                  <span className="px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                    {upcomingList.length}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Soma dos próximos vencimentos: <strong className="text-amber-400">{formatBRL(totalUpcoming)}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5 mobile-scroll">
            {upcomingList.map((tx) => (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction?.(tx)}
                className="p-2.5 rounded-2xl bg-slate-950/80 border border-amber-500/20 hover:border-amber-500/40 transition flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{tx.description}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-300 mt-0.5 font-medium">
                    <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>Vence em: {formatDateBR(tx.date)}</span>
                    <span>•</span>
                    <span className="text-slate-400">{tx.category}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-2">
                  <span className="text-xs font-black text-amber-400 tabular-nums">
                    {formatBRL(tx.amount)}
                  </span>
                  {onTogglePaid && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePaid(tx.id);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold text-[10px] transition active:scale-95 shadow flex items-center gap-1 shrink-0"
                    >
                      <Circle className="w-3 h-3" />
                      <span>Pagar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

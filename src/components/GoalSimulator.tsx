import React, { useState } from 'react';
import { Calculator, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import { formatBRL } from '../services/exportService';

interface GoalSimulatorProps {
  targetAmount: number;
  currentAmount: number;
}

export const GoalSimulator: React.FC<GoalSimulatorProps> = ({ targetAmount, currentAmount }) => {
  const [monthlyContribution, setMonthlyContribution] = useState<number>(0);
  const remaining = Math.max(0, targetAmount - currentAmount);

  const monthsToReach = monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : 0;
  
  const finishDate = new Date();
  finishDate.setMonth(finishDate.getMonth() + monthsToReach);

  return (
    <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
        <Calculator className="w-4 h-4 text-emerald-400" />
        Simulador de Conquista
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Se eu guardar por mês:</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">R$</span>
            <input
              type="number"
              value={monthlyContribution || ''}
              onChange={(e) => setMonthlyContribution(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
              placeholder="Ex: 500"
            />
          </div>
        </div>

        {monthlyContribution > 0 ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold">
                <TrendingUp className="w-3.5 h-3.5" />
                Resultado da Simulação
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Você alcançará sua meta em <strong className="text-white">{monthsToReach} meses</strong>.
            </p>
            <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
              <Calendar className="w-3 h-3" />
              <span>Data estimada: {finishDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-slate-500 italic">Insira um valor mensal para ver a projeção.</p>
        )}
      </div>
    </div>
  );
};

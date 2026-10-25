import React from 'react';
import { Shield, TrendingUp, TrendingDown, Info, Wallet, Target, CreditCard, Landmark } from 'lucide-react';
import { formatBRL } from '../services/exportService';

interface NetWorthCardProps {
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  liquidCash: number;
  totalGoalsAmount: number;
  futureLiabilities: number;
}

export const NetWorthCard: React.FC<NetWorthCardProps> = ({
  netWorth,
  totalAssets,
  totalLiabilities,
  liquidCash,
  totalGoalsAmount,
  futureLiabilities
}) => {
  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Patrimônio Líquido</h3>
            <p className="text-[10px] text-slate-400 font-medium">Sua saúde financeira real hoje</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-black tabular-nums ${netWorth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatBRL(netWorth)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">
            <TrendingUp className="w-3 h-3" />
            Ativos (Total)
          </div>
          <p className="text-lg font-bold text-white tabular-nums">{formatBRL(totalAssets)}</p>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-slate-400 flex items-center gap-1.5 truncate">
                <Wallet className="w-3 h-3 shrink-0" /> Dinheiro
              </span>
              <span className="text-slate-200 font-semibold shrink-0">{formatBRL(liquidCash)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-slate-400 flex items-center gap-1.5 truncate">
                <Target className="w-3 h-3 shrink-0" /> Metas
              </span>
              <span className="text-slate-200 font-semibold shrink-0">{formatBRL(totalGoalsAmount)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-red-500/80 uppercase tracking-widest">
            <TrendingDown className="w-3 h-3" />
            Passivos (Total)
          </div>
          <p className="text-lg font-bold text-white tabular-nums">{formatBRL(totalLiabilities)}</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-slate-400 flex items-center gap-1.5 truncate">
                <CreditCard className="w-3 h-3 shrink-0" /> Dívidas
              </span>
              <span className="text-slate-200 font-semibold shrink-0">{formatBRL(futureLiabilities)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] gap-2">
              <span className="text-slate-400 flex items-center gap-1.5 truncate">
                <Info className="w-3 h-3 shrink-0" /> Outros
              </span>
              <span className="text-slate-200 font-semibold shrink-0">{formatBRL(totalLiabilities - futureLiabilities)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Distribuição de Patrimônio</span>
          <span className="text-[10px] font-bold text-emerald-400">
            {totalAssets > 0 ? ((netWorth / totalAssets) * 100).toFixed(1) : 0}% Líquido
          </span>
        </div>
        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex">
          <div 
            className="h-full bg-emerald-500 transition-all duration-1000" 
            style={{ width: `${totalAssets > 0 ? (Math.max(0, netWorth) / totalAssets) * 100 : 0}%` }}
          />
          <div 
            className="h-full bg-red-500 transition-all duration-1000" 
            style={{ width: `${totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};

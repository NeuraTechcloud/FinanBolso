import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Wallet, 
  ShieldCheck, 
  Smartphone, 
  Monitor, 
  Calendar,
  Sparkles,
  Crown
} from 'lucide-react';
import { motion } from 'motion/react';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  selectedMonth: string; // YYYY-MM or 'all'
  onSelectMonth: (month: string) => void;
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
  isPro?: boolean;
  expiresAt?: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const Header: React.FC<HeaderProps> = ({
  selectedMonth,
  onSelectMonth,
  isPhoneFrame,
  onTogglePhoneFrame,
  isPro = false,
  expiresAt = 0,
}) => {
  const remainingDays = isPro && expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const isWarningNearExpiry = isPro && remainingDays <= 5;

  // Navigation helper for months
  const navigateMonth = (direction: -1 | 1) => {
    if (selectedMonth === 'all') {
      const now = new Date();
      onSelectMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      return;
    }
    const [yStr, mStr] = selectedMonth.split('-');
    let year = parseInt(yStr, 10);
    let month = parseInt(mStr, 10) + direction;

    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }

    onSelectMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const formattedMonthLabel = () => {
    if (selectedMonth === 'all') return 'Todo o Histórico';
    const [yStr, mStr] = selectedMonth.split('-');
    const mIdx = parseInt(mStr, 10) - 1;
    return `${MONTH_NAMES[mIdx]} ${yStr}`;
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 px-4 pt-3 pb-3 gpu-layer">
      <div className="flex items-center justify-between gap-2">
        {/* Brand Logo with Glowing Aura & Interactive Shimmer */}
        <motion.div 
          className="flex items-center gap-2.5 cursor-pointer select-none group"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            (window as any)._logoTapCount = ((window as any)._logoTapCount || 0) + 1;
            if ((window as any)._logoTapCount >= 5) {
              (window as any)._logoTapCount = 0;
              (window as any)._openManagerModal?.();
            }
            setTimeout(() => {
              (window as any)._logoTapCount = 0;
            }, 3000);
          }}
        >
          {/* Animated Emblem */}
          <div className="relative">
            {/* Ambient pulsing glow behind icon */}
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 opacity-60 blur-md group-hover:opacity-90 transition duration-500 animate-pulse" />
            
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-300 p-[1.5px] shadow-lg logo-glow-anim overflow-hidden">
              {/* Shimmer sweep beam */}
              <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/35 to-transparent shimmer-sweep pointer-events-none" />

              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent" />
                <Wallet className="w-5 h-5 text-emerald-400 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
                <Sparkles className="w-2.5 h-2.5 text-amber-300 absolute top-1 right-1 animate-ping" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-extrabold text-white text-base leading-tight tracking-tight flex items-center">
                <span>Finan</span>
                <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Bolso</span>
              </h1>

              {/* Active Pro Countdown Badge next to App Name */}
              {isPro ? (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    (window as any)._openSubscriptionModal?.();
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold transition cursor-pointer border ${
                    isWarningNearExpiry
                      ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 animate-bounce shadow-lg shadow-amber-500/20'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                  title={isWarningNearExpiry ? 'Atenção: Assinatura vence em poucos dias! Clique para renovar' : `Plano Pro Ativo por mais ${remainingDays} dias`}
                >
                  <Crown className={`w-3 h-3 ${isWarningNearExpiry ? 'text-amber-400 animate-pulse' : 'text-amber-300'}`} />
                  <span>{isWarningNearExpiry ? `⚠️ ${remainingDays}d (Renove!)` : `${remainingDays}d Pro`}</span>
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" /> Offline
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-none flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Controle Pessoal</span>
            </p>
          </div>
        </motion.div>

        {/* Right Actions: Frame toggle, Pro Club & PWA Install */}
        <div className="flex items-center gap-1.5">
          {/* Clube Pro Badge / Button */}
          <button
            onClick={() => (window as any)._openSubscriptionModal?.()}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
              isPro 
                ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/40' 
                : 'text-amber-300 bg-amber-500/15 border border-amber-500/30 hover:bg-amber-500/25'
            }`}
            title="Clube FinanBolso Pro"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">{isPro ? 'Pro Ativo' : 'Pro'}</span>
          </button>

          {/* Desktop Preview Frame Switcher (hidden on small touch screens) */}
          <button
            onClick={onTogglePhoneFrame}
            className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
            title={isPhoneFrame ? 'Alternar para layout fluido' : 'Alternar para moldura de smartphone'}
          >
            {isPhoneFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px]">Tela Cheia</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px]">Modo Celular</span>
              </>
            )}
          </button>

          <PWAInstallButton variant="button" />
        </div>
      </div>

      {/* Month Navigator Bar */}
      <div className="mt-3 flex items-center justify-between bg-slate-900/90 border border-slate-800/80 rounded-xl px-2 py-1.5">
        <button
          onClick={() => navigateMonth(-1)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition active:scale-95"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200">
            {formattedMonthLabel()}
          </span>
          {selectedMonth !== 'all' ? (
            <button
              onClick={() => onSelectMonth('all')}
              className="text-[10px] text-slate-400 hover:text-emerald-400 underline transition"
            >
              (Ver tudo)
            </button>
          ) : (
            <button
              onClick={() => {
                const now = new Date();
                onSelectMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="text-[10px] text-emerald-400 hover:underline transition"
            >
              (Mês atual)
            </button>
          )}
        </div>

        <button
          onClick={() => navigateMonth(1)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition active:scale-95"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

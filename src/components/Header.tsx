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
  Crown,
  LogOut
} from 'lucide-react';
import { motion } from 'motion/react';
import { PWAInstallButton } from './PWAInstallButton';
import { HapticService } from '../services/haptics';
import { User } from 'firebase/auth';

interface HeaderProps {
  selectedMonth: string; // YYYY-MM or 'all'
  onSelectMonth: (month: string) => void;
  isPhoneFrame: boolean;
  onTogglePhoneFrame: () => void;
  isPro?: boolean;
  expiresAt?: number;
  activationId?: string;
  user?: User | null;
  onSignIn?: () => void;
  onLogout?: () => void;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const Header: React.FC<HeaderProps> = React.memo(({
  selectedMonth,
  onSelectMonth,
  isPhoneFrame,
  onTogglePhoneFrame,
  isPro = false,
  expiresAt = 0,
  activationId,
  user,
  onSignIn,
  onLogout,
}) => {
  const remainingDays = isPro && expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const isWarningNearExpiry = isPro && remainingDays <= 5;

  // Navigation helper for months
  const navigateMonth = (direction: -1 | 1) => {
    HapticService.lightTap();
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
                  title={
                    isWarningNearExpiry 
                      ? `Atenção: Assinatura vence em ${remainingDays} dias! Clique para renovar${activationId ? ` (ID: ${activationId})` : ''}` 
                      : `Plano Pro Ativo por mais ${remainingDays} dias${activationId ? ` • ID: ${activationId}` : ''}`
                  }
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
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition active:scale-95 ${
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
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
            title={isPhoneFrame ? 'Alternar para layout fluido' : 'Alternar para moldura de smartphone'}
          >
            {isPhoneFrame ? (
              <Monitor className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          <PWAInstallButton variant="button" />

          {/* Firebase Auth Button */}
          {user ? (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 p-0.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition group/user relative"
              title={`Logado como ${user.displayName || user.email}`}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-7 h-7 rounded-[10px] object-cover border border-slate-700" />
              ) : (
                <div className="w-7 h-7 rounded-[10px] bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                  {user.displayName?.charAt(0) || user.email?.charAt(0)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-slate-950 rounded-full flex items-center justify-center border border-slate-800">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              </div>
            </button>
          ) : (
            <button
              onClick={() => (window as any)._openEmailAuthModal?.()}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition active:scale-95 shadow-lg shadow-emerald-500/20"
              title="Acessar Área de Login"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Acessar</span>
            </button>
          )}
        </div>
      </div>

      {/* Month Navigator Bar with Thumb-Friendly Hitboxes */}
      <div className="mt-3 flex items-center justify-between bg-slate-900/90 border border-slate-800/80 rounded-2xl px-2 py-1 select-none">
        <button
          onClick={() => navigateMonth(-1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition touch-pressable"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-100">
            {formattedMonthLabel()}
          </span>
          {selectedMonth !== 'all' ? (
            <button
              onClick={() => {
                HapticService.lightTap();
                onSelectMonth('all');
              }}
              className="text-[11px] text-slate-400 hover:text-emerald-400 underline transition py-1 px-1 touch-pressable"
            >
              (Ver tudo)
            </button>
          ) : (
            <button
              onClick={() => {
                HapticService.lightTap();
                const now = new Date();
                onSelectMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
              }}
              className="text-[11px] text-emerald-400 hover:underline transition py-1 px-1 touch-pressable"
            >
              (Mês atual)
            </button>
          )}
        </div>

        <button
          onClick={() => navigateMonth(1)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition touch-pressable"
          aria-label="Próximo mês"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

import React, { memo } from 'react';
import { 
  LayoutDashboard, 
  PieChart, 
  ReceiptText, 
  Target, 
  FileSpreadsheet, 
  Plus,
  LucideIcon
} from 'lucide-react';

import { motion } from 'motion/react';
import { HapticService } from '../services/haptics';

export type TabType = 'home' | 'charts' | 'transactions' | 'goals' | 'export';

interface BottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
}

interface TabButtonProps {
  id: TabType;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onSelect: (tab: TabType) => void;
}

const MemoizedTabButton = memo<TabButtonProps>(({ id, label, icon: Icon, isActive, onSelect }) => {
  return (
    <motion.button
      onClick={() => {
        HapticService.lightTap();
        onSelect(id);
      }}
      whileTap={{ scale: 0.88 }}
      className={`relative flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-colors duration-150 touch-pressable ${
        isActive 
          ? 'text-emerald-400 font-bold' 
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {isActive && (
        <motion.span 
          layoutId="activeTabIndicator"
          className="absolute -top-1 w-8 h-[3px] bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full shadow-md shadow-emerald-400/60"
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        />
      )}
      <Icon className={`w-5 h-5 mb-0.5 transition-transform duration-150 ${isActive ? 'scale-110 text-emerald-400' : 'scale-100'}`} />
      <span className="text-[10px] tracking-tight leading-none">{label}</span>
    </motion.button>
  );
});

MemoizedTabButton.displayName = 'MemoizedTabButton';

export const BottomNav: React.FC<BottomNavProps> = memo(({
  currentTab,
  onSelectTab,
  onOpenAddModal,
}) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Início', icon: LayoutDashboard },
    { id: 'charts' as TabType, label: 'Gráficos', icon: PieChart },
    { id: 'transactions' as TabType, label: 'Extrato', icon: ReceiptText },
    { id: 'goals' as TabType, label: 'Metas', icon: Target },
    { id: 'export' as TabType, label: 'Exportar', icon: FileSpreadsheet },
  ];

  return (
    <>
      {/* Floating Action Button with Tactile Press Feedback */}
      <div className="fixed bottom-20 right-4 md:right-8 z-30 pointer-events-auto gpu-layer">
        <motion.button
          onClick={() => {
            HapticService.mediumTap();
            onOpenAddModal();
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-slate-950 font-bold rounded-full shadow-xl shadow-emerald-500/35 border border-emerald-300/40 select-none group touch-pressable"
          aria-label="Adicionar novo lançamento"
        >
          <Plus className="w-5 h-5 stroke-[2.8] group-hover:rotate-90 transition-transform duration-200" />
          <span className="text-xs tracking-wide">Novo Lançamento</span>
        </motion.button>
      </div>

      {/* Bottom Navigation Tab Bar with Safe Area and Zero Delay */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1 transition-all gpu-layer select-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.35rem)' }}
      >
        <div className="max-w-md md:max-w-xl mx-auto flex items-center justify-around">
          {tabs.map((tab) => (
            <MemoizedTabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              isActive={currentTab === tab.id}
              onSelect={onSelectTab}
            />
          ))}
        </div>
      </nav>
    </>
  );
});

BottomNav.displayName = 'BottomNav';

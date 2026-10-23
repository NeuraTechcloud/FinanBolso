import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, HardDrive } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-900/95 border border-amber-500/40 px-3.5 py-1.5 text-xs font-medium text-amber-300 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span>Modo Offline</span>
      <span className="text-slate-400">•</span>
      <span className="flex items-center gap-1 text-slate-300">
        <HardDrive className="w-3 h-3 text-emerald-400" />
        Dados salvos no aparelho
      </span>
    </div>
  );
};

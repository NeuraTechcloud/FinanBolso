import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Sparkles, DollarSign, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatBRL } from '../services/exportService';

export type EffectType = 'income' | 'expense' | null;

interface TransactionEffectOverlayProps {
  effectType: EffectType;
  amount: number;
  description: string;
  onClear: () => void;
}

// Audio synthesizer using Web Audio API (works offline, no external audio files needed!)
const playEffectSound = (type: 'income' | 'expense') => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'income') {
      // Upward arpeggio chime (C5 -> E5 -> G5 -> C6)
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.4);
      });
    } else {
      // Soft downward tone (G4 -> E4)
      const freqs = [392.00, 329.63];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.35);
      });
    }
  } catch (e) {
    // Ignore if audio context is blocked by browser autoplay policy
  }
};

export const TransactionEffectOverlay: React.FC<TransactionEffectOverlayProps> = ({
  effectType,
  amount,
  description,
  onClear,
}) => {
  useEffect(() => {
    if (!effectType) return;

    // Trigger audio & haptic feedback
    playEffectSound(effectType);
    if ('vibrate' in navigator) {
      if (effectType === 'income') {
        navigator.vibrate([40, 60, 100]);
      } else {
        navigator.vibrate([50, 30, 50]);
      }
    }

    const timer = setTimeout(() => {
      onClear();
    }, 2800);

    return () => clearTimeout(timer);
  }, [effectType, onClear]);

  if (!effectType) return null;

  const isIncome = effectType === 'income';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4 overflow-hidden">
        {/* Background Radial Glow Flash */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className={`absolute inset-0 blur-3xl pointer-events-none ${
            isIncome ? 'bg-emerald-500/25' : 'bg-red-500/20'
          }`}
        />

        {/* Floating Sparkles Particles for Income */}
        {isIncome && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 1, 
                  x: 0, 
                  y: 0, 
                  scale: Math.random() * 0.8 + 0.5 
                }}
                animate={{ 
                  opacity: 0, 
                  x: (Math.random() - 0.5) * 260, 
                  y: -180 - Math.random() * 120,
                  rotate: Math.random() * 360
                }}
                transition={{ duration: 1.6 + Math.random() * 0.6, ease: "easeOut" }}
                className="absolute top-1/2 left-1/2 text-amber-300"
              >
                <Sparkles className="w-5 h-5 fill-amber-300/40" />
              </motion.div>
            ))}
          </div>
        )}

        {/* Main Center Floating Card Effect */}
        <motion.div
          initial={{ scale: 0.5, y: isIncome ? 40 : -40, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: isIncome ? -30 : 30, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className={`relative p-6 rounded-3xl border shadow-2xl backdrop-blur-xl max-w-xs w-full text-center space-y-2 pointer-events-auto ${
            isIncome
              ? 'bg-gradient-to-b from-slate-900/95 via-emerald-950/90 to-slate-950/95 border-emerald-500/50 shadow-emerald-500/30 text-emerald-300'
              : 'bg-gradient-to-b from-slate-900/95 via-red-950/90 to-slate-950/95 border-red-500/50 shadow-red-500/30 text-red-300'
          }`}
        >
          {/* Animated Badge Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-lg ${
              isIncome
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/40'
                : 'bg-red-500 text-white shadow-red-500/40'
            }`}
          >
            {isIncome ? (
              <TrendingUp className="w-8 h-8 stroke-[2.5]" />
            ) : (
              <TrendingDown className="w-8 h-8 stroke-[2.5]" />
            )}
          </motion.div>

          {/* Title */}
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-extrabold uppercase tracking-widest text-slate-300"
          >
            {isIncome ? '🎉 Receita Confirmada!' : '💸 Despesa Registrada!'}
          </motion.p>

          {/* Amount Display */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`text-2xl font-black tracking-tight ${
              isIncome ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {isIncome ? '+ ' : '- '}{formatBRL(amount)}
          </motion.div>

          {/* Description */}
          {description && (
            <p className="text-xs font-medium text-slate-400 truncate max-w-[220px] mx-auto">
              {description}
            </p>
          )}

          {/* Dismiss button */}
          <button
            onClick={onClear}
            className={`mt-2 text-[10px] font-bold px-3 py-1 rounded-full border transition active:scale-95 ${
              isIncome
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30'
            }`}
          >
            OK
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

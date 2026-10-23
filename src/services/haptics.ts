// Ultra-lightweight Mobile Haptics & Vibration Engine
export const HapticService = {
  // Ultra-short tap (10ms) for micro-interactions, tabs, buttons
  lightTap(): void {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(12);
      }
    } catch {}
  },

  // Noticeable medium tap (25ms) for actions, FAB, toggles
  mediumTap(): void {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }
    } catch {}
  },

  // Double pulse for successful operations (saving, activating Pro, copy ID)
  success(): void {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([15, 40, 25]);
      }
    } catch {}
  },

  // Alert pulse for deletions or validation errors
  warning(): void {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([35, 50, 35]);
      }
    } catch {}
  }
};

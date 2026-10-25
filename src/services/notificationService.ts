import { Reminder } from '../types/finance';

export const NotificationService = {
  requestPermission: async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  checkAndNotify: (reminders: Reminder[]) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const today = new Date().toISOString().slice(0, 10);
    const dueToday = reminders.filter(r => r.dueDate === today && !r.isPaid);

    dueToday.forEach(reminder => {
      new Notification('BolsoZen - Lembrete de Conta', {
        body: `A conta "${reminder.title}" (R$ ${reminder.amount.toFixed(2)}) vence hoje!`,
        icon: '/favicon.ico'
      });
    });
  }
};

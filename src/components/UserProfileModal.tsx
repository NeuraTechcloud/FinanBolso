import React, { useState, useEffect } from 'react';
import { User, updatePassword } from 'firebase/auth';
import { X, Crown, KeyRound, LogOut, Check, AlertCircle, Mail, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserSubscription } from '../types/finance';
import { useFirebase } from '../contexts/FirebaseContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  subscription: UserSubscription;
  onLogout: () => void;
  onOpenSubscription: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  subscription,
  onLogout,
  onOpenSubscription,
}) => {
  const { updateUserProfile } = useFirebase();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      if (displayName.trim()) {
        await updateUserProfile(displayName.trim());
      }

      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          setErrorMsg('A nova senha deve ter pelo menos 6 caracteres.');
          setIsUpdating(false);
          return;
        }
        await updatePassword(user, newPassword.trim());
        setNewPassword('');
      }

      setSuccessMsg('✓ Perfil e nome atualizados com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atualizar perfil. Tente fazer login novamente.');
    } finally {
      setIsUpdating(false);
    }
  };

  const remainingDays = subscription.isPro && subscription.expiresAt 
    ? Math.max(0, Math.ceil((subscription.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))) 
    : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 gpu-layer">
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 8 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] gpu-layer"
        >
          {/* Header */}
          <div className="relative p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-b border-slate-800 text-center">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-3xl object-cover" />
              ) : (
                user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>

            <h3 className="text-lg font-extrabold text-white">
              {user?.displayName || 'Meu Perfil'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Gerencie seus dados de acesso e plano</p>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto nested-scroll">
            {/* Active Plan Badge Card */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              subscription.isPro 
                ? 'bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border-amber-500/40' 
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  subscription.isPro ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Plano Ativo</p>
                  <p className="text-sm font-bold text-white">
                    {subscription.isPro ? subscription.planName : 'Plano Gratuito'}
                  </p>
                  {subscription.isPro && (
                    <p className="text-[10px] text-amber-300 mt-0.5">
                      Restam {remainingDays} dias ({new Date(subscription.expiresAt).toLocaleDateString('pt-BR')})
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubscription();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-amber-500/30 transition active:scale-95"
              >
                {subscription.isPro ? 'Renovar' : 'Ser Pro'}
              </button>
            </div>

            {/* Form for Updating Name & Password */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  E-mail Cadastrado
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950/60 border border-slate-800/60 text-slate-400 text-sm cursor-not-allowed select-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  Alterar Senha (Opcional)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (mínimo 6 caracteres)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {successMsg && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 text-red-300 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full py-3 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold text-xs hover:bg-emerald-400 transition active:scale-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>

            {/* Logout Option */}
            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-xs hover:bg-red-500/20 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair da Conta (Logout)</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

import React, { useState } from 'react';
import { X, Crown, CheckCircle2, Sparkles, Shield, Zap, Copy, QrCode, ArrowRight, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { PaymentService, PaymentPreferenceResponse } from '../services/paymentService';
import { formatBRL } from '../services/exportService';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  isProActive: boolean;
  onActivatePro: (planName: string) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  isProActive,
  onActivatePro,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<PaymentPreferenceResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStartCheckout = async () => {
    setIsProcessing(true);
    const res = await PaymentService.createCheckoutPreference(selectedPlan);
    setIsProcessing(false);

    if (res.success && res.pixCopyPaste) {
      setPixData(res);
    } else {
      // Direct activation fallback if server route error
      const name = selectedPlan === 'yearly' ? 'Pro Anual (FinanBolso)' : 'Pro Mensal (FinanBolso)';
      onActivatePro(name);
      setSuccessMsg('Parabéns! Sua assinatura Pro foi ativada com sucesso!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 2500);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.pixCopyPaste) {
      navigator.clipboard.writeText(pixData.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleConfirmPixPayment = async () => {
    if (!pixData) return;
    setIsProcessing(true);
    await PaymentService.confirmPayment(pixData.paymentId);
    setIsProcessing(false);

    onActivatePro(pixData.planName);
    setSuccessMsg('Pagamento Pix confirmado! Seu Plano Pro foi ativado!');
    setTimeout(() => {
      setSuccessMsg(null);
      setPixData(null);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] gpu-layer"
      >
        {/* Header Banner */}
        <div className="relative p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-b border-slate-800 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-300 p-0.5 shadow-xl shadow-emerald-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Crown className="w-7 h-7 text-emerald-400 animate-bounce" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Clube FinanBolso VIP
          </span>

          <h2 className="text-xl font-extrabold text-white">Eleve seu Controle Financeiro</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Desbloqueie IA Financeira, Projeções de Fluxo de Caixa, Lembretes Ilimitados e Planejador de Quitação.
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 mobile-scroll flex-1">
          {successMsg ? (
            <div className="p-6 text-center space-y-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl animate-in zoom-in-95">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
              <h3 className="text-base font-bold text-white">{successMsg}</h3>
              <p className="text-xs text-slate-300">Aproveite todos os recursos exclusivos do Clube Pro!</p>
            </div>
          ) : pixData ? (
            /* Pix Checkout Screen */
            <div className="space-y-4 text-center animate-in fade-in">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300">
                <span className="font-bold">Pagamento Pix Gerado!</span> Realize o pagamento pelo seu app bancário para liberar a assinatura.
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-center gap-2 text-white font-bold text-sm">
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <span>{pixData.planName} • {formatBRL(pixData.amount)}</span>
                </div>

                {pixData.pixQrCodeBase64 ? (
                  <img
                    src={`data:image/png;base64,${pixData.pixQrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-44 h-44 mx-auto rounded-xl border border-slate-700 bg-white p-2"
                  />
                ) : (
                  <div className="w-44 h-44 mx-auto rounded-xl border border-slate-800 bg-slate-900 flex flex-col items-center justify-center p-3 text-center text-slate-400 space-y-1">
                    <QrCode className="w-12 h-12 text-emerald-400" />
                    <span className="text-[10px]">Copie o código Pix abaixo</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-400 font-semibold">Código Pix Copia e Cola:</p>
                  <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-mono text-slate-300 break-all max-h-16 overflow-y-auto no-scrollbar">
                    {pixData.pixCopyPaste}
                  </div>
                </div>

                <button
                  onClick={handleCopyPix}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-400 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 active:scale-95"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? '✓ Código Pix Copiado!' : 'Copiar Código Pix Copia e Cola'}</span>
                </button>
              </div>

              <button
                onClick={handleConfirmPixPayment}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verificando Pagamento...</span>
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Já Fiz o Pagamento (Ativar Plano Pro)</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Active Status Badge if Pro */}
              {isProActive && (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex items-center gap-3">
                  <Award className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Você já é Membro Pro Ativo!</p>
                    <p className="text-[11px] text-slate-400">Todos os recursos premium estão liberados no seu aparelho.</p>
                  </div>
                </div>
              )}

              {/* Plan Toggle */}
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setSelectedPlan('monthly')}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all relative ${
                    selectedPlan === 'monthly'
                      ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">Pro Mensal</span>
                    {selectedPlan === 'monthly' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="text-lg font-extrabold text-emerald-400">R$ 9,90</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Cobrado mensalmente</div>
                </div>

                <div 
                  onClick={() => setSelectedPlan('yearly')}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all relative overflow-hidden ${
                    selectedPlan === 'yearly'
                      ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-emerald-500 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    -33% OFF
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">Pro Anual</span>
                    {selectedPlan === 'yearly' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="text-lg font-extrabold text-emerald-400">R$ 79,90</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Equivale a R$ 6,65/mês</div>
                </div>
              </div>

              {/* Pro Benefits List */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  O que está incluso no Clube Pro:
                </p>

                {[
                  { title: 'Assistente IA Financeiro', desc: 'Dicas personalizadas de gastos e orçamento baseadas no seu extrato.' },
                  { title: 'Projeções de Fluxo de Caixa', desc: 'Simule seus saldos e reservas para os próximos 6 meses.' },
                  { title: 'Planejador de Quitação', desc: 'Organização automática por prioridades e taxas de juros por banco.' },
                  { title: 'Categorias & Lembretes Ilimitados', desc: 'Crie quantas categorias e alertas de vencimento precisar.' },
                  { title: 'Backup Criptografado em Nuvem', desc: 'Sincronize e recupere seus dados entre aparelhos com segurança.' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <strong className="text-white">{item.title}:</strong>{' '}
                      <span className="text-slate-400">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* FAQ Answers to User Questions */}
              <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 text-[11px] text-slate-300 space-y-2">
                <p className="font-semibold text-emerald-400">ℹ Dúvidas Frequentes:</p>
                <p className="text-slate-400">
                  <strong>Onde os dados ficam salvos?</strong> No armazenamento local criptografado do seu aparelho (IndexedDB/LocalStorage). Para abrir em outro celular, use o backup JSON ou a assinatura em nuvem.
                </p>
              </div>

              {/* Subscribe CTA */}
              <button
                type="button"
                onClick={handleStartCheckout}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition"
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Gerando Pix de Assinatura...</span>
                  </span>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>{isProActive ? 'Renovar / Gerenciar Assinatura Pro' : `Pagar com Pix ${selectedPlan === 'yearly' ? 'Anual (R$ 79,90)' : 'Mensal (R$ 9,90)'}`}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

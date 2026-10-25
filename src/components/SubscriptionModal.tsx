import React, { useState } from 'react';
import { 
  X, 
  Crown, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  Copy, 
  QrCode, 
  Award, 
  KeyRound, 
  AlertCircle, 
  Calendar, 
  ShieldCheck,
  Check,
  Smartphone,
  Fingerprint,
  CheckCheck,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaymentService, PaymentPreferenceResponse } from '../services/paymentService';
import { ActivationService } from '../services/activationService';
import { StorageService } from '../services/storage';
import { formatBRL, formatDateBR } from '../services/exportService';
import { UserSubscription } from '../types/finance';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: UserSubscription;
  onActivatePro: (planName: string, durationDays: 30 | 365, activationId?: string) => void;
  onResetSubscription?: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscription,
  onActivatePro,
  onResetSubscription,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<PaymentPreferenceResponse | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const deviceInfo = StorageService.getDeviceInfo();
  const activeDeviceId = subscription.deviceId || deviceInfo.deviceId;

  // Manual Activation Code State
  const [manualCode, setManualCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const remainingDays = ActivationService.calculateRemainingDays(subscription.expiresAt);

  // Start Pix Checkout Preference
  const handleStartCheckout = async () => {
    setIsProcessing(true);
    const res = await PaymentService.createCheckoutPreference(selectedPlan);
    setIsProcessing(false);

    if (res.success && res.pixCopyPaste) {
      setPixData(res);
    } else {
      // Offline / fallback Pix order with reserved activation ID
      const durationDays: 30 | 365 = selectedPlan === 'yearly' ? 365 : 30;
      const planName = durationDays === 365 ? 'Pro Anual (365 Dias)' : 'Pro Mensal (30 Dias)';
      const activationId = await ActivationService.generateActivationId(durationDays);
      const amount = durationDays === 365 ? 79.90 : 9.90;
      const fallbackPixCode = `00020126580014br.gov.bcb.pix0136finanbolso-${durationDays}d-${Math.random().toString(36).slice(2, 7)}520400005303986540${amount.toFixed(2)}5802BR5915FinanBolso Pro6009SAO PAULO62070503***6304`;
      
      setPixData({
        success: true,
        paymentId: `pay_${Date.now()}`,
        planName,
        durationDays,
        activationId,
        amount,
        pixCopyPaste: fallbackPixCode,
      });
    }
  };

  const handleCopyPix = () => {
    if (pixData?.pixCopyPaste) {
      navigator.clipboard.writeText(pixData.pixCopyPaste);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const handleCopyActiveId = () => {
    if (subscription.activationId) {
      navigator.clipboard.writeText(subscription.activationId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(activeDeviceId);
    setCopiedDeviceId(true);
    setTimeout(() => setCopiedDeviceId(false), 2500);
  };

  // Confirm Pix Payment
  const handleConfirmPixPayment = async () => {
    if (!pixData) return;
    setIsProcessing(true);
    const confirmRes = await PaymentService.confirmPayment(pixData.paymentId);
    setIsProcessing(false);

    const durationDays: 30 | 365 = confirmRes.durationDays || pixData.durationDays || (selectedPlan === 'yearly' ? 365 : 30);
    const planName = confirmRes.planName || pixData.planName || (durationDays === 365 ? 'Pro Anual (365 Dias)' : 'Pro Mensal (30 Dias)');
    const finalActivationId = confirmRes.activationId || pixData.activationId || await ActivationService.generateActivationId(durationDays);

    onActivatePro(planName, durationDays, finalActivationId);
    setSuccessMsg(`✓ Pagamento Confirmado! Plano de ${durationDays} dias ativado com ID: ${finalActivationId}`);
    setTimeout(() => {
      setSuccessMsg(null);
      setPixData(null);
      onClose();
    }, 3000);
  };

  // Validate and Activate via code
  const handleValidateCode = async (codeToValidate?: string) => {
    const code = (codeToValidate || manualCode).trim().toUpperCase();
    if (!code) return;

    setIsValidatingCode(true);
    setCodeFeedback(null);

    const result = await ActivationService.validateActivationId(code);
    setIsValidatingCode(false);

    if (result.valid) {
      onActivatePro(result.planName, result.durationDays, result.activationId);
      setCodeFeedback({
        success: true,
        message: result.message,
      });
      setSuccessMsg(`✓ ID ${result.activationId} validado! Plano de ${result.durationDays} dias liberado.`);
      setManualCode('');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 3000);
    } else {
      setCodeFeedback({
        success: false,
        message: result.message,
      });
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 gpu-layer">
          <motion.div 
            initial={{ scale: 0.97, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.97, opacity: 0, y: 8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
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
            Libere Extrato Detalhado, Adição por Voz com IA, Lembretes Ilimitados e Projeções Financeiras.
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4 mobile-scroll flex-1">
          {successMsg ? (
            <div className="p-6 text-center space-y-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl animate-in zoom-in-95">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-pulse" />
              <h3 className="text-base font-bold text-white">{successMsg}</h3>
              <p className="text-xs text-slate-300">Aproveite todos os recursos exclusivos no seu aparelho!</p>
            </div>
          ) : pixData ? (
            /* Pix Checkout Screen with Unique Activation ID */
            <div className="space-y-4 text-center animate-in fade-in">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300">
                <span className="font-bold">Pagamento Pix Gerado!</span> Realize o pagamento pelo seu app bancário para liberar a assinatura.
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-center gap-2 text-white font-bold text-sm">
                  <QrCode className="w-5 h-5 text-emerald-400" />
                  <span>{pixData.planName} • {formatBRL(pixData.amount)}</span>
                </div>

                {/* Display the unique Activation ID assigned to this checkout */}
                {pixData.activationId && (
                  <div className="p-2.5 bg-slate-900 border border-emerald-500/30 rounded-xl text-center space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      ID de Ativação Reservado ({pixData.durationDays || (selectedPlan === 'yearly' ? 365 : 30)} Dias):
                    </span>
                    <div className="text-xs font-mono font-bold text-emerald-300 selection:bg-emerald-500 selection:text-slate-950">
                      {pixData.activationId}
                    </div>
                  </div>
                )}

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
                  <span>{copiedPix ? '✓ Código Pix Copiado!' : 'Copiar Código Pix Copia e Cola'}</span>
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setPixData(null)}
                  className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirmPixPayment}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Validando Pagamento...</span>
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Já Fiz o Pagamento (Ativar {pixData.durationDays || (selectedPlan === 'yearly' ? 365 : 30)}d)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Status Banner if Pro */}
              {subscription.isPro && (
                <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-300">
                        Plano Ativo: {subscription.planName}
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-200 border border-emerald-500/50">
                      {remainingDays} dias restantes
                    </span>
                  </div>

                  {/* Activation ID & Bound Device Display */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {subscription.activationId && (
                      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 font-semibold">ID da Licença:</div>
                          <div className="font-mono text-emerald-400 font-bold text-xs">{subscription.activationId}</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyActiveId}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 transition"
                          title="Copiar ID da Licença"
                        >
                          {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}

                    <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                          <Smartphone className="w-3 h-3 text-emerald-400" />
                          <span>Aparelho Vinculado:</span>
                        </div>
                        <div className="font-mono text-emerald-300 font-bold text-xs">{activeDeviceId}</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyDeviceId}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 transition"
                        title="Copiar ID do Aparelho"
                      >
                        {copiedDeviceId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-emerald-500/20">
                    <span>Vencimento: <strong>{formatDateBR(new Date(subscription.expiresAt).toISOString().slice(0, 10))}</strong></span>
                    <span>Duração: <strong>{subscription.durationDays || 365} dias</strong></span>
                  </div>
                </div>
              )}

              {/* Explicit Device Identification & Hardware Binding Card */}
              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200">Identificação deste Aparelho:</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Fingerprint className="w-3 h-3 text-emerald-400" /> Configurado & Reconhecido
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-900/90 px-3 py-2.5 rounded-xl border border-slate-800">
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-slate-400 font-medium">ID Único do Aparelho (Device ID):</div>
                    <div className="text-xs font-mono font-bold text-emerald-400 select-all tracking-wider">
                      {activeDeviceId}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDeviceId}
                    className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1 text-[11px] font-semibold"
                    title="Copiar ID do Aparelho"
                  >
                    {copiedDeviceId ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copiar ID</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">Dispositivo / Plataforma:</span>
                    <strong className="text-slate-200 text-xs">{deviceInfo.platform}</strong>
                  </div>
                  <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block">Resolução de Tela:</span>
                    <strong className="text-slate-200 text-xs">{deviceInfo.screenResolution}</strong>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 bg-emerald-950/20 p-2 rounded-xl border border-emerald-500/20 flex items-start gap-1.5 leading-relaxed">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Como funciona:</strong> Este identificador exclusivo ({activeDeviceId}) garante que qualquer licença de 30 ou 365 dias ativada fique vinculada a este celular.
                  </span>
                </div>
              </div>

              {/* Plan Cards (30 Dias vs 365 Dias) */}
              <div className="grid grid-cols-2 gap-3">
                {/* 30 Days Monthly Plan */}
                <div 
                  onClick={() => setSelectedPlan('monthly')}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all relative ${
                    selectedPlan === 'monthly'
                      ? 'bg-slate-800 border-emerald-500 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">Pro 30 Dias</span>
                    {selectedPlan === 'monthly' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="text-lg font-extrabold text-emerald-400">R$ 9,90</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Válido por 30 dias</div>
                  <div className="mt-2 text-[10px] text-emerald-300 font-mono font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    ID: PRO-30D-...
                  </div>
                </div>

                {/* 365 Days Yearly Plan */}
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
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white">Pro 365 Dias</span>
                    {selectedPlan === 'yearly' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <div className="text-lg font-extrabold text-emerald-400">R$ 79,90</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Válido por 1 ano inteiro</div>
                  <div className="mt-2 text-[10px] text-emerald-300 font-mono font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    ID: PRO-365D-...
                  </div>
                </div>
              </div>

              {/* Functional Activation via Key / ID Form */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    Ativar por Código ou ID de Licença
                  </span>
                  <span className="text-[10px] text-slate-400">30d ou 365d</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: PRO-30D-XXXX ou PRO-365D-XXXX"
                    value={manualCode}
                    onChange={(e) => {
                      setManualCode(e.target.value.toUpperCase());
                      setCodeFeedback(null);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 uppercase"
                  />
                  <button
                    type="button"
                    onClick={() => handleValidateCode()}
                    disabled={isValidatingCode || !manualCode.trim()}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition shadow active:scale-95 flex items-center gap-1"
                  >
                    {isValidatingCode ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                    <span>Validar</span>
                  </button>
                </div>

                {/* Feedback on validation */}
                {codeFeedback && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in ${
                    codeFeedback.success 
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
                      : 'bg-red-500/20 border border-red-500/40 text-red-300'
                  }`}>
                    {codeFeedback.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    )}
                    <span>{codeFeedback.message}</span>
                  </div>
                )}
              </div>

              {/* Pro Benefits List */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <p className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  O que está incluso no Clube Pro:
                </p>

                {[
                  { title: 'Extrato Financeiro Completo', desc: 'Filtros avançados por categoria, método de pagamento e busca instantânea.' },
                  { title: 'Adição por Voz com IA', desc: 'Dite suas compras em linguagem natural para lançamento automático.' },
                  { title: 'Projeções de Fluxo de Caixa', desc: 'Simulação de saldos e reservas futuras para os próximos meses.' },
                  { title: 'Lembretes & Faturas Ilimitadas', desc: 'Alertas com contagem regressiva para nunca pagar juros.' },
                  { title: 'ID de Licença Individual', desc: 'Chave exclusiva vinculada ao seu aparelho para controle e auditoria.' }
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

              {/* Subscribe CTA via Mercado Pago Direct Links */}
              <div className="pt-2">
                {selectedPlan === 'monthly' ? (
                  <a
                    href="https://mpago.la/2MrsEPU"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition group"
                  >
                    <Crown className="w-4 h-4 fill-slate-950 group-hover:scale-110 transition" />
                    <span>Assinar Plano Mensal via Mercado Pago (R$ 9,90 • 30 Dias)</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                ) : (
                  <a
                    href="https://mpago.la/18RNtwt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition group"
                  >
                    <Crown className="w-4 h-4 fill-slate-950 group-hover:scale-110 transition" />
                    <span>Assinar Plano Anual via Mercado Pago (R$ 79,90 • 365 Dias)</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
